import { Suspense, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { SketchMaterial } from './sketch/SketchMaterial'
import { SketchOutline } from './sketch/SketchOutline'
import { SketchShadow } from './sketch/SketchShadow'
import { PaperPlane } from './sketch/PaperPlane'
import { RevealEffect } from './sketch/RevealEffect'
import { SketchModel } from './SketchModel'
import { Gravestone } from './Gravestone'
import { BlockText } from './BlockText'
import { CameraRig } from './CameraRig'
import { Header } from './Header'
import { Credits } from './Credits'
import { Loader } from './Loader'
import { useSketchControls, TOOLS } from './useSketchControls'
import cameraSettings from './camera-settings.json'

// the camera starts where the intro does, already looking at its point of interest
const INTRO_START = cameraSettings.intro.points[0]

const toRadians = (degrees) => degrees.map(THREE.MathUtils.degToRad)

export default function App() {
  const [washed, setWashed] = useState(false)
  const [c, setTool] = useSketchControls(setWashed)
  // switching tools washes the drawing out, swaps the tool while the page is blank, then redraws
  const [toolSwitch, setToolSwitch] = useState(null)   // { tool, phase: 'out' | 'in' }
  const [sceneReady, setSceneReady] = useState(false)
  const [loaderHidden, setLoaderHidden] = useState(false)

  const light = useMemo(() => {
    const a = THREE.MathUtils.degToRad(c.lightAngle)
    return new THREE.Vector3(Math.cos(a) * 0.85, c.lightHeight, Math.sin(a) * 0.85).normalize()
  }, [c.lightAngle, c.lightHeight])

  // the same pen and paper for every object; only the ink color differs
  const material = (color) => (
    <SketchMaterial
      color={color} paper={c.paper} light={light} density={c.density} pressure={c.pressure} loops={c.loops}
      width={c.width} tooth={c.tooth} angle={THREE.MathUtils.degToRad(c.angle)} seed={c.seed}
    />
  )
  const outline = (color) => c.outline && (
    <SketchOutline color={color} width={c.outlineWidth} opacity={c.outlineOpacity} jitter={c.jitter} seed={c.seed} />
  )

  const switchTool = (tool) => {
    if (tool === c.tool || toolSwitch) return
    if (washed || c.toolSwitchDuration === 0) setTool(tool)   // nothing on the page to animate
    else setToolSwitch({ tool, phase: 'out' })
  }
  const onRevealSettled = (value) => {
    if (!toolSwitch) return
    if (toolSwitch.phase === 'out' && value === 0) {
      setTool(toolSwitch.tool)
      setToolSwitch({ ...toolSwitch, phase: 'in' })
    } else {
      setToolSwitch(null)   // redrawn, or interrupted by the Wash out button
    }
  }

  return (
    <>
      <Canvas
        flat
        shadows="percentage"
        camera={{ position: INTRO_START.position, fov: 35 }}
        onCreated={({ camera }) => camera.lookAt(...INTRO_START.target)}
      >
        <color attach="background" args={[c.paper]} />
        <directionalLight
          castShadow position={light.clone().multiplyScalar(8)} shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8}
        />
        <RevealEffect
          washed={washed || toolSwitch?.phase === 'out'}
          duration={toolSwitch ? c.toolSwitchDuration / 2 : c.effectDuration}
          easing={c.effectEasing} sweep={c.effectSweep} scale={c.effectScale} edge={c.effectEdge} wet={c.effectWet}
          shadow={c.effectShadow} paper={c.effectPaper} lines={c.effectLines}
          onSettled={onRevealSettled}
        />

        <Suspense fallback={null}>
          <SketchModel url="/car.glb" material={material(c.carInk)} outline={outline(c.carInk)} />
          <Gravestone
            material={material(c.graveInk)} outline={outline(c.graveInk)}
            position={c.gravePosition} rotation={toRadians(c.graveRotation)} scale={c.graveScale}
          />
          {/* inside the Suspense so it only mounts (and reports ready) once the scene has loaded */}
          <CameraRig onReady={() => setSceneReady(true)} start={loaderHidden} />
        </Suspense>
        <BlockText
          text="Three JS" material={material(c.nameInk)} outline={outline(c.nameInk)}
          position={c.namePosition} rotation={toRadians(c.nameRotation)} scale={c.nameScale}
        />

        {c.sheet && (
          <Suspense fallback={null}>
            <PaperPlane
              y={-0.05} tint={c.sheetTint} strength={c.sheetStrength} contrast={c.sheetContrast}
              repeat={c.sheetRepeat} rotation={THREE.MathUtils.degToRad(c.sheetRotation)} size={c.sheetSize} fade={c.sheetFade}
            />
          </Suspense>
        )}
        {c.shadow && (
          <SketchShadow
            y={-0.04} color={c.shadowInk} density={c.shadowDensity} loops={c.shadowLoops}
            width={c.shadowWidth} opacity={c.shadowOpacity} seed={c.seed}
          />
        )}
      </Canvas>

      <Header />
      <div className="bottom-bar">
        <div className="tool-group" role="group" aria-label="Drawing tool">
          {Object.keys(TOOLS).map((tool) => (
            <button
              key={tool} type="button" className="tool-button"
              aria-pressed={(toolSwitch?.tool ?? c.tool) === tool} onClick={() => switchTool(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
        <button type="button" className="effect-button" onClick={() => setWashed((w) => !w)}>
          {washed ? 'Reveal' : 'Wash out'}
        </button>
      </div>
      <div className="leva-wrap">
        <Leva fill collapsed />
      </div>
      <Credits />
      <Loader ready={sceneReady} onHidden={() => setLoaderHidden(true)} />
    </>
  )
}
