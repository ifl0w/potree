
export class RenderTarget {

    constructor(context, width, height) {
        let gl = context;
        this.gl = context;
        this.width = width;
        this.height = height;

        this.buffer = gl.createRenderbuffer();
    }
}
