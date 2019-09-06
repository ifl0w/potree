import {PointCloudTree} from "../../PointCloudTree.js";

import {Shader} from "./Shader";
import {Shaders} from "../../../build/shaders/shaders";
import {Texture} from "./Texture";
import {Plane} from "./meshes/Plane";
import {PointBuffer} from "./PointBuffer";

export class ComputePointCloudRenderer {

    constructor(threeRenderer) {
        console.log("Construct Compute Shader Point Cloud Renderer");

        this.threeRenderer = threeRenderer;
        this.gl = this.threeRenderer.context;

        window.addEventListener('resize', (event) => {
            this.initTextures();
            this.initUBOs();
        });

        this.initTextures();
        this.initUBOs();

        this.pointBuffer = new PointBuffer(this.gl, 25 * 1000 * 1000);

        this.pointCloudShader = new Shader(this.gl, "PointCloudComputeShader");
        this.pointCloudShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['render.compute.glsl']);
        this.pointCloudShader.linkProgram();

        this.reprojectShader = new Shader(this.gl, "ReprojectComputeShader");
        this.reprojectShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['reproject.compute.glsl']);
        this.reprojectShader.linkProgram();

        this.resolveShader = new Shader(this.gl, "ResolveComputeShader");
        this.resolveShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['resolve.compute.glsl']);
        this.resolveShader.linkProgram();

        this.clearShader = new Shader(this.gl, "ClearComputeShader");
        this.clearShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['clear.compute.glsl']);
        this.clearShader.linkProgram();

        this.drawQuadShader = new Shader(this.gl, "DrawQuadShader");
        this.drawQuadShader.addSourceCode(this.gl.VERTEX_SHADER, Shaders['quad.vertex.glsl']);
        this.drawQuadShader.addSourceCode(this.gl.FRAGMENT_SHADER, Shaders['quad.fragment.glsl']);
        this.drawQuadShader.linkProgram();

        this.quad = new Plane(this.gl, 2, 2);

        this.lastFrameViewMatrix = new Float32Array(16);
        this.lastFrameProjectionMatrix = new Float32Array(16);

        this.toggle = 0;
        this.startIdx = 0;
    }

    initTextures() {
        this.renderTexture = [
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
        ];
        this.positionTexture = [
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
            new Texture(this.gl, window.innerWidth, window.innerHeight, true),
        ];
        this.pingPongIdx = 0;
    }

    initUBOs() {
        const gl = this.gl;

        if (!this.resolutionUBO) {
            this.resolutionUBO = gl.createBuffer();
        }

        gl.bindBuffer(gl.UNIFORM_BUFFER, this.resolutionUBO);
        let resolution = new Float32Array([window.innerWidth, window.innerHeight]);
        gl.bufferData(gl.UNIFORM_BUFFER, resolution, gl.STATIC_READ);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }

    traverse(scene) {

        let octrees = [];

        let stack = [scene];
        while (stack.length > 0) {

            let node = stack.pop();

            if (node instanceof PointCloudTree) {
                octrees.push(node);
                continue;
            }

            let visibleChildren = node.children.filter(c => c.visible);
            stack.push(...visibleChildren);

        }

        let result = {
            octrees: octrees
        };

        return result;
    }

    renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params) {
        if (exports.measureTimings) performance.mark("renderNodes-start");

        const maxNodes = 10;

        let numTotalPoints = nodes.map(n => n.getNumPoints()).reduce((a, b) => a + b, 0);
        let numPointsPerNode = Math.floor(this.pointBuffer.size / maxNodes);

        let i = 0;
        for (let node of nodes) {

            if (this.pointBuffer.require(node) && i < maxNodes) {

                // randomly choose nodes to upload
                // let render = Math.random() * nodes.length < maxNodes;
                // if (!render) continue;

                this.pointBuffer.uploadNode(node);

                i++;
            }

        }

        if (exports.measureTimings) {
            performance.mark("renderNodes-end");
            performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
        }
    }

    renderOctree(octree, nodes, camera, target, params = {}) {
        let view = camera.matrixWorldInverse;
        let viewInv = camera.matrixWorld;
        let proj = camera.projectionMatrix;
        let projInv = new THREE.Matrix4().getInverse(proj);

        let visibilityTextureData = null;

        this.pointCloudShader.use();

        this.pointCloudShader.setUniformMatrix4("projectionMatrix", proj);
        this.pointCloudShader.setUniformMatrix4("viewMatrix", view);
        this.pointCloudShader.setUniformMatrix4("uViewInv", viewInv);
        this.pointCloudShader.setUniformMatrix4("uProjInv", projInv);

        this.renderNodes(octree, nodes, visibilityTextureData, camera, target, this.pointCloudShader, params);
    }

    render(scene, camera, target = null, params = {}) {

        const gl = this.gl;

        // PREPARE
        if (target != null) {
            this.threeRenderer.setRenderTarget(target);
        }

        camera.updateProjectionMatrix();

        const traversalResult = this.traverse(scene);

        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.resolutionUBO);

        // RENDER
        this.clearImageBuffer(this.pingPong(true));
        this.clearImageBuffer(2);

        this.reprojectLastFrame(camera);

        this.clearImageBuffer(this.pingPong(false));
        this.swapImageBuffer();

        for (const octree of traversalResult.octrees) {
            let nodes = octree.visibleNodes;
            this.renderOctree(octree, nodes, camera, target, params);
        }

        this.renderPoints(camera);
        this.pointBuffer.clear();

        this.resolveBuffer(camera);

        this.displayResult();
        this.swapImageBuffer();

        // CLEANUP
        // gl.activeTexture(gl.TEXTURE1);
        // gl.bindTexture(gl.TEXTURE_2D, null);

        this.threeRenderer.state.reset();
    }

    reprojectLastFrame(camera) {
        this.reprojectShader.use();

        this.reprojectShader.setUniformMatrix4("viewMatrix", camera.matrixWorldInverse);
        this.reprojectShader.setUniformMatrix4("projectionMatrix", camera.projectionMatrix);
        // this.reprojectShader.setUniformMatrix4("lastFrameViewMatrix", this.lastFrameViewMatrix);
        // this.reprojectShader.setUniformMatrix4("lastFrameProjectionMatrix", this.lastFrameProjectionMatrix);

        this.gl.bindImageTexture(0, this.renderTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(1, this.positionTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(2, this.renderTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(3, this.positionTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(
            Math.ceil(this.renderTexture[this.pingPong(false)].width / 16),
            Math.ceil(this.renderTexture[this.pingPong(false)].height / 16),
            1);
    }

    renderPoints(camera) {
        // render points to texture
        this.pointCloudShader.use();

        const renderAmount =  5 * 1000 * 1000;

        this.pointCloudShader.setUniform1i("lastIdx", this.pointBuffer.size);
        this.pointCloudShader.setUniform1i("startIdx", this.startIdx);
        this.pointCloudShader.setUniform1i("renderAmount", renderAmount);
        this.pointCloudShader.setUniformMatrix4("viewMatrix", camera.matrixWorldInverse);
        this.pointCloudShader.setUniformMatrix4("projectionMatrix", camera.projectionMatrix);

        this.pointBuffer.modelMatrixSSBO.bind(0);
        this.pointBuffer.positionsSSBO.bind(1);
        this.pointBuffer.colorSSBO.bind(2);

        this.gl.bindImageTexture(6, this.renderTexture[2].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(7, this.positionTexture[2].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(Math.ceil(renderAmount / 256), 1, 1);

        this.lastFrameViewMatrix = camera.matrixWorldInverse;
        this.lastFrameProjectionMatrix = camera.projectionMatrix;

        this.startIdx += renderAmount;
        if (this.startIdx >= this.pointBuffer.size) {
            this.startIdx = 0;
        }
    }

    resolveBuffer(camera) {
        this.resolveShader.use();

        this.resolveShader.setUniformMatrix4("viewMatrix", camera.matrixWorldInverse);
        this.resolveShader.setUniformMatrix4("projectionMatrix", camera.projectionMatrix);

        this.gl.bindImageTexture(0, this.renderTexture[2].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(1, this.positionTexture[2].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.gl.bindImageTexture(2, this.renderTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(3, this.positionTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.gl.bindImageTexture(4, this.renderTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(5, this.positionTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(
            Math.ceil(this.renderTexture[this.pingPong(false)].width / 16),
            Math.ceil(this.renderTexture[this.pingPong(false)].height / 16),
            1);
    }

    displayResult() {
        this.gl.disable(this.gl.DEPTH_TEST);
        // this.gl.enable(this.gl.BLEND);

        // Draw full screen quad
        this.drawQuadShader.use();

        // this.gl.bindImageTexture(0, this.renderTexture[1].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        // this.gl.bindImageTexture(1, this.positionTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.renderTexture[this.pingPong(true)].bind(0);
        this.drawQuadShader.setUniformTexture('renderTexture', this.renderTexture[this.pingPong(true)].texture);

        this.gl.bindVertexArray(this.quad.vao);
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        this.gl.bindVertexArray(null);
    }

    clearImageBuffer(idx) {
        /*
            Textures can not efficiently be cleared unless they are bound to a FBO.
            A sufficiently fast way without CPU-GPU overhead and without FBO is to utilize compute shaders for resetting
            the textures.
         */
        this.clearShader.use();

        this.gl.bindImageTexture(0, this.renderTexture[idx].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(1, this.positionTexture[idx].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(
            Math.ceil(this.renderTexture[idx].width / 16),
            Math.ceil(this.renderTexture[idx].height / 16),
            1);
    }

    swapImageBuffer() {
        this.pingPongIdx = this.pingPongIdx === 0 ? 1 : 0; // swap textures
    }

    pingPong(writeTarget) {
        if (writeTarget) {
            return this.pingPongIdx === 0 ? 1 : 0;
        } else {
            return this.pingPongIdx === 1 ? 1 : 0;
        }
    }
}
