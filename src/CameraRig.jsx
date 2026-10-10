import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls, folder, button } from 'leva'
import { EASINGS } from './easings'
import settings from './camera-settings.json'

const SMOOTH = 'smooth curve'
const STRAIGHT = 'straight, ease at each point'

// Defaults for the end view and intro route. "export settings" downloads a file in the same
// format; replace src/camera-settings.json with it to make your edits the new defaults.
const POINTS = settings.intro.points

const round = (values) => values.map((n) => +n.toFixed(2))

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Orbit controls plus an intro move. On mount (once the scene has loaded) the camera holds at the
 * first waypoint and calls onReady; when `start` turns true it flies through the enabled waypoints
 * to the end view. Press W to log the current view.
 */
export function CameraRig({ start = true, onReady }) {
  const camera = useThree((s) => s.camera)
  const controls = useRef()
  const intro = useRef(null)   // { t, path } while the intro is playing
  const actions = useRef({})

  // offset added to the camera by cursor movement; left out of logged and saved views
  const cursor = useRef({ offset: new THREE.Vector3(), goal: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() })
  const currentView = () => ({
    position: round(camera.position.clone().sub(cursor.current.offset).toArray()),
    target: round(controls.current.target.toArray()),
  })

  const [c, set] = useControls('Camera', () => ({
    camPosition: { value: settings.end.position, step: 0.1, label: 'end position' },
    camTarget: { value: settings.end.target, step: 0.1, label: 'end point of interest' },
    'log view (W)': button(() => actions.current.log()),
    'use current view as end': button(() => {
      const view = currentView()
      set({ camPosition: view.position, camTarget: view.target })
    }),
    'export settings': button(() => actions.current.export()),
    Intro: folder({
      introDuration: { value: settings.intro.duration, min: 0.5, max: 30, step: 0.1, label: 'duration (s)' },
      introEasing: { value: settings.intro.easing, options: Object.keys(EASINGS), label: 'easing' },
      introPath: { value: settings.intro.path, options: [SMOOTH, STRAIGHT], label: 'path' },
      'play intro': button(() => actions.current.play()),
      ...Object.fromEntries(POINTS.map((p, i) => [`Point ${i + 1}`, folder({
        ...(i > 0 && { [`p${i}On`]: { value: p.use, label: 'use' } }),
        [`p${i}Position`]: { value: p.position, step: 0.1, label: 'position' },
        [`p${i}Target`]: { value: p.target, step: 0.1, label: 'point of interest' },
        [`set point ${i + 1} from view`]: button(() => {
          const view = currentView()
          set({ [`p${i}Position`]: view.position, [`p${i}Target`]: view.target })
        }),
      }, { collapsed: true })])),
    }),
  }), { render: () => false })   // hidden from the panel; switch to () => true to edit the camera route

  const nav = useControls('View', {
    zoomMin: { value: 5, min: 1, max: 20, step: 0.1, label: 'min zoom distance' },
    zoomMax: { value: 14, min: 2, max: 50, step: 0.5, label: 'max zoom distance' },
    cursorIntensity: { value: 0.4, min: 0, max: 2, step: 0.01, label: 'cursor intensity' },
    cursorSmoothing: { value: 3, min: 0.5, max: 12, step: 0.1, label: 'cursor follow speed' },
  }, { collapsed: true })

  // the route: enabled waypoints, then the end view
  const buildPath = () => {
    const stops = POINTS.map((_, i) => i).filter((i) => i === 0 || c[`p${i}On`])
    const positions = stops.map((i) => new THREE.Vector3().fromArray(c[`p${i}Position`]))
    const targets = stops.map((i) => new THREE.Vector3().fromArray(c[`p${i}Target`]))
    positions.push(new THREE.Vector3().fromArray(c.camPosition))
    targets.push(new THREE.Vector3().fromArray(c.camTarget))
    return {
      positions,
      targets,
      positionCurve: new THREE.CatmullRomCurve3(positions, false, 'centripetal'),
      targetCurve: new THREE.CatmullRomCurve3(targets, false, 'centripetal'),
    }
  }

  // place the camera at fraction k (0..1) of the route; each leg gets an equal share of the time
  const sample = (path, k) => {
    if (c.introPath === SMOOTH) {
      path.positionCurve.getPoint(k, camera.position)
      path.targetCurve.getPoint(k, controls.current.target)
      return
    }
    const legs = path.positions.length - 1
    const leg = Math.min(Math.floor(k * legs), legs - 1)
    const e = EASINGS['ease in-out'](k * legs - leg)
    camera.position.lerpVectors(path.positions[leg], path.positions[leg + 1], e)
    controls.current.target.lerpVectors(path.targets[leg], path.targets[leg + 1], e)
  }

  actions.current = {
    play() {
      cursor.current.offset.set(0, 0, 0)   // the path sets the camera position outright
      const path = buildPath()
      sample(path, 0)
      controls.current.enabled = false
      intro.current = { t: 0, path }
    },
    export() {
      const out = {
        end: { position: round(c.camPosition), target: round(c.camTarget) },
        intro: {
          duration: c.introDuration,
          easing: c.introEasing,
          path: c.introPath,
          points: POINTS.map((_, i) => ({
            use: i === 0 || c[`p${i}On`],
            position: round(c[`p${i}Position`]),
            target: round(c[`p${i}Target`]),
          })),
        },
      }
      // keep each [x, y, z] on one line, like src/camera-settings.json
      const json = JSON.stringify(out, null, 2).replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, list) => `[${list.split(/,\s*/).join(', ')}]`)
      download('camera-settings.json', json + '\n')
    },
    log() {
      const { position, target } = currentView()
      console.log(`camera position: [${position.join(', ')}]\npoint of interest: [${target.join(', ')}]`)
    },
  }

  // hold at the intro's first point from the first frame, then play once told to start
  useLayoutEffect(() => {
    sample(buildPath(), 0)
    controls.current.enabled = false
    onReady?.()
  }, [])
  useEffect(() => { if (start) actions.current.play() }, [start])

  // editing the end view moves the camera (unless the intro is playing)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    if (intro.current) return
    cursor.current.offset.set(0, 0, 0)
    camera.position.fromArray(c.camPosition)
    controls.current.target.fromArray(c.camTarget)
    controls.current.update()
  }, [c.camPosition, c.camTarget, camera])

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.key.toLowerCase() !== 'w' || e.target.closest?.('input, textarea')) return
      actions.current.log()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame(({ pointer }, delta) => {
    const ctl = controls.current
    const playing = intro.current
    if (playing) {
      // clamp so a slow first frame (shaders compiling) doesn't skip the start of the move
      playing.t = Math.min(playing.t + Math.min(delta, 1 / 30) / c.introDuration, 1)
      // the straight path eases each leg itself, so its overall progress stays linear
      sample(playing.path, c.introPath === SMOOTH ? EASINGS[c.introEasing](playing.t) : playing.t)
      ctl.update()
      if (playing.t === 1) {
        intro.current = null
        ctl.enabled = true
      }
    }

    // zoom limits only apply once the user has control, so they never squeeze the intro path
    ctl.minDistance = ctl.enabled ? nav.zoomMin : 0
    ctl.maxDistance = ctl.enabled ? Math.max(nav.zoomMax, nav.zoomMin) : Infinity

    // drift the camera across the screen plane towards the pointer; eases in from nothing
    // when control is handed over after the intro
    const m = cursor.current
    camera.position.sub(m.offset)
    m.goal.set(0, 0, 0)
    if (ctl.enabled) {
      m.right.setFromMatrixColumn(camera.matrixWorld, 0)
      m.up.setFromMatrixColumn(camera.matrixWorld, 1)
      m.goal
        .addScaledVector(m.right, pointer.x * nav.cursorIntensity)
        .addScaledVector(m.up, pointer.y * nav.cursorIntensity * 0.6)
    }
    m.offset.lerp(m.goal, 1 - Math.exp(-nav.cursorSmoothing * Math.min(delta, 0.1)))
    camera.position.add(m.offset)
    camera.lookAt(ctl.target)
  })

  // maxPolarAngle keeps the camera above the paper
  return <OrbitControls ref={controls} makeDefault maxPolarAngle={1.45} />
}
