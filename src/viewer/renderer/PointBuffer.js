import {SSBO} from "./SSBO";
import {Shader} from "./Shader";
import {Shaders} from "../../../build/shaders/shaders";
import {MemoryManager} from "./MemoryManager";

export class PointBuffer {
    constructor(context, size, streamSize = 100000) {
        this.gl = context;
        const gl = context;
        this.size = size;
        this._currentByteOffset = 0;

        this._gpuMemoryPoolSize = size;
        this._streamSize = streamSize;

        this.memoryManager = new MemoryManager(size);

        this.denseIdxSSBO = new SSBO(gl, this._gpuMemoryPoolSize, 1, 16); // 16 bytes because of packing (can be optimized)
        this.streamPositionsSSBO = new SSBO(gl, streamSize, 4, 4);
        this.streamColorSSBO = new SSBO(gl, streamSize, 4, 4);

        // hard limit of 5000 nodes
        this.modelMatrixSSBO = new SSBO(gl, 5000, 16, 4);

        // ssbo containing vec4 (xyz = position, w = modelMatrixIndex)
        this.positionsSSBO = new SSBO(gl, size, 4, 4);

        // ssbo containing colors as vec4
        this.colorSSBO = new SSBO(gl, size, 4, 4);

        let poolSize = this.positionsSSBO.byteSize()
            + this.colorSSBO.byteSize()
            + this.modelMatrixSSBO.byteSize()
            + this.streamPositionsSSBO.byteSize()
            + this.streamColorSSBO.byteSize()
            + this.denseIdxSSBO.byteSize();

        poolSize /= 1024 * 1024;
        console.log(`allocating on gpu ${poolSize}MB`);

        /*
        key: nodeId;
        value: MemoryManagerEntry
        */
        this.nodesUploaded = new Map();

        this.distributeShader = new Shader(this.gl, "DistributeComputeShader");
        this.distributeShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['distribute.compute.glsl']);
        this.distributeShader.linkProgram();

        this.insertShader = new Shader(this.gl, "InsertComputeShader");
        this.insertShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['insert.compute.glsl']);
        this.insertShader.linkProgram();

        this.initDenseIdxSSBO();
    }

    initDenseIdxSSBO() {
        this.distributeShader.use();

        this.denseIdxSSBO.bind(0);

        this.gl.dispatchCompute(Math.ceil(this._gpuMemoryPoolSize / 256), 1, 1);
    }

    clear() {
        if (this.memoryManager.utilization > 0.95) {
            this.collectGarbage = true;
        }

        for (let [key, entry] of this.nodesUploaded) {
            /*
                Stopping garbage collection if 25% of the memory is free to reduce processing time and to hold more data on the gpu
             */
            if (this.collectGarbage && this.memoryManager.utilization > 0.75 && !entry.accessed) {
                // free memory that was not accessed in the last frame
                this.memoryManager.free(entry);
                this.nodesUploaded.delete(key);
            }

            // flag elements as not accessed
            entry.accessed = false;
        }

        this.collectGarbage = false;
    }

    require(node) {
        const nodeId = node.name;

        if (this.nodesUploaded.has(nodeId)) {
            // node already on gpu -> flag as accessed
            this.nodesUploaded.get(nodeId).accessed = true;
            return false;
        }

        // node is required
        return true;
    }

    uploadNode(node) {
        const nodeId = node.name;
        const numPoints = node.getNumPoints();

        const mme = this.memoryManager.alloc(numPoints);
        if (mme !== null) {
            let world = node.sceneNode.matrixWorld;
            let geometry = node.geometryNode.geometry;

            this.addGeometry(new Float32Array(world.elements), geometry, numPoints);
            this.insertIntoGPUPool(numPoints, mme.address, world);

            this.streamPositionsSSBO.clear();
            this.streamColorSSBO.clear();

            this.nodesUploaded.set(nodeId, mme);
        } else {
            // no memory left in memory pool on gpu
            this.collectGarbage = true;
        }
    }

    addGeometry(modelMatrix, geometry, numberOfPoints) {

        this.modelMatrixSSBO.appendData(modelMatrix);

        const numArrayElements = Math.min(numberOfPoints * 4, this.streamPositionsSSBO.spaceLeft() * 4);

        const positions = new Float32Array(numArrayElements);
        const colors = new Float32Array(numArrayElements);

        for (let i = 0; i < numArrayElements; i += 4) {
            const rnd = Math.random();
            const rndPositionIdx = (i / 4) * 3;
            const rndColorIdx = i;

            positions[i] = geometry.attributes.position.array[rndPositionIdx];
            positions[i + 1] = geometry.attributes.position.array[rndPositionIdx + 1];
            positions[i + 2] = geometry.attributes.position.array[rndPositionIdx + 2];
            positions[i + 3] = this.modelMatrixSSBO.lastIdx();

            colors[i] = geometry.attributes.color.array[rndColorIdx] / 255;
            colors[i + 1] = geometry.attributes.color.array[rndColorIdx + 1] / 255;
            colors[i + 2] = geometry.attributes.color.array[rndColorIdx + 2] / 255;
            colors[i + 3] = geometry.attributes.color.array[rndColorIdx + 3] / 255;
        }

        this.streamPositionsSSBO.appendData(positions);
        this.streamColorSSBO.appendData(colors);
        this.pointsum = (this.pointsum ? this.pointsum : 0) + geometry.attributes.position.count;
    }

    insertIntoGPUPool(numPoints, memoryAddress, modelMatrix) {
        this.insertShader.use();

        this.insertShader.setUniform1i("denseStartIdx", memoryAddress);
        this.insertShader.setUniform1i("lastIdx", this.streamPositionsSSBO.lastIdx());
        this.insertShader.setUniformMatrix4("modelMatrix", modelMatrix);

        this.modelMatrixSSBO.bind(0);
        this.positionsSSBO.bind(1);
        this.colorSSBO.bind(2);
        this.streamPositionsSSBO.bind(3);
        this.streamColorSSBO.bind(4);
        this.denseIdxSSBO.bind(5);

        // this.gl.memoryBarrier(this.gl.SHADER_STORAGE_BARRIER_BIT);
        this.gl.dispatchCompute(Math.ceil(this._streamSize / 256), 1, 1);
        // this.gl.memoryBarrier(this.gl.SHADER_STORAGE_BARRIER_BIT);
    }
}
