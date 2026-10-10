import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { sketchGLSL } from './glsl'
import { revealGLSL, revealUniforms } from './reveal'
import { INK } from './SketchMaterial'

/** An invisible ground plane that shows only the shadows cast on it, scribbled in pen. */
export function SketchShadow({ y = 0, size = 30, color = INK, density = 22, loops = 0.33, width = 0.9, opacity = 0.7, seed = 1 }) {
  const dpr = useThree((s) => s.viewport.dpr)

  const material = useMemo(() => {
    const m = new THREE.ShadowMaterial({ color, transparent: true })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, revealUniforms)
      shader.vertexShader = 'varying vec3 vWorld;\n' + shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      )
      shader.fragmentShader = 'varying vec3 vWorld;\n' + sketchGLSL + revealGLSL + shader.fragmentShader.replace(
        'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
        `float shade = 1.0 - getShadowMask();
         float ink = sk_scribble(vWorld.xz, -0.26, 0.6 / ${density.toFixed(1)}, 0.55, ${loops.toFixed(2)}, ${(dpr * width).toFixed(2)}, ${seed.toFixed(1)});
         ink *= sk_tooth(gl_FragCoord.xy, ${dpr.toFixed(2)}, 0.25);
         vec2 reveal = sk_reveal(vWorld);
         ink *= mix(1.0, reveal.x * reveal.y, uRevealShadow);
         gl_FragColor = vec4(color, opacity * ink * shade);`
      )
    }
    // the values are baked into the shader, so each combination needs its own program
    m.customProgramCacheKey = () => `sketch-shadow-${density}-${loops}-${width}-${dpr}-${seed}`
    return m
  }, [color, density, loops, width, dpr, seed])
  useEffect(() => () => material.dispose(), [material])
  material.opacity = opacity

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} material={material} receiveShadow>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
