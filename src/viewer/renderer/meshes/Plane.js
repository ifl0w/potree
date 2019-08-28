import {Mesh} from "./Mesh";

export class Plane extends Mesh {
    constructor(context, width, height) {
        super(context);

        this.vertices = new Float32Array([
            -1 * width / 2, 1 * height / 2, 0,
            -1 * width / 2, -1 * height / 2, 0,
            1 * width / 2, -1 * height / 2, 0,
            1 * width / 2, 1 * height / 2, 0
        ]);

        this.indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.normals = new Float32Array([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ]);

        this.uv_coords = new Float32Array([
            0, 1,
            0, 0,
            1, 0,
            1, 1
        ]);

        this.generateBuffers();
    }
}
