#version 310 es

/*
    This shader is used to clear textures without attaching it to a framebuffer.
*/

precision mediump image2D;

layout(binding=0, rgba32f) uniform writeonly image2D colorTexture;
layout(binding=1, rgba32f) uniform writeonly image2D positionTexture;

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    imageStore(colorTexture, storePos, vec4(0));
    imageStore(positionTexture, storePos, vec4(0));
}
