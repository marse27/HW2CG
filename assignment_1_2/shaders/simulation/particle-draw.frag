#version 410

uniform vec3 containerCenter;

uniform bool  uShadingEnabled;
uniform bool  uUseSpeedColor;
uniform float uSpeedMax;
uniform vec3  uColorStationary;
uniform vec3  uColorMaxSpeed;
uniform float uAmbientCoeff;

layout(location = 0) in vec3 fragPosition;
layout(location = 1) in vec3 fragNormal;
layout(location = 2) in vec3 fragVelocity;
layout(location = 3) in vec3 fragBounceData;

layout(location = 0) out vec4 fragColor;

void main() {

    //Task 2.1
    vec3 baseColor = vec3(1.0);
        if (uUseSpeedColor) {
            float speed = length(fragVelocity);
            float t = clamp(speed / max(uSpeedMax, 1e-6), 0.0, 1.0);
            baseColor = mix(uColorStationary, uColorMaxSpeed, t);
        } else {
            baseColor = uColorStationary;
        }

        // --- Task 2.2: (optional) simple shading toggle ---
        vec3 finalColor = baseColor;
        if (uShadingEnabled) {
            vec3 N = normalize(fragNormal);
            vec3 L = normalize(fragPosition - containerCenter);

            float ndotl = max(dot(N, L), 0.0);

            float a = clamp(uAmbientCoeff, 0.0, 1.0);
            float shade = a + (1.0 - a) * ndotl;

            finalColor = baseColor * shade;
        }
        fragColor = vec4(finalColor, 1.0);
}
