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

layout(binding=0, rgba32f) uniform writeonly image2D targetTexture;
//layout(binding=1, rgba32f) uniform writeonly image2D positionTexture;
layout(binding=2, rgba32f) uniform readonly image2D sourceTexture;
//layout(binding=3, rgba32f) uniform readonly image2D readPositionTexture;

layout(std140, binding=1) buffer PositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
//    mat4 t = projectionMatrix * viewMatrix;

    // vec4 lastColor = imageLoad(readColorTexture, ivec2(gl_GlobalInvocationID.xy));
    vec4 data = imageLoad(sourceTexture, ivec2(gl_GlobalInvocationID.xy));
    vec4 lastWorldPos = vec4(data.xyz, 1);

    if (data == vec4(0)) {
        return;
    }

    //vec4 newColor = lastColor;
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

    //imageStore(colorTexture, storePos, newColor);
    imageStore(targetTexture, storePos, data);// world position does not change

//    int size = 1;
//    for (int i = 0; i < size; i++) {
//        for (int j = 0; j < size; j++) {
//            ivec2 offset = ivec2(-size/2, -size/2) + ivec2(i, j);
//
//            imageStore(colorTexture, storePos + offset, newColor);
//            imageStore(positionTexture, storePos + offset, lastWorldPos);// world position does not change
//        }
//    }
}
