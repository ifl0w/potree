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
        this.streamPositionsSSBO = new SSBO(gl, streamSize, 3, 4);
        this.streamColorSSBO = new SSBO(gl, streamSize, 4, 4);
        // position pool containing vec4
        this.positionsSSBO = new SSBO(gl, size, 4, 4);
        // color pool containing vec4
        this.colorSSBO = new SSBO(gl, size, 4, 4);

        let poolSize = this.positionsSSBO.byteSize()
            + this.colorSSBO.byteSize()
            + this.streamPositionsSSBO.byteSize()
            + this.streamColorSSBO.byteSize()
            + this.denseIdxSSBO.byteSize();

        poolSize /= 1024 * 1024;
        console.log(`Allocated ${poolSize.toFixed(2)}MB on GPU`);

        /*
            key: nodeId;
            value: MemoryManagerEntry
        */
        this.uploadedNodes = new Map();

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

        if (this.collectGarbage) {
            const sorted = Array.from(this.uploadedNodes.entries()).sort((a,b) => b[1].lastAccess - a[1].lastAccess);

            let garbage = sorted.pop();

            // Stopping garbage collection if 25% of the memory is free to reduce processing time and to hold more data on the gpu
            while (this.memoryManager.utilization > 0.75 && garbage[1].lastAccess < 0) {
                this.memoryManager.free(garbage[1]);
                this.uploadedNodes.delete(garbage[0]);
                garbage = sorted.pop();
            }
        }

        // reduce last accessed count for all chunks
        this.uploadedNodes.forEach(entry => entry.lastAccess--);

        this.collectGarbage = false;
    }

    require(node) {
        const nodeId = node.name;

        if (this.uploadedNodes.has(nodeId)) {
            // node already on gpu -> flag as accessed
            this.uploadedNodes.get(nodeId).lastAccess = 1;
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

            this.addGeometry(geometry);
            this.insertIntoGPUPool(numPoints, mme.address, world);

            this.streamPositionsSSBO.clear();
            this.streamColorSSBO.clear();

            this.uploadedNodes.set(nodeId, mme);
        } else {
            // no memory left in memory pool on gpu
            this.collectGarbage = true;
        }
    }

    addGeometry(geometry) {
        this.streamPositionsSSBO.appendData(geometry.attributes.position.array);
        this.streamColorSSBO.appendData(geometry.attributes.color.array);
    }

    insertIntoGPUPool(numPoints, memoryAddress, modelMatrix) {
        this.insertShader.use();

        this.insertShader.setUniform1i("denseStartIdx", memoryAddress);
        this.insertShader.setUniform1i("lastIdx", numPoints - 1);
        this.insertShader.setUniformMatrix4("modelMatrix", modelMatrix);

        this.positionsSSBO.bind(1);
        this.colorSSBO.bind(2);
        this.streamPositionsSSBO.bind(3);
        this.streamColorSSBO.bind(4);
        this.denseIdxSSBO.bind(5);

        this.gl.dispatchCompute(Math.ceil(this._streamSize / 256), 1, 1);
    }
}
