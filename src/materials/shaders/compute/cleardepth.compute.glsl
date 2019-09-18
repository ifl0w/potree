#version 310 es

precision highp image2D;
precision highp float;

layout(std140, binding = 0) uniform screenData
{
    vec2 resolution;
    int pointSize;
};

layout(std430, binding = 6) buffer depthData
{
    int depth[];
};

layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    if (linearIdx >= uint(resolution.x * resolution.y)) {
        return;
    }

    depth[linearIdx] = floatBitsToInt(1.0);
}
