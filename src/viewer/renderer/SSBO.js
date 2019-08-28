export class SSBO {
    constructor(gl, maxElementCount, elementSize, bytesPerComponent = 4) {
        this.gl = gl;

        this._maxElementCount = maxElementCount;
        this._elementSize = elementSize;
        this._bytesPerComponent = bytesPerComponent;
        this._emptyData = new Float32Array(this.arrayLength());
        this._currentByteOffset = 0;

        this.ssbo = gl.createBuffer();

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this._emptyData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }

    bind(bindingPoint) {
        this.gl.bindBufferBase(this.gl.SHADER_STORAGE_BUFFER, bindingPoint, this.ssbo);
    }

    clear() {
        // buffer does not really need to be cleared. It is sufficient to reset the _currentByteOffset
        /*const gl = this.gl;

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this._emptyData, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);*/

        // reset internal offset
        this._currentByteOffset = 0;
    }

    setData(data) {
        const gl = this.gl;

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, data, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentByteOffset = data.length * this._bytesPerComponent;
    }

    /**
     * Append data to the buffer.
     *
     * @param data Float32Array
     */
    appendData(data) {
        if (this._currentByteOffset + data.length * this._bytesPerComponent > this.byteSize()) {
            return;
        }

        const gl = this.gl;

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentByteOffset, data, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentByteOffset += data.length * this._bytesPerComponent;
    }

    lastIdx() {
        return this._currentByteOffset / (this._elementSize * this._bytesPerComponent) - 1;
    }

    byteSize() {
        return this._maxElementCount * this._elementSize * this._bytesPerComponent;
    }

    spaceLeft() {
        return this._maxElementCount - this.lastIdx();
    }

    arrayLength() {
        return this._maxElementCount * this._elementSize;
    }
}
