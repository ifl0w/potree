import {SSBO} from "./SSBO";
import {Shader} from "./Shader";
import {Shaders} from "../../../build/shaders/shaders";

export class PointBuffer {
    constructor(context, size, streamSize = 100000) {
        this.gl = context;
        const gl = context;
        this.size = size;
        this._currentByteOffset = 0;

        this._gpuMemoryPoolSize = size;
        this._streamSize = streamSize;

        this.denseIdxSSBO = new SSBO(gl, this._gpuMemoryPoolSize, 1, 16); // 16 bytes because of packing (can be optimized)
        this.freeDenseIdx = 0;
        this.streamPositionsSSBO = new SSBO(gl, streamSize, 4, 4);
        this.streamColorSSBO = new SSBO(gl, streamSize, 4, 4);

        // hard limit of 5000 nodes
        this.modelMatrixSSBO = new SSBO(gl, 5000, 16, 4);

        // ssbo containing vec4 (xyz = position, w = modelMatrixIndex)
        this.positionsSSBO = new SSBO(gl, size, 4, 4);

        // ssbo containing colors as vec4
        this.colorSSBO = new SSBO(gl, size, 4, 4);

        let poolSize = this.positionsSSBO.byteSize() + this.modelMatrixSSBO.byteSize() + this.colorSSBO.byteSize();
        poolSize /= 1024 * 1024;
        console.log(`allocating on gpu ${poolSize}MB`);

        /*
            {
                "id": {
                    "start": byteidx
                    "end": byteidx
                }
            }
        */
        this.nodesUploaded = {};

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
        // this.modelMatrixSSBO.clear();
        // this.positionsSSBO.clear();
        // this.colorSSBO.clear();
    }

    loadNode(node) {
        const nodeId = node.geometryNode.id;
        const numPoints =  node.getNumPoints();

        if (this.nodesUploaded.hasOwnProperty(nodeId)
            || this.freeDenseIdx + numPoints > this._gpuMemoryPoolSize) {
            return;
        }

        let world = node.sceneNode.matrixWorld;
        let geometry = node.geometryNode.geometry;

        this.addGeometry(new Float32Array(world.elements), geometry, numPoints);
        this.insertIntoGPUPool(numPoints);

        this.streamPositionsSSBO.clear();
        this.streamColorSSBO.clear();

        this.nodesUploaded[node.geometryNode.id] = {
            'start': this.positionsSSBO.lastIdx(),
            'end': this.positionsSSBO.lastIdx()
        };
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

    insertIntoGPUPool(numPoints) {
        this.insertShader.use();

        this.insertShader.setUniform1i("denseStartIdx", this.freeDenseIdx);
        this.insertShader.setUniform1i("lastIdx", this.streamPositionsSSBO.lastIdx());

        this.modelMatrixSSBO.bind(0);
        this.positionsSSBO.bind(1);
        this.colorSSBO.bind(2);
        this.streamPositionsSSBO.bind(3);
        this.streamColorSSBO.bind(4);
        this.denseIdxSSBO.bind(5);

        // this.gl.memoryBarrier(this.gl.SHADER_STORAGE_BARRIER_BIT);
        this.gl.dispatchCompute(Math.ceil(this._streamSize / 256), 1, 1);
        // this.gl.memoryBarrier(this.gl.SHADER_STORAGE_BARRIER_BIT);


        this.freeDenseIdx += numPoints;
        // console.log(numPoints, this.pointsum, this.freeDenseIdx)
    }
}
