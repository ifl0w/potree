#version 310 es

precision mediump image2D;
precision mediump float;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform int lastIdx;

layout(binding=0, rgba32f) uniform writeonly image2D colorTexture;
layout(binding=1, rgba32f) uniform writeonly image2D positionTexture;
layout(binding=2, rgba32f) uniform readonly image2D readColorTexture;
layout(binding=3, rgba32f) uniform readonly image2D readPositionTexture;

layout(std140, binding=0) buffer PointBuffer
{
    vec4 points[]; // xyz = position, w = modelMatrixIndex
};

layout(std140, binding=2) buffer ModelMatices
{
    mat4 modelMatrices[];
};


layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
    mat4 viewProjectionMatrix = projectionMatrix * viewMatrix;

    /*
        ### REPROJECTION
    */
    vec4 lastColor = imageLoad(readColorTexture, ivec2(gl_GlobalInvocationID.xy));
    vec4 lastWorldPos = imageLoad(readPositionTexture, ivec2(gl_GlobalInvocationID.xy));

    if (lastColor != vec4(0)) {
        vec4 newColor = lastColor;
        vec4 reprojectedPosition = viewProjectionMatrix * lastWorldPos;

        // Perspective Divide
        vec4 reprojectedNDCPosition = reprojectedPosition / reprojectedPosition.w;

        // Clipping
        if (reprojectedNDCPosition.x > 1.0 || reprojectedNDCPosition.x < -1.0 ||
        reprojectedNDCPosition.y > 1.0 || reprojectedNDCPosition.y < -1.0 ||
        reprojectedNDCPosition.z > 1.0 || reprojectedNDCPosition.z < -1.0 ) {
            // Skip
        } else {
            // screenspace
            ivec2 storePos = ivec2(reprojectedNDCPosition.xy * vec2(500, 500) + vec2(500, 500));

            imageStore(colorTexture, storePos, newColor);
            imageStore(positionTexture, storePos, lastWorldPos); // world position does not change
        }
    }
    /*
        ### NEW Points
    */

    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    if (linearIdx >= uint(lastIdx)) {
        return;
    }

    vec4 pointData = points[linearIdx];

    mat4 mMatrix = modelMatrices[int(pointData.w)];
    vec4 worldPosition = mMatrix * vec4(pointData.xyz, 1);

    vec4 projectedPosition = viewProjectionMatrix * worldPosition;

    // Perspective Divide
    vec4 ndcPosition = projectedPosition / projectedPosition.w;

    // Clipping
    if (ndcPosition.x > 1.0 || ndcPosition.x < -1.0 ||
    ndcPosition.y > 1.0 || ndcPosition.y < -1.0 ||
    ndcPosition.z > 1.0 || ndcPosition.z < -1.0 ) {
        return;
    }

    // screenspace
    ivec2 storePos = ivec2((ndcPosition.xy * vec2(0.5) + vec2(0.5)) * vec2(1000, 1000));

    imageStore(positionTexture, storePos, vec4(worldPosition));
    imageStore(colorTexture, storePos, vec4(1));
}
