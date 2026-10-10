import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import { sketchGLSL } from './glsl'
import { revealGLSL, revealUniforms } from './reveal'

export const INK = '#101A91'
export const PAPER = '#F3F1EC'
// default light: 138° around, high in front and to the left
export const LIGHT = new THREE.Vector3(-0.63, 1, 0.57).normalize()

const SketchMaterialImpl = shaderMaterial(
  { uInk: new THREE.Color(INK), uPaper: new THREE.Color(PAPER), uLight: LIGHT.clone(),
    uDensity: 22, uPressure: 0.7, uLoops: 0.55, uWidth: 1, uTooth: 0.25, uAngle: 0.6, uDpr: 1, uSeed: 1,
    ...Object.fromEntries(Object.entries(revealUniforms).map(([k, u]) => [k, u.value])) },
  /* vertex */ `
    varying vec3 vObj; varying vec3 vN; varying vec3 vWN; varying vec3 vWorld;
    void main() {
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      // object space, but at world size, so stroke spacing doesn't depend on how a model was authored
      vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
      vObj = position * scale; vN = normal;
      vWN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  /* fragment */ `
    uniform vec3 uInk, uPaper, uLight;
    uniform float uDensity, uPressure, uLoops, uWidth, uTooth, uAngle, uDpr, uSeed;
    varying vec3 vObj; varying vec3 vN; varying vec3 vWN; varying vec3 vWorld;
    ${sketchGLSL}
    ${revealGLSL}

    float faceHatch(vec2 p, float dark, float seed) {
      float angle = uAngle + (sk_hash(vec2(seed, 7.0)) - 0.5) * 0.9;
      return sk_hatch(p, dark, uDensity, angle, uLoops, uWidth * uDpr, uPressure, seed);
    }
    void main() {
      vec3 n = normalize(vN);
      vec3 tw = pow(abs(n), vec3(8.0)); tw /= dot(tw, vec3(1.0));   // triplanar weights
      float dark = clamp(1.0 - max(dot(normalize(vWN), uLight), 0.0) * 1.05 + 0.08, 0.0, 1.0);
      float ink = tw.x * faceHatch(vObj.zy, dark, uSeed)
                + tw.y * faceHatch(vObj.xz, dark, uSeed + 7.0)
                + tw.z * faceHatch(vObj.xy, dark, uSeed + 13.0);
      ink *= sk_tooth(gl_FragCoord.xy, uDpr, uTooth);
      vec2 reveal = sk_reveal(vWorld);
      ink *= reveal.x * reveal.y;
      gl_FragColor = vec4(uPaper * mix(vec3(1.0), uInk, clamp(ink, 0.0, 1.0)), 1.0);
      #include <colorspace_fragment>
    }`
)
extend({ SketchMaterialImpl })

// swap in the shared effect uniforms so one animation drives every instance
const shareReveal = (m) => m && Object.assign(m.uniforms, revealUniforms)

export function SketchMaterial({ color = INK, paper = PAPER, light = LIGHT, density = 22, pressure = 0.7, loops = 0.55,
                                width = 1, tooth = 0.25, angle = 0.6, seed = 1, ...props }) {
  const dpr = useThree((s) => s.viewport.dpr)
  return (
    <sketchMaterialImpl
      uInk={color} uPaper={paper} uLight={light} uDensity={density} uPressure={pressure} uLoops={loops}
      uWidth={width} uTooth={tooth} uAngle={angle} uSeed={seed} uDpr={dpr}
      // keeps the surface just behind the outline strokes drawn on its edges
      polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1}
      ref={shareReveal}
      {...props}
    />
  )
}
