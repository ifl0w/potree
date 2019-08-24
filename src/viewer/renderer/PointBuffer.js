export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        const byteSize = this.byteSize();
        this.emptyData = new Float32Array(Array.from({length: byteSize }));
        this.emptyDataModelMatrix = new Uint32Array(Array.from({length: byteSize }));

        this._currentOffset = 0;

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
        this._currentOffset = 0;
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
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentOffset, indexData, 0);

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentOffset = this.byteSize() - 1;
    }

    setPositions(positions) {
        const gl = this.gl;
        // fill position
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, this.emptyData, 0);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, 0, positions, 0);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentOffset = positions.length;
    }

    addPositions(positions, modelMatrixIndex) {
        if (this._currentOffset + positions.length * 4 >= this.byteSize()) {
            return;
        }

        const gl = this.gl;

        // fill position
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this._currentOffset, positions, 0);

        // fill model matrix index list
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.modelMatrixMap);
        const data = new Uint32Array(Array.from({length: positions.length / (4 * 3)}, () => modelMatrixIndex));
        gl.bufferSubData(gl.SHADER_STORAGE_BUFFER, this.lastIdx(), data, 0);

        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);

        this._currentOffset += positions.length * 4;
    }

    lastIdx() {
        return this._currentOffset / (4 * 3);
    }

    byteSize() {
        return this.size * 4 * 3;
    }
}
