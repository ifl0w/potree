export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        this.emptyData = new Float32Array(this.positionArrayLength());
        this.emptyDataModelMatrix = new Uint32Array(this.positionArrayLength());

        this._currentByteOffset = 0;

        this.ssbo = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this.emptyData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this.modelMatrixMap = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.modelMatrixMap);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this.emptyDataModelMatrix, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this.rgbSSBO = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.rgbSSBO);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this.emptyData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }

    clear() {
        const gl = this.gl;

        // clear position
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this.emptyData, 0);
        // clear model matrix map
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.modelMatrixMap);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this.emptyDataModelMatrix, 0);

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        // reset internal offset
        this._currentByteOffset = 0;
    }

    fillRandom() {
        // fill array with random content
        const data = Array.from({length: this.byteSize()}, () => Math.random());
        const bufferData = new Float32Array(data);

        const gl = this.gl;
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, bufferData, 0);

        // fill model matrix index list
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.modelMatrixMap);
        const indexData = new Uint32Array(this.size);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentByteOffset, indexData, 0);

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentByteOffset = this.byteSize() - 1;
    }

    setPositions(positions) {
        const gl = this.gl;
        // fill position
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this.emptyData, 0);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, positions, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentByteOffset = positions.length;
    }

    addPositions(positions, modelMatrixIndex) {
        const positionBufferLength = (positions.length / 3) * 4;

        if (this._currentByteOffset + positionBufferLength * 4 > this.byteSize()) {
            return;
        }

        const gl = this.gl;

        // align content of buffer to multiples of 16; required by openGL packing layout std140
        const newPos = new Float32Array(positionBufferLength);
        let i = 1;
        for (const pos of positions) {
            if (i % 4 === 0) {
                newPos[i-1] = 0;
                i++;
            }

            newPos[i-1] = pos;
            i++;
        }

        // fill position
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentByteOffset, newPos, 0);

        // fill model matrix index list
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.modelMatrixMap);
        const indexData = new Uint32Array(Array.from({length: positionBufferLength}, () => modelMatrixIndex));
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentByteOffset, indexData, 0);

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentByteOffset += positionBufferLength * 4;
    }

    lastIdx() {
        return this._currentByteOffset / (4 * 4) - 1;
    }

    byteSize() {
        return this.size * 4 * 4;
    }

    spaceLeft() {
        return this.size - this.lastIdx();
    }

    positionArrayLength() {
        return this.size * 4;
    }
}
