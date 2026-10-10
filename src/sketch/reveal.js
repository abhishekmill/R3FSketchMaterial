// Reveal / wash-out effect, shared by every sketch shader. The uniform objects themselves are
// shared, so animating uReveal.value once updates the hatching, shadow and paper together.
// The pen outlines read uReveal on the CPU instead (see SketchOutline), fading as a whole.
export const revealUniforms = {
  uReveal: { value: 1 },          // 1 = fully inked, 0 = washed out
  uRevealScale: { value: 1.2 },   // size of the wash pattern (higher = smaller blotches)
  uRevealEdge: { value: 0.15 },   // softness of the wash front
  uRevealSweep: { value: 0.35 },  // 0 = random blotches, 1 = rises from the ground up
  uRevealWet: { value: 0.6 },     // darker "wet" ink right at the wash front
  uRevealShadow: { value: 1 },    // 1 = the cast shadow washes out too
  uRevealPaper: { value: 1 },     // 1 = the paper texture washes out too
  uRevealLines: { value: 1 },     // 1 = the pen outlines fade out too (read by SketchOutline)
}

// needs sk_noise from sketchGLSL
export const revealGLSL = /* glsl */ `
uniform float uReveal, uRevealScale, uRevealEdge, uRevealSweep, uRevealWet, uRevealShadow, uRevealPaper;

// How much ink is left at this world position (x), and a wet-edge multiplier for it (y).
vec2 sk_reveal(vec3 world) {
  vec2 a = world.xz * uRevealScale, b = world.xy * uRevealScale + 7.3;
  float n = 0.5 * (sk_noise(a) + sk_noise(b)) * 0.7 + 0.5 * (sk_noise(a * 3.1) + sk_noise(b * 3.1)) * 0.3;
  float order = mix(n, clamp(world.y / 2.5, 0.0, 1.0), uRevealSweep);   // when this spot gets inked
  float v = smoothstep(order, order + uRevealEdge, uReveal * (1.0 + uRevealEdge));
  return vec2(v, 1.0 + uRevealWet * 4.0 * v * (1.0 - v));
}
`
