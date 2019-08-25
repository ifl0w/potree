#version 310 es

precision mediump image2D;
precision mediump float;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

layout(binding=0, rgba16f) uniform writeonly image2D targetTexture;
layout(std140, binding=0) buffer PointBuffer
{
    vec4 points[]; // not tightly packed due to std140
};

layout(std140, binding=1) buffer MetaData
{
    ivec4 modelMatrixIndices[]; // vec4 for convenience; uses the same packing as the positions
};

layout(std140, binding=2) buffer ModelMatices
{
    mat4 modelMatrices[];
};


layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    if (linearIdx > uint(points.length())) {
//        ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
//        imageStore(targetTexture, storePos, vec4(float(modelMatrices[modelMatrixIndices[linearIdx]][0][1])/2.0, 0, 0,1));
        return;
    }


//    float pointIdx = mod(float(linearIdx), float(points.length()));
    mat4 mvMatrix = viewMatrix * modelMatrices[modelMatrixIndices[linearIdx].x];
    vec4 position = mvMatrix * vec4(points[linearIdx].xyz, 1);

    vec4 projectedPosition = projectionMatrix * position;

    // Perspective Divide
    vec4 ndcPosition = projectedPosition / projectedPosition.w;

    // Clipping
    if (ndcPosition.x > 1.0 || ndcPosition.x < -1.0 ||
    ndcPosition.y > 1.0 || ndcPosition.y < -1.0 ||
    ndcPosition.z > 1.0 || ndcPosition.z < -1.0 ) {
        // ivec2 storePos = ivec2(ndcPosition.xy * vec2(500, 500) + vec2(500, 500));
        // imageStore(targetTexture, storePos, vec4(1,0,0,1));
        return;
    }

    // screenspace
    ivec2 storePos = ivec2(ndcPosition.xy * vec2(500, 500) + vec2(500, 500));

    imageStore(targetTexture, storePos, vec4(1));
}
