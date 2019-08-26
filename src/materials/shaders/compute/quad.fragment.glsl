#version 310 es

precision mediump float;

out vec4 fragColor;

in vec2 textureCoords;

uniform sampler2D renderTexture;

void main()
{
    fragColor = texture(renderTexture, textureCoords);
}
