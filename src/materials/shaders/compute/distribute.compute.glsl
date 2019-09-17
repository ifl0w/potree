#version 310 es

uniform int poolSize;

layout(std140, binding=0) buffer DenseIndexBuffer
{
    uint indices[];
};

layout (local_size_x = 256, local_size_y = 1, local_size_z = 1) in;

uint prnPermute(uint index){
    uint r = index % uint(2);
    uint h = uint(poolSize) >> uint(1);
    uint x = index >> uint(1); // divide by two

    return (h * r + x);
}

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    if (linearIdx >= uint(indices.length())) {
        return;
    }

    uint tmpIdx = linearIdx;
    int iterations = int(round(log2(float(poolSize)) / 2.0));
    for(int i = 0; i < iterations; i++) {
        tmpIdx = prnPermute(tmpIdx);
    }

    indices[linearIdx] = tmpIdx;
}
