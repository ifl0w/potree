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

layout(binding=2, rgba32f) uniform readonly image2D sourceTexture;

layout(std140, binding=1) buffer PositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
    vec4 data = imageLoad(sourceTexture, ivec2(gl_GlobalInvocationID.xy));
    vec4 lastWorldPos = vec4(data.xyz, 1);

    if (data == vec4(0)) {
        return;
    }

    //vec4 newColor = lastColor;
    vec4 clipSpace = viewProjectionMatrix * lastWorldPos;

    // Clipping
    if (clipSpace.x > clipSpace.w || clipSpace.x < -clipSpace.w ||
    clipSpace.y > clipSpace.w || clipSpace.y < -clipSpace.w ||
    clipSpace.z > clipSpace.w || clipSpace.z < 0.0) {
        return;
    }

    // Perspective Divide
    vec4 reprojectedNDCPosition = clipSpace / clipSpace.w;

    // screenspace
    ivec2 storePos = ivec2((reprojectedNDCPosition.xy * vec2(0.5) + vec2(0.5)) * resolution);

    imageStore(targetTexture, storePos, data);// world position does not change
}
