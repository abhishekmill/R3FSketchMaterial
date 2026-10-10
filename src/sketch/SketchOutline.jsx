import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { INK } from './SketchMaterial'
import { revealUniforms } from './reveal'

// Overlapping passes over each hard edge, as a hand goes over a line a few times. Width and
// opacity scale the outline settings; overshoot is a [min, max] fraction of the edge length.
const PASSES = [
  { width: 1.0, opacity: 1.0, wobble: 1.0, overshoot: [0.03, 0.13] },
  { width: 0.85, opacity: 0.85, wobble: 1.3, overshoot: [0.0, 0.09] },
  { width: 0.75, opacity: 0.7, wobble: 1.6, overshoot: [-0.02, 0.07] },
]
const SAMPLES = 28   // points per stroke

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Silhouette: the mesh pushed out a few pixels along its normals and drawn back-faces only.
function buildHull(geometry) {
  const g = geometry.clone()
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  const merged = mergeVertices(g)   // shared corners give smooth normals, so the hull doesn't split
  merged.computeVertexNormals()
  return merged
}

// Hard edges: each one redrawn as a few wobbly passes that overshoot the corners.
function buildEdgeStrokes(geometry, jitter, seed) {
  const edges = new THREE.EdgesGeometry(geometry, 30).attributes.position.array
  if (!edges.length) return []
  geometry.computeBoundingSphere()
  const { center, radius } = geometry.boundingSphere
  const random = mulberry32(seed * 9973 + 17)
  const between = ([min, max]) => min + (max - min) * random()

  return PASSES.map((pass) => {
    const points = []
    for (let i = 0; i < edges.length; i += 6) {
      const a = new THREE.Vector3().fromArray(edges, i)
      const b = new THREE.Vector3().fromArray(edges, i + 3)
      const len = a.distanceTo(b)
      const d = b.clone().sub(a).normalize()
      // wobble across the edge, but always lean outward so the stroke never sinks into a face
      const out = a.clone().add(b).multiplyScalar(0.5).sub(center)
      out.addScaledVector(d, -out.dot(d)).normalize()
      const side = new THREE.Vector3().crossVectors(d, out)
      const start = a.clone().addScaledVector(d, -between(pass.overshoot) * len)
      const end = b.clone().addScaledVector(d, between(pass.overshoot) * len)
      const amplitude = jitter * Math.min(len, radius) * 0.8 * pass.wobble   // scales with the edge it redraws
      const phase = [random(), random(), random()].map((v) => v * Math.PI * 2)
      const bow = (random() - 0.5) * 1.2
      const shift = random() - 0.5
      let prev = null
      for (let k = 0; k < SAMPLES; k++) {
        const t = k / (SAMPLES - 1)
        const w = bow * Math.sin(Math.PI * t) + 0.3 * Math.sin(t * 8.2 + phase[0]) + 0.12 * Math.sin(t * 19 + phase[1]) + shift
        const lift = 0.2 + 0.15 * Math.sin(t * 7.1 + phase[2])
        const p = start.clone().lerp(end, t)
          .addScaledVector(side, w * amplitude)
          .addScaledVector(out, (Math.abs(w) + lift) * amplitude)
        if (prev) points.push(prev, p)
        prev = p
      }
    }
    return { ...pass, points }
  })
}

const hullMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  transparent: true,
  uniforms: {
    uInk: { value: new THREE.Color(INK) },
    uOpacity: { value: 0.85 },
    uWidth: { value: 1.7 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    uniform float uWidth; uniform vec2 uRes;
    void main() {
      vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec2 dir = normalize((projectionMatrix * vec4(normalMatrix * normal, 0.0)).xy + 1e-6);
      float press = 0.75 + 0.25 * sin(dot(position, vec3(13.1, 17.7, 11.3)));   // uneven pen pressure
      clip.xy += dir * uWidth * press / uRes * 2.0 * clip.w;
      gl_Position = clip;
    }`,
  fragmentShader: `
    uniform vec3 uInk; uniform float uOpacity;
    void main() {
      gl_FragColor = vec4(uInk, uOpacity);
      #include <colorspace_fragment>
    }`,
})

/** Put inside a mesh, after its geometry: draws the mesh's outline in pen. */
export function SketchOutline({ color = INK, width = 1.7, opacity = 0.85, jitter = 0.018, seed = 1 }) {
  const ref = useRef()
  const [geometry, setGeometry] = useState(null)
  const { size, viewport } = useThree()

  useLayoutEffect(() => setGeometry(ref.current.parent.geometry), [])

  const hull = useMemo(() => geometry && buildHull(geometry), [geometry])
  const strokes = useMemo(() => (geometry ? buildEdgeStrokes(geometry, jitter, seed) : []), [geometry, jitter, seed])
  const material = useMemo(() => hullMaterial.clone(), [])

  material.uniforms.uInk.value.set(color)
  material.uniforms.uOpacity.value = opacity
  material.uniforms.uWidth.value = width * viewport.dpr
  material.uniforms.uRes.value.set(size.width * viewport.dpr, size.height * viewport.dpr)

  // the wash-out effect fades the lines too: last on the way out, first on the way back
  const lines = useRef([])
  useFrame(() => {
    const k = revealUniforms.uRevealLines.value ? THREE.MathUtils.smoothstep(revealUniforms.uReveal.value, 0, 0.5) : 1
    ref.current.visible = k > 0.001
    material.uniforms.uOpacity.value = opacity * k
    strokes.forEach((s, i) => { if (lines.current[i]) lines.current[i].material.opacity = opacity * s.opacity * k })
  })

  return (
    <group ref={ref}>
      {hull && <mesh geometry={hull} material={material} raycast={() => null} />}
      {strokes.map((s, i) => (
        <Line
          key={i} ref={(l) => (lines.current[i] = l)} points={s.points} segments
          color={color} lineWidth={width * s.width} transparent opacity={opacity * s.opacity}
        />
      ))}
    </group>
  )
}
