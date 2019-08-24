export class ModelMatrixBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        // mat4 model matrix + vec2 range in point buffer
        let byteSize = this.byteSize();
        this.emptyData = new Float32Array(Array.from({ length:  byteSize }));

        this._currentOffset = 0;

        this.ssbo = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this.emptyData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }

    clear() {
        const gl = this.gl;
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this.emptyData, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        // reset internal offset
        this._currentOffset = 0;
    }

    setData(data) {
        const gl = this.gl;

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, this.emptyData, gl.DYNAMIC_DRAW);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentOffset = data.length;
    }

    addModelMatrix(modelMatrix) {
        if (this._currentOffset + modelMatrix.length * 4 >= this.byteSize()) {
            return;
        }

        const gl = this.gl;
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentOffset, modelMatrix, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentOffset += modelMatrix.length * 4;

        return this.lastIdx() - 1;
    }

    lastIdx() {
        return this._currentOffset / (4 * 16);
    }

    byteSize() {
        // mat4 model matrix
        return this.size * 4 * 16;
    }
}
