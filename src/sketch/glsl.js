// Shared GLSL for the ballpoint sketch look. Everything is computed per pixel, so it
// works on any mesh: strokes are drawn in a 2D coordinate system on the surface (p).
export const sketchGLSL = /* glsl */ `
float sk_hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sk_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sk_hash(i), sk_hash(i + vec2(1, 0)), u.x),
             mix(sk_hash(i + vec2(0, 1)), sk_hash(i + 1.0), u.x), u.y);
}
mat2 sk_rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// approximate distance to the outline of an ellipse with radii r
float sk_ellipse(vec2 p, vec2 r) {
  vec2 e = p / r;
  float len = max(length(e), 1e-4);
  return abs(len - 1.0) / max(length(e / r) / len, 1e-4);
}

// paper "tooth": ballpoint ink skips on the raised fibres (screen space)
float sk_tooth(vec2 fragCoord, float dpr, float amount) {
  vec2 p = fragCoord / dpr;
  float g = sk_noise(p * 1.35) * 0.6 + sk_noise(p * 0.45) * 0.4;
  return mix(1.0, smoothstep(0.22, 0.72, g), amount);
}

// The back-and-forth motion of a hand holding a pen. The surface is split into bands;
// inside each band the pen sweeps across and back, advancing a little each sweep
// (a zig-zag), and some turnarounds curl into a small loop. Returns ink coverage 0..1.
// width is the stroke width in device pixels.
float sk_scribble(vec2 p, float angle, float stepY, float bandW, float loops, float width, float seed) {
  vec2 q = sk_rot(angle) * p;
  float px = max(length(fwidth(q)) * 0.7071, 1e-6);              // surface units per pixel

  // band edges wander so the turnarounds don't line up into seams
  float bx = q.x / bandW + (sk_noise(vec2(q.y / bandW * 3.0, seed)) - 0.5) * 0.9;
  float band = floor(bx);
  float X = fract(bx) * bandW;
  float Y = q.y + sk_hash(vec2(band, seed)) * 2.0 * stepY
                + (sk_noise(vec2(q.x / bandW * 3.0, seed + 3.0)) - 0.5) * stepY * 0.6;

  // the zig-zag is two families of slightly slanted lines that meet at the band edges
  float d = stepY, d2 = 2.0 * stepY, slope = X / bandW * d;
  float dist = min(abs(fract((Y - slope) / d2 + 0.5) - 0.5),
                   abs(fract((Y + slope) / d2 + 0.5) - 0.5)) * d2;

  // loops at some of the turnarounds: the pen swings past the turn and curls back across
  // its own stroke, leaving a long thin oval. Right edge turns at Y = d + 2dk, left at Y = 2dk.
  vec2 rad = vec2(d * 2.2, d * 0.8) * (0.8 + 0.4 * sk_hash(vec2(band, seed + 2.0)));
  float kr = floor((Y - d) / d2 + 0.5), kl = floor(Y / d2 + 0.5);
  if (sk_hash(vec2(kr + band * 17.0, seed + 5.0)) < loops * 0.5)
    dist = min(dist, sk_ellipse(vec2(X, Y) - vec2(bandW - rad.x, d + d2 * kr - 0.15 * d), rad));
  if (sk_hash(vec2(kl + band * 23.0, seed + 9.0)) < loops * 0.5)
    dist = min(dist, sk_ellipse(vec2(X, Y) - vec2(rad.x, d2 * kl - 0.15 * d), rad));

  // pen pressure varies along the stroke; thin lines get lighter instead of thinner
  float hw = 0.5 * width * (1.0 - 0.25 * sk_noise(vec2(X / bandW * 4.0, Y / d + seed)));
  float a = (1.0 - smoothstep(hw - 0.5, hw + 0.5, dist / px)) * min(1.0, hw * 2.0 + 0.3);
  a *= 1.0 - 0.25 * sk_noise(vec2(X / bandW * 15.0, Y / d + seed));                  // uneven ink
  a *= smoothstep(0.11, 0.17, sk_noise(vec2(X / bandW * 5.0, Y / d * 0.5 + seed * 3.1))); // ink skips
  return a;
}

// Tonal ladder, the way you'd shade by hand:
//   light     -> one sparse scribble with bare-paper patches
//   mid       -> the same scribble, denser
//   dark      -> + a second direction, only in patches
//   very dark -> second direction almost everywhere, heavier hand
float sk_hatch(vec2 p, float dark, float density, float angle, float loops, float width, float pressure, float seed) {
  float vdark = smoothstep(0.85, 0.95, dark);
  float stepY = 0.84 / (density * mix(0.6, 1.5, smoothstep(0.2, 0.75, dark)) * (1.0 + 0.12 * vdark));
  float bandW = mix(0.45, 0.85, dark) + sk_hash(vec2(seed, 1.0)) * 0.25;

  float a = sk_scribble(p, angle, stepY, bandW, loops, width * (1.0 + 0.15 * vdark), seed);
  a *= smoothstep(0.1, 0.2, dark * 1.1 + (sk_noise(p * 1.7 + seed) - 0.5) * 0.9);

  float need = mix(0.55, 0.3, vdark);
  float cross = smoothstep(0.62, 0.75, dark) * smoothstep(need - 0.05, need + 0.05, sk_noise(p * 1.3 + seed + 11.0));
  float b = sk_scribble(p, angle + 0.8, stepY * 1.55, bandW * 0.75, loops, width, seed + 19.0) * cross;

  // some areas pressed harder than others
  float ink = pressure * (0.68 + 0.64 * sk_noise(p * 1.4 + seed + 2.0)) * mix(0.7, 1.0, dark) * (1.0 + 0.2 * vdark);
  return 1.0 - (1.0 - a * ink) * (1.0 - b * ink * 0.64);
}
`
