# R3F Sketch Material

A hand-drawn ballpoint look for React Three Fiber. Any mesh gets scribbled hatching that follows
the light, wobbly pen outlines that overshoot the corners, and a hatched cast shadow, all drawn
in the shader with no textures or post-processing.

**[Live demo](https://r3f-sketch-material.vercel.app)**

<img width="1917" height="906" alt="image" src="https://github.com/user-attachments/assets/6039313b-25f8-45d7-b3e9-044a2d25d85e" />


## Features

- **Scribble hatching** that builds up the way you'd shade by hand: sparse strokes in the light,
  denser in the mid-tones, a second direction in the shadows
- **Pen outlines**: a silhouette plus a few jittered, overshooting passes over every hard edge
- **Hatched shadows** drawn on an invisible ground plane
- **Wash out / reveal**: the drawing dissolves in watery blotches and draws itself back in
- **Pen presets**: ballpoint, marker, pencil and thin pen, with an animated switch between them
- **Camera intro** along a set of waypoints, gentle cursor parallax and zoom limits
- Every setting is exposed in a [leva](https://github.com/pmndrs/leva) panel

## Getting started

```bash
npm install
npm run dev
```

## Using the material

Drop the material and outline inside any mesh, and add the shadow plane to the scene:

```jsx
import { SketchMaterial } from './sketch/SketchMaterial'
import { SketchOutline } from './sketch/SketchOutline'
import { SketchShadow } from './sketch/SketchShadow'

<Canvas shadows flat>
  <directionalLight castShadow position={[-5, 8, 4.5]} />

  <mesh castShadow>
    <boxGeometry />
    <SketchMaterial color="#101A91" density={22} pressure={0.7} />
    <SketchOutline color="#101A91" width={1.7} />
  </mesh>

  <SketchShadow />
</Canvas>
```

## How it works

- **Hatching** (`src/sketch/glsl.js`): the surface is split into bands. Inside each band the pen
  sweeps back and forth in a zig-zag, and some of the turnarounds curl into small loops. The
  pattern is projected triplanar in object space, so it sticks to the model at any scale.
- **Outlines** (`src/sketch/SketchOutline.jsx`): an inverted hull pushed out a few pixels for the
  silhouette, plus edge strokes built from `EdgesGeometry` with a seeded wobble.
- **Shadows** (`src/sketch/SketchShadow.jsx`): a patched `ShadowMaterial` that draws scribbles
  wherever the shadow map says the ground is in shadow.
- **Wash effect** (`src/sketch/reveal.js`): one shared uniform drives every material, so the
  hatching, shadow and paper creases all wash out together.

## Project structure

```
src/
  sketch/            the reusable material, outline, shadow, paper and wash effect
  CameraRig.jsx      intro animation, orbit controls, cursor movement
  useSketchControls.js   leva controls and pen presets
  camera-settings.json   the intro route (export a new one from the Camera panel)
  BlockText.jsx      extruded block letters
  Gravestone.jsx     procedural headstone
```

## Credits

- Car by Quaternius [CC-BY](https://creativecommons.org/licenses/by/3.0/) via [Poly Pizza](https://poly.pizza/m/HQ0hvRM2XR)
- Paper texture generated with ChatGPT
- Built with [three.js](https://threejs.org), [React Three Fiber](https://github.com/pmndrs/react-three-fiber),
  [drei](https://github.com/pmndrs/drei), [leva](https://github.com/pmndrs/leva) and [react-icons](https://react-icons.github.io/react-icons/)

## License

Code is [MIT](LICENSE) © Abhishek Verma. The car model is licensed separately under CC-BY (see Credits).
