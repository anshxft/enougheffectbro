import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { storyProgress } from './input'

// Big words bent onto the dome wall, each sweeping in from the right, past the glass A and out to
// the left as the interlude scrolls by ("Built on Arc", then the works). Each word owns a window of
// story progress; inside it the word turns around the dome's centre and fades in and out.
const WORDS = ['BUILT', 'ON ARC', 'WORKS']
const FIRST = 0.1 // story progress where the first word starts
const STEP = 0.25 // start-to-start spacing
const SPAN = 0.38 // how long each word takes to cross; the last one is gone by 0.98, before progress clamps at 1
const PIVOT = new THREE.Vector3(0, 0, 2) // dome centre
const DEPTH = 7 // distance from the pivot to the words
const SWEEP = 0.95 // radians either side of centre
const FONT = '/fonts/archivo-expanded-800.ttf'
const COLOR = new THREE.Color(0.62, 0.63, 0.65)

type TroikaText = THREE.Mesh & { fillOpacity: number; curveRadius: number }

function Word({ text, index }: { text: string; index: number }) {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<TroikaText>(null)
  const { viewport, camera } = useThree()
  const vp = viewport.getCurrentViewport(camera, [0, 0, PIVOT.z - DEPTH])
  const size = Math.min((vp.width * 0.78) / (text.length * 0.95), vp.height * 0.42)

  useFrame(() => {
    const g = group.current
    const m = mesh.current
    if (!g || !m) return
    // troika supports curved text; drei's typings just don't expose the prop.
    // Positive radius = concave, hugging the inside of the dome.
    if (m.curveRadius !== DEPTH) m.curveRadius = DEPTH
    const u = (storyProgress() - (FIRST + index * STEP)) / SPAN
    const on = u > 0 && u < 1
    g.visible = on
    if (!on) return
    g.rotation.y = THREE.MathUtils.lerp(-SWEEP, SWEEP, u) // right to left
    m.fillOpacity = Math.sin(u * Math.PI) ** 1.5
  })

  return (
    <group ref={group} position={PIVOT} visible={false}>
      <Text
        ref={mesh}
        font={FONT}
        fontSize={size}
        letterSpacing={-0.01}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, -DEPTH]}
        fillOpacity={0}
      >
        {text}
        <meshBasicMaterial attach="material" color={COLOR} toneMapped={false} transparent depthWrite={false} />
      </Text>
    </group>
  )
}

export default function Story() {
  return (
    <>
      {WORDS.map((w, i) => (
        <Word key={w} text={w} index={i} />
      ))}
    </>
  )
}
