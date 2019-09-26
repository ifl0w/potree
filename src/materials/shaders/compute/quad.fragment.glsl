#version 310 es

precision highp image2D;
precision highp float;
precision highp int;

out vec4 fragColor;

in vec2 textureCoords;

layout(binding = 0) uniform sampler2D dataTexture;

vec4 unpackRGBA(float colorBits) {
    uint tmp = floatBitsToUint(colorBits);
    return unpackUnorm4x8(tmp);

//    vec4 c = vec4(0);
//    c.r = float((tmp & uint(0x000000FF))) / 255.0;
//    c.g = float((tmp & uint(0x0000FF00)) >> 8) / 255.0;
//    c.b = float((tmp & uint(0x00FF0000)) >> 16) / 255.0;
//    c.a = float((tmp & uint(0xFF000000)) >> 24) / 255.0;
//
//    return c;
}

void main()
{
    vec4 data = texture(dataTexture, textureCoords);
    fragColor = unpackRGBA(data.w);
}
