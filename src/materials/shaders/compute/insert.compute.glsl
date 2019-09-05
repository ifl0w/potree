#version 310 es

precision mediump float;

//uniform int persistentEndIdx;
//uniform int amountPoints;
//uniform int startIdx;
//uniform int renderAmount;

uniform int lastIdx;
uniform int denseStartIdx;
uniform mat4 modelMatrix;

layout(std140, binding=0) buffer ModelMatices
{
    mat4 modelMatrices[];
};

layout(std140, binding=1) buffer PersistentPositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout(std140, binding=2) buffer PersistentColorBuffer
{
    vec4 colors[];
};

layout(std140, binding=3) buffer NewPositionBuffer
{
    vec4 newPositions[];// xyz = position, w = modelMatrixIndex
};

layout(std140, binding=4) buffer NewColorBuffer
{
    vec4 newColors[];
};

layout(std140, binding=5) buffer DenseIndexBuffer
{
    uint indices[];
};


layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;
    uint denseIdx = linearIdx + uint(denseStartIdx);

    if (linearIdx >= uint(lastIdx)) {
        return;
    }

    uint storeIdx = indices[denseIdx];
    vec4 position = modelMatrix * vec4(newPositions[linearIdx].xyz, 1);
    vec4 color = newColors[linearIdx];

    points[storeIdx] = position;
    colors[storeIdx] = color;
}
