import {SSBO} from "./SSBO";

export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        this._currentByteOffset = 0;

        // ssbo containing vec4 (xyz = position, w = modelMatrixIndex)
        this.positionsSSBO = new SSBO(gl, size, 4,4);
    }

    clear() {
        this.positionsSSBO.clear();
    }

    setPositions(positions) {
        this.positionsSSBO.setData(positions);
    }

    addPositions(positions, modelMatrixIndex) {
        const positionBufferLength = (positions.length / 3) * 4;

        // align content of buffer to multiples of 16; required by openGL packing layout std140
        const newPos = new Float32Array(positionBufferLength);
        let i = 1;
        for (const pos of positions) {
            if (i % 4 === 0) {
                newPos[i-1] = modelMatrixIndex;
                i++;
            }

            newPos[i-1] = pos;
            i++;
        }
        newPos[i-1] = modelMatrixIndex; // last index will not be iterated; therefore added manually

        // fill position and model matrix index
        this.positionsSSBO.appendData(newPos);
    }
}
