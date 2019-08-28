#version 310 es

precision mediump image2D;
precision mediump float;

out vec4 fragColor;

in vec2 textureCoords;

//layout(binding = 0, rgba32f) uniform readonly image2D renderTexture;
//layout(binding = 1, rgba32f) uniform readonly image2D newPointsTexture;

layout(binding = 0) uniform sampler2D renderTexture;
//layout(binding = 1) uniform sampler2D newPointsTexture;

void main()
{
//    ivec2 accesLocation = ivec2(textureCoords * vec2(1000));
//    if (imageLoad(newPointsTexture, accesLocation) != vec4(0)) {
//        fragColor = imageLoad(newPointsTexture, accesLocation);
//        fragColor = vec4(1,0,0,1);
//        return;
//    }

    fragColor = texture(renderTexture, textureCoords);
}
