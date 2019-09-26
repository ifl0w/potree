#version 310 es

precision highp float;
precision highp int;

uniform int lastIdx;
uniform int denseStartIdx;
uniform mat4 modelMatrix;

layout(std140, binding=1) buffer PersistentPositionBuffer
{
    vec4 points[];// xyz = position, w = modelMatrixIndex
};

layout(std140, binding=3) buffer NewPositionBuffer
{
    vec4 newPositions[];// pattern: [xyzx][yzxy][zxyz]
};

layout(std140, binding=4) buffer NewColorBuffer
{
    uvec4 newColors[];
};

layout(std140, binding=5) buffer DenseIndexBuffer
{
    uint indices[];
};


layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

float getColorBits(int index) {
    uvec4 packedColor = newColors[index >> 2];

    int r = index % 4;
    uint tmp = packedColor.r;

    if (r == 0) { tmp = packedColor.r; }
    if (r == 1) { tmp = packedColor.g; }
    if (r == 2) { tmp = packedColor.b; }
    if (r == 3) { tmp = packedColor.a; }

    return uintBitsToFloat(tmp);
}

vec4 unpackPosition(int index) {
    //    modelMatrix * vec4(newPositions[index].xyz, 1);

    int componentIdx = index * 3;
    int realIdx = componentIdx >> 2; // divide by 4
    int r = componentIdx % 4;

    vec3 pos = vec3(1);
    if (r == 0) {
        pos.xyz = newPositions[realIdx].xyz;
    }

    if (r == 1) {
        pos.xyz = newPositions[realIdx].yzw;
    }

    if (r == 2) {
        pos.xy = newPositions[realIdx].zw;
        pos.z = newPositions[realIdx + 1].x;
    }

    if (r == 3) {
        pos.x = newPositions[realIdx].w;
        pos.yz = newPositions[realIdx + 1].xy;
    }

    return modelMatrix * vec4(pos, 1);
}

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;
    uint denseIdx = linearIdx + uint(denseStartIdx);

    if (linearIdx >= uint(lastIdx)) {
        return;
    }

    uint storeIdx = indices[denseIdx];

    vec4 data = vec4(unpackPosition(int(linearIdx)).xyz, getColorBits(int(linearIdx)));

    points[storeIdx] = data;
}
