import {SSBO} from "./SSBO";

export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        this._currentByteOffset = 0;

        // hard limit of 5000 nodes
        this.modelMatrixSSBO = new SSBO(gl, 5000, 16, 4);

        // ssbo containing vec4 (xyz = position, w = modelMatrixIndex)
        this.positionsSSBO = new SSBO(gl, size, 4,4);

        // ssbo containing colors as vec4
        this.colorSSBO = new SSBO(gl, size, 4,4);
    }

    clear() {
        this.modelMatrixSSBO.clear();
        this.positionsSSBO.clear();
        this.colorSSBO.clear();
    }

    addGeometry(modelMatrix, geometry, numberOfPoints) {

        this.modelMatrixSSBO.appendData(modelMatrix);

        const numArrayElements = Math.min(numberOfPoints * 4, this.positionsSSBO.spaceLeft() * 4);

        const positions = new Float32Array(numArrayElements);
        const colors = new Float32Array(numArrayElements);

        for (let i = 0; i < numArrayElements; i += 4) {
            const rnd = Math.random();
            const rndPositionIdx = Math.floor(rnd * geometry.attributes.position.count) * 3;
            const rndColorIdx = Math.floor(rnd * geometry.attributes.position.count) * 4;

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
