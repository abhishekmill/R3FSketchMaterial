import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

const FADE_MS = 600   // matches the .loader opacity transition

/**
 * White screen with a black progress line. Shows download progress, but only fades out once
 * `ready` is true (the scene is mounted and the camera is in place) and nothing is still loading;
 * onHidden fires after the fade.
 */
export function Loader({ ready, onHidden }) {
  const { active, progress } = useProgress()
  const [gone, setGone] = useState(false)
  const done = ready && !active   // scene mounted and nothing (e.g. the paper texture) still loading

  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => { setGone(true); onHidden?.() }, FADE_MS)
    return () => clearTimeout(id)
  }, [done])

  if (gone) return null
  return (
    <div
      className={`loader${done ? ' loader--done' : ''}`}
      role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
    >
      <div className="loader-track">
        <div className="loader-line" style={{ transform: `scaleX(${done ? 1 : progress / 100})` }} />
      </div>
    </div>
  )
}
