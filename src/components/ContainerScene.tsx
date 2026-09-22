import { Edges, Grid, Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import type { ContainerDims, Item, Placement } from '../lib/types'

// Scene units are metres; the packer works in centimetres.
const M = 0.01

interface Props {
  container: ContainerDims
  items: Item[]
  placements: Placement[]
  usedLength: number
}

export function ContainerScene({ container, items, placements, usedLength }: Props) {
  const L = container.length * M
  const W = container.width * M
  const H = container.height * M
  const span = Math.max(L, W, H)
  const byId = new Map(items.map((i) => [i.id, i]))
  const freeLength = L - usedLength * M

  return (
    <Canvas
      camera={{ position: [span * 0.8, span * 0.55, span * 0.9], fov: 45, near: 0.1, far: 500 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0f1115']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} />
      <directionalLight position={[-10, 8, -6]} intensity={0.4} />

      {/* Shift so the container is centred on the origin. */}
      <group position={[-L / 2, 0, -W / 2]}>
        <ContainerShell L={L} W={W} H={H} />
        {placements.map((p) => (
          <PlacedBox key={`${p.itemId}-${p.unit}`} placement={p} item={byId.get(p.itemId)} />
        ))}
        {freeLength > 0.01 && (
          <mesh position={[usedLength * M + freeLength / 2, H / 2, W / 2]}>
            <boxGeometry args={[freeLength, H, W]} />
            <meshBasicMaterial color="#4ade80" transparent opacity={0.07} depthWrite={false} />
            <Edges color="#4ade80" transparent opacity={0.5} />
          </mesh>
        )}
      </group>

      <Grid
        args={[60, 60]}
        cellSize={0.5}
        sectionSize={2.5}
        cellColor="#1f2530"
        sectionColor="#2c3545"
        fadeDistance={span * 3}
        position={[0, -0.001, 0]}
        infiniteGrid
      />
      <OrbitControls makeDefault target={[0, H / 3, 0]} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  )
}

function ContainerShell({ L, W, H }: { L: number; W: number; H: number }) {
  return (
    <group>
      {/* Floor */}
      <mesh position={[L / 2, -0.005, W / 2]}>
        <boxGeometry args={[L, 0.01, W]} />
        <meshStandardMaterial color="#3b3228" />
      </mesh>
      {/* Walls: translucent so the cargo stays visible from any angle. */}
      <mesh position={[L / 2, H / 2, W / 2]}>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#8aa4c8" transparent opacity={0.06} depthWrite={false} />
        <Edges color="#8aa4c8" />
      </mesh>
      {/* Door end marker */}
      <Html position={[L + 0.2, H, W / 2]} center style={{ pointerEvents: 'none' }}>
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-slate-300">
          doors
        </span>
      </Html>
    </group>
  )
}

function PlacedBox({ placement: p, item }: { placement: Placement; item?: Item }) {
  const [hovered, setHovered] = useState(false)
  const size: [number, number, number] = [p.dx * M, p.dy * M, p.dz * M]
  // Inset slightly so neighbouring boxes read as separate objects.
  const inset = size.map((s) => Math.max(s - 0.01, s * 0.98)) as [number, number, number]

  return (
    <mesh
      position={[(p.x + p.dx / 2) * M, (p.y + p.dy / 2) * M, (p.z + p.dz / 2) * M]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={inset} />
      <meshStandardMaterial color={item?.color ?? '#999'} emissive={hovered ? '#ffffff' : '#000000'} emissiveIntensity={hovered ? 0.25 : 0} />
      <Edges color="#000000" transparent opacity={0.35} />
      {hovered && item && (
        <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="rounded-md bg-slate-900/90 px-2 py-1 text-xs whitespace-nowrap text-slate-100 shadow-lg">
            <div className="font-medium">
              {item.name} #{p.unit}
            </div>
            <div className="text-slate-400">
              {item.length}×{item.width}×{item.height} cm
            </div>
          </div>
        </Html>
      )}
    </mesh>
  )
}
