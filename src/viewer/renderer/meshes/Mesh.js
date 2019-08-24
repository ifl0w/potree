export class Mesh {
    constructor(context) {
        this.gl = context;
        const gl = this.gl;

        this.vertices = null;
        this.indices = null;
        this.normals = null;
        this.uv_coords = null;

        this.vao = gl.createVertexArray(); // each mesh contains one VAO

        this.positions_vbo = gl.createBuffer(); // each mesh contains one position_vbo
        this.indices_vbo = gl.createBuffer(); // each mesh contains one index_vbo
        this.normals_vbo = gl.createBuffer(); // each mesh contains one normals_vbo
        this.uv_coords_vbo = gl.createBuffer(); // each mesh contains one uv_coords_vbo
    }

    size() {
        return this.indices.length;
    }

    generateBuffers() {
        const gl = this.gl;

        /* Bind vertex array as currently used one */
        gl.bindVertexArray(this.vao);

        /* Bind position_vbo as active buffer */
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positions_vbo);
        /* Copy the vertex data to buffer */
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

        /* Enable attribute index 0 */
        gl.enableVertexAttribArray(0);
        /* Coordinate data is going into attribute index 0 and contains three floats per vertex */
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices_vbo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        if (this.normals.length > 0) {
            /* Bind normals_vbo as active buffer */
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normals_vbo);
            /* Copy the normals data to buffer */
            gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

            /* Enable attribute index 1 */
            gl.enableVertexAttribArray(1);
            /* Normal data is going into attribute index 1 and contains three floats per vertex */
            gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        }

        if (this.uv_coords.length > 0) {
            /* Bind uv_coords_vbo as active buffer */
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uv_coords_vbo);
            /* Copy the uv data to buffer */
            gl.bufferData(gl.ARRAY_BUFFER, this.uv_coords, gl.STATIC_DRAW);

            /* Enable attribute index 2 */
            gl.enableVertexAttribArray(2);
            /* uv data is going into attribute index 2 and contains two floats per vertex */
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
        }


        //Unbind VAO and VBOs
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}
