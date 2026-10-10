import { useMemo } from 'react'
import * as THREE from 'three'
import { BlockText } from './BlockText'

// A simple headstone: a two-step plinth, an arched tablet with chamfered edges and raised
// block-letter "RIP". About 1.75 tall, stands on y = 0, faces +z.

const PLINTH = [
  { size: [1.25, 0.18, 0.62], y: 0.09 },
  { size: [1.05, 0.1, 0.48], y: 0.23 },
]
const TABLET_BASE = 0.28
const TABLET_W = 0.9
const TABLET_SIDE = 1.0    // height of the straight sides before the arch
const TABLET_DEPTH = 0.16
const TABLET_BEVEL = 0.025

// tablet outline: straight sides and a low-poly round top
function tabletShape() {
  const r = TABLET_W / 2
  const shape = new THREE.Shape()
  shape.moveTo(-r, 0)
  shape.lineTo(r, 0)
  shape.lineTo(r, TABLET_SIDE)
  const steps = 6
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI
    shape.lineTo(r * Math.cos(a), TABLET_SIDE + r * Math.sin(a))
  }
  shape.closePath()
  return shape
}

function buildParts() {
  const plinth = PLINTH.map(({ size, y }) => ({ geometry: new THREE.BoxGeometry(...size), position: [0, y, 0] }))
  const depth = TABLET_DEPTH - TABLET_BEVEL * 2
  const tablet = new THREE.ExtrudeGeometry(tabletShape(), {
    depth, bevelEnabled: true, bevelThickness: TABLET_BEVEL, bevelSize: TABLET_BEVEL, bevelSegments: 1,
  }).translate(0, 0, -depth / 2)
  return { plinth, tablet }
}

/** The headstone, with every part redrawn using the given material and outline elements. */
export function Gravestone({ material, outline, ...props }) {
  const { plinth, tablet } = useMemo(buildParts, [])
  return (
    <group {...props}>
      {plinth.map((p, i) => (
        <mesh key={i} geometry={p.geometry} position={p.position} castShadow>
          {material}
          {outline}
        </mesh>
      ))}
      {/* the tablet leans back a touch, as if set by hand; the lettering sits proud of its face */}
      <group position={[0, TABLET_BASE, 0]} rotation={[-0.05, 0, 0.02]}>
        <mesh geometry={tablet} castShadow>
          {material}
          {outline}
        </mesh>
        <BlockText
          text="RIP" height={0.26} depth={0.04} position={[0, 0.82, TABLET_DEPTH / 2 + 0.005]}
          material={material} outline={outline}
        />
      </group>
    </group>
  )
}
