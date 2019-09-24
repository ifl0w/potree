#version 310 es

/*
    This shader is used to clear textures without attaching it to a framebuffer.
*/

precision highp image2D;
precision highp float;
precision highp int;

layout(binding=0, rgba32f) uniform writeonly image2D texture;

layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;

void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    imageStore(texture, storePos, vec4(0));
}
