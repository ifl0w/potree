export class Texture {

	constructor(context, width, height, immutable = false) {
		let gl = context;
		this.gl = context;
		this.width = width;
		this.height = height;

		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		if (immutable) {
			gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0,  gl.RGBA, gl.FLOAT, null);
		}
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	}

	bind(unit) {
		const gl = this.gl;

		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	}

	clear() {
		const gl = this.gl;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		const data = new Float32Array(this.width * this.height * 4);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
	}

}
