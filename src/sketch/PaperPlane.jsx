import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { PAPER } from './SketchMaterial'
import { sketchGLSL } from './glsl'
import { revealGLSL, revealUniforms } from './reveal'

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`

const fragmentShader = `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uStrength, uContrast, uRepeat, uRotation, uFade, uWhite, uAspect;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${sketchGLSL}
  ${revealGLSL}
  void main() {
    float c = cos(uRotation), s = sin(uRotation);
    vec2 uv = mat2(c, -s, s, c) * (vUv - 0.5) * vec2(1.0, uAspect) * uRepeat + 0.5;   // keep the texture's proportions
    // the texture's creases and grain as a brightness multiplier around 1.0, relative to its average
    float l = dot(texture2D(uMap, uv).rgb, vec3(0.2126, 0.7152, 0.0722)) / uWhite;
    float strength = uStrength * mix(1.0, sk_reveal(vWorld).x, uRevealPaper);   // the creases wash out with the ink
    float shade = mix(1.0, (l - 1.0) * uContrast + 1.0, strength);
    // fade the sheet's edges into the background
    vec2 e = abs(vUv - 0.5) * 2.0;
    float alpha = 1.0 - smoothstep(1.0 - uFade, 1.0, max(e.x, e.y));
    gl_FragColor = vec4(uTint * shade, alpha);
    #include <colorspace_fragment>
  }`

// Average brightness of an image in linear space, so creases read relative to the paper's own tone
// (a cream paper shouldn't come out darker than the flat background around it).
function averageLuminance(image) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, 32, 32)
  const px = ctx.getImageData(0, 0, 32, 32).data
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  let sum = 0
  for (let i = 0; i < px.length; i += 4) sum += 0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2])
  return sum / (px.length / 4)
}

/** A sheet of textured paper lying flat on the ground. */
export function PaperPlane({ texture = '/paper.webp', y = 0, size = 12, tint = PAPER, strength = 1, contrast = 1,
                             repeat = 1, rotation = 0, fade = 0.35 }) {
  const map = useTexture(texture)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping   // the texture isn't tileable; mirroring hides the seams
  map.anisotropy = 8
  const white = useMemo(() => averageLuminance(map.image), [map])

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: null }, uTint: { value: new THREE.Color() }, uStrength: { value: 1 }, uContrast: { value: 1 },
      uRepeat: { value: 1 }, uRotation: { value: 0 }, uFade: { value: 0.35 }, uWhite: { value: 0.9 }, uAspect: { value: 1 },
      ...revealUniforms,
    },
    vertexShader,
    fragmentShader,
  }), [])

  const u = material.uniforms
  u.uMap.value = map
  u.uWhite.value = white
  u.uAspect.value = map.image.width / map.image.height
  u.uTint.value.set(tint)
  u.uStrength.value = strength
  u.uContrast.value = contrast
  u.uRepeat.value = repeat
  u.uRotation.value = rotation
  u.uFade.value = fade

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} material={material} renderOrder={-1}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
