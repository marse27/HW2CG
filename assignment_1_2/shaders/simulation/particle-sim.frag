#version 410
#extension GL_ARB_explicit_uniform_location : enable

uniform sampler2D previousPositions;
uniform sampler2D previousVelocities;
uniform sampler2D previousBounceData;
uniform float timestep;
uniform uint numParticles;
uniform float particleRadius;
uniform vec3 containerCenter;
uniform float containerRadius;
uniform bool interParticleCollision;

uniform int uBounceThreshold;
uniform int uBounceFrames;

layout(location = 0) out vec3 finalPosition;
layout(location = 1) out vec3 finalVelocity;
layout(location = 2) out vec3 finalBounceData;

void main() {
    // ===== Task 1.1 Verlet Integration =====

        ivec2 coord = ivec2(gl_FragCoord.xy);

        vec3 x_t = texelFetch(previousPositions,  coord, 0).xyz;
        vec3 v_t = texelFetch(previousVelocities, coord, 0).xyz;
        vec3 bounce_t = texelFetch(previousBounceData, coord, 0).xyz;

        float collisionCount = bounce_t.x;
        float framesLeft = max(bounce_t.y - 1.0, 0.0);
        bool hadCollision = false;

        const vec3 g = vec3(0.0, -9.81, 0.0);
        float dt = timestep;

        vec3 x_next = x_t + v_t * dt + 0.5 * g * (dt * dt);
        vec3 v_next = v_t + g * dt;

        finalBounceData = bounce_t;

    // ===== Task 1.3 Inter-particle Collision =====

    if (interParticleCollision) {
        float contactDistance = 2.0 * particleRadius;

        vec3 accumulatedCorrection = vec3(0.0);
        vec3 accumulatedNormal = vec3(0.0);
        int contactCount = 0;

        int N = int(numParticles);
        for (int j = 0; j < N; j++) {
            if (j == coord.x) {
             continue;
            }

            vec3 neighborPos = texelFetch(previousPositions, ivec2(j, coord.y), 0).xyz;

            vec3 delta = x_next - neighborPos;
            float distance = length(delta);

            if (distance > 0.0 && distance < contactDistance) {
                vec3 n = delta / distance;
                float penetration = contactDistance - distance;

                accumulatedCorrection += n * (penetration * 0.99);
                accumulatedNormal += n;
                contactCount++;
            }
        }

        if (contactCount > 0) {
            vec3 averageNormal = normalize(accumulatedNormal);

            x_next += accumulatedCorrection;

            float vDotN = dot(v_next, averageNormal);
            v_next = v_next - 2.0 * vDotN * averageNormal;

            hadCollision = true;
        }
    }
    
    // ===== Task 1.2 Container Collision =====

    float innerRadius = containerRadius - particleRadius;

    vec3  centerToPos  = x_next - containerCenter;
    float distToCenter = length(centerToPos);

    if (distToCenter > innerRadius) {
        vec3 surfaceNormal;
        if (distToCenter > 0.0) {
            surfaceNormal = centerToPos / distToCenter;
        } else {
            surfaceNormal = vec3(0.0, 1.0, 0.0);
        }

        const float stayInsideBias = 0.9995;

        x_next = containerCenter + surfaceNormal * (innerRadius * stayInsideBias);

        float vDotN = dot(v_next, surfaceNormal);
        v_next = v_next - 2.0 * vDotN * surfaceNormal;

        hadCollision = true;
    }

    finalPosition = x_next;
    finalVelocity = v_next;

    if (hadCollision) {
        collisionCount += 1.0;
    }
    if (collisionCount >= float(uBounceThreshold)) {
        framesLeft = float(uBounceFrames);
        collisionCount = 0.0;
    }

    finalBounceData = vec3(collisionCount, framesLeft, 0.0);
}
