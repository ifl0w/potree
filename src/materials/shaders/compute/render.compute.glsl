#version 310 es

precision mediump image2D;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

layout(binding=0, rgba16f) uniform writeonly image2D targetTexture;
layout(std430, binding=0) buffer PointBuffer
{
    vec3 points[];
};

layout (local_size_x = 16, local_size_y = 16) in;

void main() {
    uint linearIdx = gl_GlobalInvocationID.x * gl_GlobalInvocationID.y + gl_GlobalInvocationID.x;

    // ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

    float pointIdx = mod(float(linearIdx), float(points.length()));
    vec3 position = points[int(pointIdx)];

    vec4 viewPosition = viewMatrix * vec4(position, 1);

    // clip space
    vec4 projectedPosition = projectionMatrix * viewPosition;

    // TODO: Clipping
    if (projectedPosition.x > 1.0 || projectedPosition.x < -1.0 ||
        projectedPosition.y > 1.0 || projectedPosition.y < -1.0  ||
        projectedPosition.z > 1.0 || projectedPosition.z < -1.0 ) {
//            return;
    }

    // NDC
    vec3 ndcPosition = projectedPosition.xyz / projectedPosition.w;

    // screenspace
    ivec2 storePos = ivec2(ndcPosition.xy * vec2(500, 500) + vec2(500, 500));

    imageStore(targetTexture, storePos, vec4(1));
}
