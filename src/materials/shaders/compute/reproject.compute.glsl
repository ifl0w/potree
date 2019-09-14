#version 310 es

precision mediump image2D;
precision mediump float;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewProjectionMatrix;

uniform mat4 lastFrameViewMatrix;
uniform mat4 lastFrameProjectionMatrix;

uniform int lastIdx;

layout(std140, binding = 0) uniform screenData
{
    vec2 resolution;
};

layout(binding=0, rgba32f) uniform writeonly image2D colorTexture;
layout(binding=1, rgba32f) uniform writeonly image2D positionTexture;
layout(binding=2, rgba32f) uniform readonly image2D readColorTexture;
layout(binding=3, rgba32f) uniform readonly image2D readPositionTexture;

layout(std140, binding=1) buffer PositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout(std140, binding=2) buffer ColorBuffer
{
    vec4 colors[];
};


layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
//    mat4 t = projectionMatrix * viewMatrix;

    vec4 lastColor = imageLoad(readColorTexture, ivec2(gl_GlobalInvocationID.xy));
    vec4 lastWorldPos = imageLoad(readPositionTexture, ivec2(gl_GlobalInvocationID.xy));

    if (lastColor == vec4(0)) {
        return;
    }

    vec4 newColor = lastColor;
    vec4 reprojectedPosition = viewProjectionMatrix * lastWorldPos;

    // Perspective Divide
    vec4 reprojectedNDCPosition = reprojectedPosition / reprojectedPosition.w;

    // Clipping
    if (reprojectedNDCPosition.x > 1.0 || reprojectedNDCPosition.x < -1.0 ||
    reprojectedNDCPosition.y > 1.0 || reprojectedNDCPosition.y < -1.0 ||
    reprojectedNDCPosition.z > 1.0 || reprojectedNDCPosition.z < 0.0) {
        return;
    }

    // screenspace
    ivec2 storePos = ivec2((reprojectedNDCPosition.xy * vec2(0.5) + vec2(0.5)) * resolution);

    imageStore(colorTexture, storePos, newColor);
    imageStore(positionTexture, storePos, lastWorldPos);// world position does not change
}
