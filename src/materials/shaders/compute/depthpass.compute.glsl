#version 310 es

precision highp image2D;
precision highp float;

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

layout(binding=1, rgba32f) uniform readonly image2D newPositionTexture;
layout(binding=3, rgba32f) uniform readonly image2D reprojectedPositionTexture;

precision highp iimage2D;
precision highp uimage2D;
layout(binding=7, r32f) uniform image2D depthBuffer;

layout(std430, binding = 6) buffer depthData
{
    int depth[];
};

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void store(vec4 position) {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 p = viewProjectionMatrix * position;
    float d = p.z / p.w;

    int size = 2;
//    int size = max(12 - int(log2(length(p))), 1);
    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            ivec2 offset = ivec2(-size/2, -size/2) + ivec2(i, j);

            ivec2 tmpPos = storePos + offset;
            int linearIdx = int(resolution.x) * tmpPos.y + tmpPos.x;

            if (linearIdx < 0 || linearIdx >= int(resolution.x * resolution.y)) {
                continue;
            }

            atomicMin(depth[linearIdx], floatBitsToInt(d));
//            depth[linearIdx] = floatBitsToInt(1.0);
        }
    }
}

void main() {
    //    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 newPos = imageLoad(newPositionTexture, storePos);
    if (newPos != vec4(0)) {
        store(newPos);
    }

    vec4 reprojectedPos = imageLoad(reprojectedPositionTexture, storePos);
    if (reprojectedPos != vec4(0)) {
        store(reprojectedPos);
    }
}
