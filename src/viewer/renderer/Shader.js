export class Shader {

    constructor(gl, name) {
        this.gl = gl;
        this.name = name;

        this.shaderCodes = new Map();
        this.shaders = [];

        // used as cache for all uniform locations
        // <string, int>
        this.uniformLocations = new Map();

        this.program = null;
    }

    /**
     * Activate this shader program
     */
    use() {
        this.gl.useProgram(this.program);
    }

    /**
     * Add source code to the shader for a given shader type
     *
     * @param type GL shader types
     * @param sourceCode
     */
    addSourceCode(type, sourceCode) {
        this.shaderCodes.set(type, sourceCode);
    };

    compileShader(shader, source) {
        let gl = this.gl;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            let info = gl.getShaderInfoLog(shader);
            let numberedSource = source.split("\n").map((a, i) => `${i + 1}`.padEnd(5) + a).join("\n");
            throw `Could not compile shader ${this.name}: ${info}, \n${numberedSource}`;
        }
    }

    /**
     * Link or update the shader program.
     */
    linkProgram() {
        let gl = this.gl;

        this.program = gl.createProgram();

        for (const [type, code] of this.shaderCodes) {
            const shader = gl.createShader(type);
            this.shaders.push(shader);

            this.compileShader(shader, code);

            gl.attachShader(this.program, shader);
        }

        gl.linkProgram(this.program);

        // Check if program was successfully linked
        let success = gl.getProgramParameter(this.program, gl.LINK_STATUS);
        if (!success) {
            let info = gl.getProgramInfoLog(this.program);
            throw `Could not link program ${this.name}: ${info}`;
        }

        // cleanup unnecessary objects
        for (const shader of this.shaders) {
            gl.detachShader(this.program, shader);
            gl.deleteShader(shader);
        }
        this.shaders = [];

        // destroy uniform cache
        this.uniformLocations.clear();
    }

    /**
     * Returns the requested location from the cache or shader
     * and populates the cache if required
     *
     * @param name
     */
    resolveUniformLocation(name) {
        if (this.uniformLocations.has(name)) {
            return this.uniformLocations.get(name);
        }

        const location = this.gl.getUniformLocation(this.program, name);
        this.uniformLocations.set(name, location);

        return location;
    }

    /**
     * Set uniform mat4
     *
     * @param name
     * @param value three.js matrix
     */
    setUniformMatrix4(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        let tmp = new Float32Array(value.elements);
        gl.uniformMatrix4fv(location, false, tmp);
    }

    setUniform1f(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform1f(location, value);
    }

    setUniformBoolean(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform1i(location, value);
    }

    setUniformTexture(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform1i(location, value);
    }

    setUniform2f(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform2f(location, value[0], value[1]);
    }

    setUniform3f(name, value) {
        const gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform3f(location, value[0], value[1], value[2]);
    }

    setUniform(name, value) {

        if (value.constructor === THREE.Matrix4) {
            this.setUniformMatrix4(name, value);
        } else if (typeof value === "number") {
            this.setUniform1f(name, value);
        } else if (typeof value === "boolean") {
            this.setUniformBoolean(name, value);
        } else if (value instanceof WebGLTexture) {
            this.setUniformTexture(name, value);
        } else if (value instanceof Array) {

            if (value.length === 2) {
                this.setUniform2f(name, value);
            } else if (value.length === 3) {
                this.setUniform3f(name, value);
            }

        } else {
            console.error("unhandled uniform type: ", name, value);
        }

    }

    setUniform1i(name, value) {
        let gl = this.gl;
        const location = this.resolveUniformLocation(name);

        if (location == null) {
            return;
        }

        gl.uniform1i(location, value);
    }

}
