#version 310 es

precision highp image2D;
precision highp float;
precision highp int;

uniform mat4 viewProjectionMatrix;

uniform int lastIdx;

layout(std140, binding = 0) uniform screenData
{
    vec2 resolution;
    int pointSize;
};

layout(binding=1, rgba32f) uniform readonly image2D newTexture;
layout(binding=3, rgba32f) uniform readonly image2D reprojectedTexture;

// using shader storage buffer since imageAtomicMin does not work.
layout(std430, binding = 6) buffer depthData
{
    int depth[];
};

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void store(vec4 data) {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 position = vec4(data.xyz, 1);

    vec4 p = viewProjectionMatrix * position;
    float d = p.z / p.w;

    int size = pointSize;
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

    vec4 newData = imageLoad(newTexture, storePos);
    if (newData != vec4(0)) {
        store(newData);
    }

    vec4 reprojectedData = imageLoad(reprojectedTexture, storePos);
    if (reprojectedData != vec4(0)) {
        store(reprojectedData);
    }
}
