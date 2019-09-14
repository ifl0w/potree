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

layout(binding=0, rgba32f) uniform readonly image2D newColorTexture;
layout(binding=1, rgba32f) uniform readonly image2D newPositionTexture;

layout(binding=2, rgba32f) uniform readonly image2D reprojectedColorTexture;
layout(binding=3, rgba32f) uniform readonly image2D reprojectedPositionTexture;

layout(binding=4, rgba32f) uniform writeonly image2D targetColorTexture;
layout(binding=5, rgba32f) uniform writeonly image2D targetPositionTexture;


layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void store(vec4 color, vec4 position) {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    imageStore(targetColorTexture, storePos, color);
    imageStore(targetPositionTexture, storePos, position);
}

void main() {
//    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 reprojectedColor = imageLoad(reprojectedColorTexture, storePos);
    vec4 reprojectedPos = imageLoad(reprojectedPositionTexture, storePos);

    vec4 newColor = imageLoad(newColorTexture, storePos);
    vec4 newPos = imageLoad(newPositionTexture, storePos);

    if (newColor == vec4(0)) {
        store(reprojectedColor, reprojectedPos);
        return;
    }

    if (reprojectedColor == vec4(0)) {
        store(newColor, newPos);
        return;
    }

    vec4 p1 = viewProjectionMatrix * reprojectedPos;
    p1 = p1 / p1.w;
    vec4 p2 = viewProjectionMatrix * newPos;
    p2 = p2 / p2.w;

    if (p2.z < p1.z) {
        store(newColor, newPos);
    } else {
        store(reprojectedColor, reprojectedPos);
    }
}
