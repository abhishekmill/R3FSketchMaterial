import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'

/** A glTF model with every mesh redrawn using the given material and outline elements. */
export function SketchModel({ url, material, outline, ...props }) {
  const { scene } = useGLTF(url)

  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true)
    const list = []
    scene.traverse((o) => o.isMesh && list.push(o))
    return list
  }, [scene])

  return (
    <group {...props}>
      {meshes.map((m) => (
        <mesh key={m.uuid} geometry={m.geometry} matrix={m.matrixWorld} matrixAutoUpdate={false} castShadow>
          {material}
          {outline}
        </mesh>
      ))}
    </group>
  )
}
