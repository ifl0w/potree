#version 310 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;

uniform mat4 modelMatrix;

out vec2 textureCoords;

void main() {
    textureCoords = uv;
    gl_Position = vec4(position, 1);
}
