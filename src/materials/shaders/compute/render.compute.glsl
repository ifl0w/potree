#version 310 es

precision highp image2D;
precision highp float;
precision highp int;

uniform mat4 viewProjectionMatrix;

uniform int lastIdx;
uniform int startIdx;
uniform int renderAmount;

layout(std140, binding = 0) uniform screenData
{
    vec2 resolution;
    int pointSize;
};

layout(binding=6, rgba32f) uniform writeonly image2D targetTexture;
//layout(binding=7, rgba32f) uniform writeonly image2D positionTexture;

layout(std140, binding=1) buffer PositionBuffer
{
    vec4 points[]; // xyz = position
};

layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

void main() {
//    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;

    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;
    linearIdx += uint(startIdx);
    linearIdx = uint(int(linearIdx) % int(lastIdx));

    vec4 pointData = points[linearIdx];

    if(pointData == vec4(0)) {
        return;
    }

//    mat4 mMatrix = modelMatrices[int(pointData.w)];
    vec4 worldPosition = vec4(pointData.xyz, 1);
    vec4 clipSpace = viewProjectionMatrix * worldPosition;

    // Clipping
    if (clipSpace.x > clipSpace.w || clipSpace.x < -clipSpace.w ||
    clipSpace.y > clipSpace.w || clipSpace.y < -clipSpace.w ||
    clipSpace.z > clipSpace.w || clipSpace.z < 0.0) {
        return;
    }

    // Perspective Divide
    vec4 ndcPosition = clipSpace / clipSpace.w;

    // screenspace
    ivec2 storePos = ivec2((ndcPosition.xy * vec2(0.5) + vec2(0.5)) * resolution);

    vec4 data = vec4(worldPosition.xyz, pointData.w);

    imageStore(targetTexture, storePos, data);
    //imageStore(colorTexture, storePos, pointColor);

//    int size = 1;
//    for (int i = 0; i < size; i++) {
//        for (int j = 0; j < size; j++) {
//            ivec2 offset = ivec2(-size/2, -size/2) + ivec2(i, j);
//
//            imageStore(positionTexture, storePos + offset, worldPosition);
//            imageStore(colorTexture, storePos + offset, pointColor);
//        }
//    }
}
