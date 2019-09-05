#version 310 es

precision mediump image2D;
precision mediump float;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform int lastIdx;
uniform int startIdx;
uniform int renderAmount;

layout(std140, binding = 0) uniform screenData
{
    vec2 resolution;
};

layout(binding=6, rgba32f) uniform writeonly image2D colorTexture;
layout(binding=7, rgba32f) uniform writeonly image2D positionTexture;

layout(std140, binding=0) buffer ModelMatices
{
    mat4 modelMatrices[];
};

layout(std140, binding=1) buffer PositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout(std140, binding=2) buffer ColorBuffer
{
    vec4 colors[];
};

layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

void main() {
    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;

    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;
    linearIdx += uint(startIdx);

    if (linearIdx >= uint(lastIdx)) {
        return;
    }

    vec4 pointData = points[linearIdx];

//    mat4 mMatrix = modelMatrices[int(pointData.w)];
    vec4 worldPosition = vec4(pointData.xyz, 1);
    vec4 projectedPosition = viewProjectionMatrix * worldPosition;

    // Perspective Divide
    vec4 ndcPosition = projectedPosition / projectedPosition.w;

    // Clipping
    if (ndcPosition.x > 1.0 || ndcPosition.x < -1.0 ||
    ndcPosition.y > 1.0 || ndcPosition.y < -1.0 ||
    ndcPosition.z > 1.0 || ndcPosition.z < 0.0) {
        return;
    }

    // screenspace
    ivec2 storePos = ivec2((ndcPosition.xy * vec2(0.5) + vec2(0.5)) * resolution);

    vec4 pointColor = colors[linearIdx];

    imageStore(positionTexture, storePos, worldPosition);
    imageStore(colorTexture, storePos, pointColor);
}
