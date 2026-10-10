import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EASINGS } from '../easings'
import { revealUniforms as U } from './reveal'

/**
 * Animates the shared reveal uniform: towards 0 when `washed`, back to 1 otherwise. Renders nothing.
 * onSettled(0 | 1) is called when the animation reaches its end.
 */
export function RevealEffect({ washed, duration = 2, easing = 'ease in-out', scale = 1.2, edge = 0.15,
                               sweep = 0.35, wet = 0.6, shadow = true, paper = true, lines = true, onSettled }) {
  const progress = useRef(1)

  U.uRevealScale.value = scale
  U.uRevealEdge.value = edge
  U.uRevealSweep.value = sweep
  U.uRevealWet.value = wet
  U.uRevealShadow.value = shadow ? 1 : 0
  U.uRevealPaper.value = paper ? 1 : 0
  U.uRevealLines.value = lines ? 1 : 0

  useFrame((_, delta) => {
    const target = washed ? 0 : 1
    if (progress.current === target) return
    const step = Math.min(delta, 1 / 30) / duration
    progress.current = target > progress.current
      ? Math.min(progress.current + step, 1)
      : Math.max(progress.current - step, 0)
    U.uReveal.value = EASINGS[easing](progress.current)
    if (progress.current === target) onSettled?.(target)
  })

  return null
}
