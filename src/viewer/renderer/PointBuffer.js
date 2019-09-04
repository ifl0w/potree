import {SSBO} from "./SSBO";

export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;
        // this._gpuMemoryPoolSize = 128 * 1000 * 1000; // 128M is guaranteed for ssbo in opengl
        this._currentByteOffset = 0;

        // this.gpuMemoryPool = new SSBO(gl, this._gpuMemoryPoolSize, 1, 1);

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
        this.nodesUploaded = {}
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
            || this.positionsSSBO.spaceLeft() - numPoints < 0) {
            return;
        }

        let world = node.sceneNode.matrixWorld;
        let geometry = node.geometryNode.geometry;

        this.addGeometry(new Float32Array(world.elements), geometry, 0);

        this.nodesUploaded[node.geometryNode.id] = {
            'start': this.positionsSSBO.lastIdx(),
            'end': this.positionsSSBO.lastIdx()
        };
    }

    addGeometry(modelMatrix, geometry, numberOfPoints) {

        this.modelMatrixSSBO.appendData(modelMatrix);

        const numArrayElements = geometry.attributes.position.count * 4; //Math.min(numberOfPoints * 4, this.positionsSSBO.spaceLeft() * 4);

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

        this.positionsSSBO.appendData(positions);
        this.colorSSBO.appendData(colors);
    }
}
