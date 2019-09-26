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

layout(binding=0, rgba32f) uniform readonly image2D newPointsTexture;

layout(binding=2, rgba32f) uniform readonly image2D reprojectedPointsTexture;

layout(binding=4, rgba32f) uniform writeonly image2D targetTexture;

layout(std430, binding = 6) buffer depthData
{
    int depth[];
};


layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void store(vec4 data, vec4 position) {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 p = viewProjectionMatrix * position;
    float d = p.z / p.w;

    int size = pointSize;

    for (int i = 0; i < size; i++) {
        for (int j = 0; j < size; j++) {
            ivec2 offset = ivec2(-size/2, -size/2) + ivec2(i, j);
            ivec2 tmpPos = storePos + offset;
            int linearIdx = int(resolution.x) * tmpPos.y + tmpPos.x;
            if (linearIdx < 0 || linearIdx > int(resolution.x * resolution.y)) {
                continue;
            }

            if (d > intBitsToFloat(depth[linearIdx])) {
                continue;
            }

            imageStore(targetTexture, tmpPos, data);
        }
    }
}

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    vec4 reprojectedData = imageLoad(reprojectedPointsTexture, storePos);
    vec4 reprojectedPos = vec4(reprojectedData.xyz, 1);

    vec4 newData = imageLoad(newPointsTexture, storePos);
    vec4 newPos = vec4(newData.xyz, 1);

    if(newData == vec4(0) && reprojectedData == vec4(0)) {
        return;
    }

    if (newData != vec4(0)) {
        store(newData, newPos);
    }

    if (reprojectedData != vec4(0)) {
        store(reprojectedData, reprojectedPos);
    }
}
