import { useMemo } from 'react'
import * as THREE from 'three'

// Block letters on a grid 5 units tall: [outline, ...holes], each a list of [x, y] points.
const GLYPHS = {
  A: [[[0, 0], [1, 0], [1, 2], [3, 2], [3, 0], [4, 0], [4, 5], [0, 5]],
      [[1, 3], [3, 3], [3, 4], [1, 4]]],
  B: [[[0, 0], [3, 0], [4, 1], [4, 2], [3.5, 2.5], [4, 3], [4, 4], [3, 5], [0, 5]],
      [[1, 1], [3, 1], [3, 2], [1, 2]],
      [[1, 3], [3, 3], [3, 4], [1, 4]]],
  E: [[[0, 0], [4, 0], [4, 1], [1, 1], [1, 2], [3, 2], [3, 3], [1, 3], [1, 4], [4, 4], [4, 5], [0, 5]]],
  H: [[[0, 0], [1, 0], [1, 2], [3, 2], [3, 0], [4, 0], [4, 5], [3, 5], [3, 3], [1, 3], [1, 5], [0, 5]]],
  I: [[[0, 0], [3, 0], [3, 1], [2, 1], [2, 4], [3, 4], [3, 5], [0, 5], [0, 4], [1, 4], [1, 1], [0, 1]]],
  J: [[[0, 0], [4, 0], [4, 5], [3, 5], [3, 1], [1, 1], [1, 2], [0, 2]]],
  K: [[[0, 0], [1, 0], [1, 2], [1.5, 2], [3, 0], [4.2, 0], [2.4, 2.5], [4.2, 5], [3, 5], [1.5, 3], [1, 3], [1, 5], [0, 5]]],
  P: [[[0, 0], [1, 0], [1, 2], [3, 2], [4, 3], [4, 4], [3, 5], [0, 5]],
      [[1, 3], [3, 3], [3, 4], [1, 4]]],
  R: [[[0, 0], [1, 0], [1, 2], [1.6, 2], [3, 0], [4.2, 0], [2.7, 2.1], [4, 3], [4, 4], [3, 5], [0, 5]],
      [[1, 3], [3, 3], [3, 4], [1, 4]]],
  S: [[[0, 0], [4, 0], [4, 3], [1, 3], [1, 4], [4, 4], [4, 5], [0, 5], [0, 2], [3, 2], [3, 1], [0, 1]]],
  T: [[[0, 5], [4, 5], [4, 4], [2.5, 4], [2.5, 0], [1.5, 0], [1.5, 4], [0, 4]]],
}
const GAP = 0.8

const toPath = (pts, dx, Kind) => {
  const p = new Kind()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x + dx, y) : p.moveTo(x + dx, y)))
  p.closePath()
  return p
}

/** Extruded block letters, standing on y = 0 and centred on x = 0. Supports the letters in GLYPHS. */
export function BlockText({ text, height = 0.8, depth = 0.2, material, outline, ...props }) {
  const geometry = useMemo(() => {
    const shapes = []
    let x = 0
    for (const ch of text.toUpperCase()) {
      const glyph = GLYPHS[ch]
      if (!glyph) { x += 3; continue }   // unknown letters leave a space
      const [outer, ...holes] = glyph
      const shape = toPath(outer, x, THREE.Shape)
      shape.holes = holes.map((h) => toPath(h, x, THREE.Path))
      shapes.push(shape)
      x += Math.max(...outer.map((p) => p[0])) + GAP
    }
    const s = height / 5
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth / s, bevelEnabled: false })
    geo.translate(-(x - GAP) / 2, 0, -depth / s / 2)
    geo.scale(s, s, s)
    return geo
  }, [text, height, depth])

  return (
    <mesh geometry={geometry} castShadow {...props}>
      {material}
      {outline}
    </mesh>
  )
}
