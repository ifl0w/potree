import {PointCloudTree} from "../../PointCloudTree.js";

import {Shader} from "./Shader";
import {Shaders} from "../../../build/shaders/shaders";
import {Texture} from "./Texture";
import {DepthTexture} from "./DepthTexture";
import {Plane} from "./meshes/Plane";
import {PointBuffer} from "./PointBuffer";
import {SSBO} from "./SSBO";
import {Profiler} from "./Profiler";

export class ComputePointCloudRenderer {

    constructor(threeRenderer) {
        console.log("Construct Compute Shader Point Cloud Renderer");

        this.threeRenderer = threeRenderer;
        this.gl = this.threeRenderer.context;

        window.addEventListener('resize', (event) => {
            this.initTextures();
            this.initUBOs();
            this.initSSBOs();
        });

        this._pointSize = 2;
        this.pointsPerFrame = 1000000;
        this.maxNodesPerFrame = 0; // 0 = unlimited

        this.initTextures();
        this.initUBOs();
        this.initSSBOs();
        this.initShader();

        this.profiler = new Profiler(this.gl);
        this.profiler.create('cleartextures');
        this.profiler.create('reprojection');
        this.profiler.create('uploadnodes');
        this.profiler.create('rendernew');
        this.profiler.create('cleardepth');
        this.profiler.create('combine');
        this.profiler.create('display');
        this.profilingResults = {};

        this.pointBuffer = new PointBuffer(this.gl, 25 * 1000 * 1000);

        this.quad = new Plane(this.gl, 2, 2);

        this.lastFrameViewMatrix = new Float32Array(16);
        this.lastFrameProjectionMatrix = new Float32Array(16);

        this.toggle = 0;
        this.startIdx = 0;

        this._fps = 0;
        this._fpsSum = 0;
        this._lastTimeStamp = -1;
        this._fpsSamples = 0;
        this._timePassed = 0;
        this._fpsAverage = 0; // average over one second
    }

    initTextures() {
        this.storageTexture = [
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
        gl.bindBufferBase(this.gl.UNIFORM_BUFFER, 0, this.resolutionUBO);
        const data = new ArrayBuffer(3*4);
        const dataViewFloat = new Float32Array(data);
        const dataViewInt = new Int32Array(data);
        dataViewFloat[0] = window.innerWidth;
        dataViewFloat[1] = window.innerHeight;
        dataViewInt[2] = this._pointSize;
        gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_READ);
        gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    }

    initSSBOs() {
        this.resolveDepthSSBO = new SSBO(this.gl, window.innerWidth * window.innerHeight, 1, 4);
    }

    initShader() {
        this.pointCloudShader = new Shader(this.gl, "PointCloudComputeShader");
        this.pointCloudShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['render.compute.glsl']);
        this.pointCloudShader.linkProgram();

        this.reprojectShader = new Shader(this.gl, "ReprojectComputeShader");
        this.reprojectShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['reproject.compute.glsl']);
        this.reprojectShader.linkProgram();

        this.clearDepthShader = new Shader(this.gl, "ClearDepthComputeShader");
        this.clearDepthShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['cleardepth.compute.glsl']);
        this.clearDepthShader.linkProgram();

        this.depthPassShader = new Shader(this.gl, "DepthPassComputeShader");
        this.depthPassShader.addSourceCode(this.gl.COMPUTE_SHADER, Shaders['depthpass.compute.glsl']);
        this.depthPassShader.linkProgram();

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

        const maxNodes = Math.min(this.maxNodesPerFrame, nodes.length);

        let numTotalPoints = nodes.map(n => n.getNumPoints()).reduce((a, b) => a + b, 0);
        let numPointsPerNode = Math.floor(this.pointBuffer.size / maxNodes);

        let i = 0;
        for (let node of nodes) {

            if (this.pointBuffer.require(node)) {

                // randomly choose nodes to upload
                if(this.maxNodesPerFrame > 0) { // max nodes enabled
                    if(i >= maxNodes) {
                        continue;
                    }

                    let render = Math.random() * nodes.length < maxNodes;
                    if (!render) continue;
                }

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
        let visibilityTextureData = null;

        this.pointCloudShader.use();

        this.renderNodes(octree, nodes, visibilityTextureData, camera, target, this.pointCloudShader, params);
    }

    _calculateFps() {
        if (this._lastTimeStamp) {
            const delta = performance.now() - this._lastTimeStamp;
            this._fps = 1000 / delta;

            this._timePassed += delta;
            this._fpsSum += this._fps;
            this._fpsSamples++;

            if (this._timePassed > 1000) {
                this._fpsAverage = this._fpsSum / 60;

                this._fpsSamples = 0;
                this._timePassed = 0;
                this._fpsSum = 0;

                this.profilingResults = this.profiler.collectAll();
                console.log(this.profilingResults);
            }
        }

        this._lastTimeStamp = performance.now();
    }

    shiftOrigin(camera) {
        if (this.shiftPosition) {
            const dist =  this.shiftPosition.length() - camera.position.length();
            if (Math.abs(dist) > 100000) {
                console.log("Shifting origin");
                this.clearAll();
                this.shiftPosition = camera.position.clone();
            }
        } else {
            this.shiftPosition = camera.position.clone();
        }

        this.shiftMatrix = new THREE.Matrix4().makeTranslation(this.shiftPosition.x, this.shiftPosition.y, this.shiftPosition.z);
        this.pointBuffer.shiftMatrix = new THREE.Matrix4().makeTranslation(-this.shiftPosition.x, -this.shiftPosition.y, -this.shiftPosition.z);
    }

    render(scene, camera, target = null, params = {}) {
        this._calculateFps();

        const gl = this.gl;

        // PREPARE
        if (target != null) {
            this.threeRenderer.setRenderTarget(target);
        }

        camera.updateProjectionMatrix();

        const traversalResult = this.traverse(scene);

        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.resolutionUBO);

        this.shiftOrigin(camera);

        // RENDER
        this.profiler.start('cleartextures');
        this.clearImageBuffer(this.pingPong(true));
        this.clearImageBuffer(2);
        this.profiler.stop('cleartextures');

        this.profiler.start('reprojection');
        this.reprojectLastFrame(camera);
        this.profiler.stop('reprojection');

        this.profiler.start('cleartextures');
        this.clearImageBuffer(this.pingPong(false));
        this.profiler.stop('cleartextures');
        // this.swapImageBuffer();

        this.profiler.start('uploadnodes');
        for (const octree of traversalResult.octrees) {
            let nodes = octree.visibleNodes;
            this.renderOctree(octree, nodes, camera, target, params);
        }
        this.profiler.stop('uploadnodes');

        this.profiler.start('rendernew');
        this.renderPoints(camera);
        this.profiler.stop('rendernew');
        this.pointBuffer.finishFrame();

        this.profiler.start('cleardepth');
        this.depthPass(camera);
        this.profiler.stop('cleardepth');

        this.profiler.start('combine');
        this.resolveBuffer(camera);
        this.profiler.stop('combine');

        this.profiler.start('display');
        this.displayResult();
        this.profiler.stop('display');
        // this.swapImageBuffer();

        // CLEANUP
        // gl.activeTexture(gl.TEXTURE1);
        // gl.bindTexture(gl.TEXTURE_2D, null);

        this.threeRenderer.state.reset();
    }

    reprojectLastFrame(camera) {
        this.reprojectShader.use();

        // Shift * Translate * Rotate. Works as long as not scaling is applied to the camera. (hope so)
        const shiftedViewMatrix =  camera.matrixWorldInverse.clone().multiply(this.shiftMatrix);
        const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, shiftedViewMatrix);
        this.reprojectShader.setUniformMatrix4("viewProjectionMatrix", vp);

        this.gl.bindImageTexture(0, this.storageTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(2, this.storageTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(
            Math.ceil(this.storageTexture[this.pingPong(false)].width / 16),
            Math.ceil(this.storageTexture[this.pingPong(false)].height / 16),
            1);
    }

    renderPoints(camera) {
        // render points to texture
        this.pointCloudShader.use();

        const renderAmount = this.pointsPerFrame;

        this.pointCloudShader.setUniform1i("lastIdx", this.pointBuffer.size);
        this.pointCloudShader.setUniform1i("startIdx", this.startIdx);
        this.pointCloudShader.setUniform1i("renderAmount", renderAmount);

        // Shift * Translate * Rotate. Works as long as not scaling is applied to the camera. (hope so)
        const shiftedViewMatrix =  camera.matrixWorldInverse.clone().multiply(this.shiftMatrix);
        const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, shiftedViewMatrix);
        this.pointCloudShader.setUniformMatrix4("viewProjectionMatrix", vp);

        this.pointBuffer.positionsSSBO.bind(1);

        this.gl.bindImageTexture(6, this.storageTexture[2].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(Math.ceil(renderAmount / 256), 1, 1);

        this.startIdx += renderAmount;
        if (this.startIdx >= this.pointBuffer.size) {
            this.startIdx = 0;
        }
    }

    depthPass(camera) {
        // clear depth
        this.clearDepthShader.use();

        this.resolveDepthSSBO.bind(6);

        const numPixels = this.storageTexture[this.pingPong(false)].width
            * this.storageTexture[this.pingPong(false)].height;

        this.gl.dispatchCompute(Math.ceil( numPixels / 256), 1, 1);

        // depth pass
        this.depthPassShader.use();

        // Shift * Translate * Rotate. Works as long as not scaling is applied to the camera. (hope so)
        const shiftedViewMatrix =  camera.matrixWorldInverse.clone().multiply(this.shiftMatrix);
        const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, shiftedViewMatrix);
        this.depthPassShader.setUniformMatrix4("viewProjectionMatrix", vp);

        this.gl.bindImageTexture(1, this.storageTexture[2].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(3, this.storageTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);

        this.resolveDepthSSBO.bind(6);

        this.gl.dispatchCompute(
            Math.ceil(this.storageTexture[this.pingPong(false)].width / 16),
            Math.ceil(this.storageTexture[this.pingPong(false)].height / 16),
            1);
    }

    resolveBuffer(camera) {
        this.resolveShader.use();

        // Shift * Translate * Rotate. Works as long as not scaling is applied to the camera. (hope so)
        const shiftedViewMatrix =  camera.matrixWorldInverse.clone().multiply(this.shiftMatrix);
        const vp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, shiftedViewMatrix);
        this.resolveShader.setUniformMatrix4("viewProjectionMatrix", vp);

        this.gl.bindImageTexture(0, this.storageTexture[2].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(2, this.storageTexture[this.pingPong(true)].texture, 0, false, 0, this.gl.READ_ONLY, this.gl.RGBA32F);
        this.gl.bindImageTexture(4, this.storageTexture[this.pingPong(false)].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.resolveDepthSSBO.bind(6);

        this.gl.dispatchCompute(
            Math.ceil(this.storageTexture[this.pingPong(false)].width / 16),
            Math.ceil(this.storageTexture[this.pingPong(false)].height / 16),
            1);
    }

    displayResult() {
        this.gl.disable(this.gl.DEPTH_TEST);
        // this.gl.enable(this.gl.BLEND);

        // Draw full screen quad
        this.drawQuadShader.use();

        this.storageTexture[this.pingPong(false)].bind(0);

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

        this.gl.bindImageTexture(0, this.storageTexture[idx].texture, 0, false, 0, this.gl.WRITE_ONLY, this.gl.RGBA32F);

        this.gl.dispatchCompute(
            Math.ceil(this.storageTexture[idx].width / 16),
            Math.ceil(this.storageTexture[idx].height / 16),
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

    clearFrame() {
        this.clearImageBuffer(0);
        this.clearImageBuffer(1);
        this.clearImageBuffer(2);
    }

    clearPool() {
        this.pointBuffer.clear();
    }


    clearAll() {
        this.clearPool();
        this.clearFrame();
    }

    getFPS() {
        // return this.fps.toFixed(2);
        return this._fpsAverage.toFixed(2);
    }

    // public interface
    getMemoryUtilization() {
        return this.pointBuffer.memoryManager.utilization;
    }

    get numNodesUploaded() {
        return this.pointBuffer.uploadedNodes.size;
    }

    set pointPoolSize(poolSize) {
        this.pointBuffer = new PointBuffer(this.gl, poolSize);
    }

    get pointPoolSize() {
        return this.pointBuffer.size;
    }

    get pointPoolSizeInMB() {
        return this.pointBuffer.allocatedStorage();
    }

    set pointSize(size) {
        this._pointSize = size;
        this.initUBOs();
    }

}
