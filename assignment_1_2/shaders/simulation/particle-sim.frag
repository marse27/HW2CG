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

layout(location = 0) out vec3 finalPosition;
layout(location = 1) out vec3 finalVelocity;
layout(location = 2) out vec3 finalBounceData;

void main() {
    // ===== Task 1.1 Verlet Integration =====

        ivec2 coord = ivec2(gl_FragCoord.xy);

        // Fetch exact texels (no filtering)
        vec3 x_t = texelFetch(previousPositions,  coord, 0).xyz;
        vec3 v_t = texelFetch(previousVelocities, coord, 0).xyz;
        vec3 bounce_t = texelFetch(previousBounceData, coord, 0).xyz;

        const vec3 g = vec3(0.0, -9.81, 0.0);
        float dt = timestep;

        vec3 x_next = x_t + v_t * dt + 0.5 * g * (dt * dt);
        vec3 v_next = v_t + g * dt;

        finalBounceData = bounce_t;

    // ===== Task 1.3 Inter-particle Collision =====

    // ===== Task 1.3: Inter-particle collisions (accumulate & resolve once) =====

    // ===== Task 1.3: Inter-particle collisions (accumulate + single resolve) =====
    if (interParticleCollision) {
        float contactDistance = 2.0 * particleRadius; // center-to-center at contact

        vec3 accumulatedCorrection = vec3(0.0);
        vec3 accumulatedNormal     = vec3(0.0);
        int  contactCount          = 0;

        int N = int(numParticles);
        for (int j = 0; j < N; ++j) {
            if (j == coord.x) continue;

            // Neighbor position from previous state
            vec3 neighborPos = texelFetch(previousPositions, ivec2(j, coord.y), 0).xyz;

            // Vector from neighbor to this particle (using tentative x_next)
            vec3  delta    = x_next - neighborPos; // neighbor -> current
            float distance = length(delta);

            // Overlap?
            if (distance > 0.0 && distance < contactDistance) {
                vec3  n           = delta / distance;                // contact normal
                float penetration = contactDistance - distance;      // overlap depth

                // Accumulate correction and normal (0.99 per your pattern)
                accumulatedCorrection += n * (penetration * 0.99);
                accumulatedNormal += n;
                contactCount++;
            }
        }

        if (contactCount > 0) {
            // Average normal
            vec3 averageNormal = normalize(accumulatedNormal);

            // Apply the summed position correction once
            x_next += accumulatedCorrection;

            // Reflect velocity about the averaged normal (energy-conserving)
            float vDotN = dot(v_next, averageNormal);
            v_next = v_next - 2.0 * vDotN * averageNormal;
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
    }

    finalPosition = x_next;
    finalVelocity = v_next;
}
