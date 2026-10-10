import { useRef } from 'react'
import { useControls, folder, button } from 'leva'
import { EASINGS } from './easings'
import { INK, PAPER } from './sketch/SketchMaterial'

// Each drawing tool changes how a mark sits on paper, not just its color: `style` sets the
// hatching and outline controls, `color` is the ink it starts with and `inks` is its palette.
export const TOOLS = {
  ballpoint: {
    style: { width: 1.0, density: 22, loops: 0.55, tooth: 0.25, pressure: 0.7, outlineWidth: 1.7, outlineOpacity: 0.85, jitter: 0.018 },
    color: 'blue',
    inks: { blue: INK, red: '#B0132B', green: '#0E6B3A', black: '#1C1C24', yellow: '#C99A00' },
  },
  marker: {
    style: { width: 2.6, density: 9, loops: 0.2, tooth: 0.06, pressure: 0.45, outlineWidth: 3.4, outlineOpacity: 0.8, jitter: 0.013 },
    color: 'yellow',
    inks: { blue: '#1D4ED8', red: '#E0283A', green: '#16A34A', black: '#232326', yellow: '#E8B400' },
  },
  pencil: {
    style: { width: 1.5, density: 27, loops: 0.08, tooth: 0.7, pressure: 0.56, outlineWidth: 1.5, outlineOpacity: 0.8, jitter: 0.023 },
    color: 'black',
    inks: { blue: '#35549E', red: '#B23A44', green: '#3F7A4A', black: '#2A2A2E', yellow: '#B8922A' },
  },
  'thin pen': {
    style: { width: 0.6, density: 26, loops: 0.45, tooth: 0.2, pressure: 0.65, outlineWidth: 0.99, outlineOpacity: 0.9, jitter: 0.012 },
    color: 'blue',
    inks: { blue: INK, red: '#B0132B', green: '#0E6B3A', black: '#1C1C24', yellow: '#C99A00' },
  },
}
const COLORS = Object.keys(TOOLS.ballpoint.inks)

// the same ink for the shadow and every object
const inkFor = (tool, color) => {
  const ink = TOOLS[tool].inks[color]
  return { shadowInk: ink, carInk: ink, graveInk: ink, nameInk: ink }
}

/**
 * All the leva controls for the scene. Returns the values and a setter for the drawing tool
 * (used by the on-page buttons). `setWashed` is called by the Effect folder's buttons.
 */
export function useSketchControls(setWashed) {
  const setRef = useRef()

  const [controls, set] = useControls(() => ({
    Effect: folder({
      'wash out': button(() => setWashed(true)),
      reveal: button(() => setWashed(false)),
      effectDuration: { value: 2, min: 0.2, max: 10, step: 0.1, label: 'duration (s)' },
      effectEasing: { value: 'ease in-out', options: Object.keys(EASINGS), label: 'easing' },
      effectSweep: { value: 0.35, min: 0, max: 1, step: 0.01, label: 'blotches → rise' },
      effectScale: { value: 1.2, min: 0.2, max: 5, step: 0.05, label: 'pattern scale' },
      effectEdge: { value: 0.15, min: 0.01, max: 0.6, step: 0.01, label: 'edge softness' },
      effectWet: { value: 0.6, min: 0, max: 2, step: 0.05, label: 'wet edge' },
      effectShadow: { value: true, label: 'wash shadow' },
      effectPaper: { value: true, label: 'wash paper texture' },
      effectLines: { value: true, label: 'wash lines' },
      toolSwitchDuration: { value: 0.8, min: 0, max: 3, step: 0.05, label: 'tool switch (s)' },
    }, { collapsed: true }),
    Pen: folder({
      tool: {
        value: 'ballpoint',
        options: Object.keys(TOOLS),
        // switching tools also switches to that tool's ink (marker yellow, pencil black, ...)
        onChange: (tool, _, { initial }) => {
          if (initial) return
          const { style, color } = TOOLS[tool]
          setRef.current({ ...style, color, ...inkFor(tool, color) })
        },
        transient: false,
      },
      color: {
        value: 'blue',
        options: COLORS,
        onChange: (color, _, { initial, get }) => !initial && setRef.current(inkFor(get('Pen.tool'), color)),
        transient: false,
      },
      shadowInk: { value: INK, label: 'shadow ink' },
      paper: PAPER,
      seed: { value: 1, min: 1, max: 100, step: 1 },
      redraw: button((get) => setRef.current({ seed: (get('Pen.seed') % 100) + 1 })),
    }, { collapsed: true }),
    Hatching: folder({
      density: { value: 22, min: 5, max: 40, step: 1 },
      pressure: { value: 0.7, min: 0.1, max: 1.5, step: 0.01 },
      loops: { value: 0.55, min: 0, max: 1, step: 0.01 },
      width: { value: 1, min: 0.3, max: 4, step: 0.1, label: 'stroke width' },
      tooth: { value: 0.25, min: 0, max: 1, step: 0.01, label: 'paper tooth' },
      angle: { value: 34, min: 0, max: 180, step: 1, label: 'hatch angle°' },
    }, { collapsed: true }),
    Outline: folder({
      outline: { value: true, label: 'show' },
      outlineWidth: { value: 1.7, min: 0.5, max: 5, step: 0.01, label: 'width' },
      outlineOpacity: { value: 0.85, min: 0, max: 1, step: 0.01, label: 'opacity' },
      jitter: { value: 0.018, min: 0, max: 0.06, step: 0.001 },
    }, { collapsed: true }),
    Shadow: folder({
      shadow: { value: true, label: 'show' },
      shadowDensity: { value: 22, min: 5, max: 40, step: 1, label: 'density' },
      shadowLoops: { value: 0.33, min: 0, max: 1, step: 0.01, label: 'loops' },
      shadowWidth: { value: 0.9, min: 0.3, max: 4, step: 0.1, label: 'stroke width' },
      shadowOpacity: { value: 0.7, min: 0, max: 1, step: 0.01, label: 'opacity' },
    }, { collapsed: true }),
    'Paper sheet': folder({
      sheet: { value: true, label: 'show' },
      sheetTint: { value: PAPER, label: 'tint' },
      sheetStrength: { value: 1, min: 0, max: 1, step: 0.01, label: 'texture amount' },
      sheetContrast: { value: 1, min: 0, max: 4, step: 0.05, label: 'crease contrast' },
      sheetRepeat: { value: 1, min: 0.25, max: 6, step: 0.05, label: 'tiling' },
      sheetRotation: { value: 0, min: 0, max: 360, step: 1, label: 'rotation°' },
      sheetSize: { value: 12, min: 4, max: 40, step: 0.5, label: 'size' },
      sheetFade: { value: 0.35, min: 0, max: 1, step: 0.01, label: 'edge fade' },
    }, { collapsed: true }),
    Car: folder({
      carInk: { value: INK, label: 'ink' },
    }, { collapsed: true }),
    Gravestone: folder({
      graveInk: { value: INK, label: 'ink' },
      gravePosition: { value: [2.4, 0, -2.2], step: 0.05, label: 'offset' },
      graveRotation: { value: [0, 22, 0], step: 1, label: 'rotation°' },
      graveScale: { value: 1, min: 0.1, max: 4, step: 0.01, label: 'scale' },
    }, { collapsed: true }),
    Name: folder({
      nameInk: { value: INK, label: 'ink' },
      namePosition: { value: [2.8, 0, 2.4], step: 0.05, label: 'offset' },
      nameRotation: { value: [0, 40, 0], step: 1, label: 'rotation°' },
      nameScale: { value: 1, min: 0.1, max: 4, step: 0.01, label: 'scale' },
    }, { collapsed: true }),
    Light: folder({
      lightAngle: { value: 138, min: 0, max: 360, step: 1, label: 'angle°' },
      lightHeight: { value: 1, min: 0.2, max: 3, step: 0.05, label: 'height' },
    }, { collapsed: true }),
  }))
  setRef.current = set

  return [controls, (tool) => set({ tool })]
}
