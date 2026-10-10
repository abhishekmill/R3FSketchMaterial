export const EASINGS = {
  'ease in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  'ease out': (t) => 1 - Math.pow(1 - t, 3),
  linear: (t) => t,
}
