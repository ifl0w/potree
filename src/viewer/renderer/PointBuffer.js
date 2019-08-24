export class PointBuffer {
    constructor(context, size) {
        this.gl = context;
        const gl = context;
        this.size = size;

        // randomly generated N = 40 length array 0 <= A[N] <= 39
        const data = Array.from({length: size * 3}, () => Math.random());
        const bufferData = new Float32Array(data);

        this.ssbo = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, bufferData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }

    fillRandom() {
        const data = Array.from({length: this.size * 3}, () => Math.random());
        const bufferData = new Float32Array(data);

        const gl = this.gl;
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, bufferData, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }

    setPositions(positions) {
        const gl = this.gl;
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, this.ssbo);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, null);
    }
}
