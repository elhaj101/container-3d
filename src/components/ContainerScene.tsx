import { Edges, Grid, Html, OrbitControls } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
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
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
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
        <MeterMarks L={L} W={W} H={H} />
        <PlacedBoxes placements={placements} byId={byId} />
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

const meterSteps = (len: number) => Array.from({ length: Math.ceil(len - 0.001) - 1 }, (_, i) => i + 1)

// A 1 m reference grid on the container's inner faces, with labelled ticks along one
// edge per axis, so sizes and remaining space can be read straight off the 3D view.
function MeterMarks({ L, W, H }: { L: number; W: number; H: number }) {
  const { grid, ticks } = useMemo(() => {
    const g: number[] = []
    const t: number[] = []
    const seg = (a: number[], b: number[], out = g) => out.push(...a, ...b)
    const T = 0.12 // tick length, pointing out of the container

    for (const x of meterSteps(L)) {
      // Ring around the container at this length.
      seg([x, 0, 0], [x, 0, W]); seg([x, H, 0], [x, H, W])
      seg([x, 0, 0], [x, H, 0]); seg([x, 0, W], [x, H, W])
      seg([x, 0, W], [x, 0, W + T], t)
    }
    for (const y of meterSteps(H)) {
      seg([0, y, 0], [L, y, 0]); seg([0, y, W], [L, y, W])
      seg([0, y, 0], [0, y, W]); seg([L, y, 0], [L, y, W])
      seg([0, y, W], [-T, y, W], t)
    }
    for (const z of meterSteps(W)) {
      seg([0, 0, z], [L, 0, z]); seg([0, H, z], [L, H, z])
      seg([0, 0, z], [0, H, z]); seg([L, 0, z], [L, H, z])
      seg([L, 0, z], [L + T, 0, z], t)
    }
    const geo = (arr: number[]) => {
      const bg = new THREE.BufferGeometry()
      bg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
      return bg
    }
    return { grid: geo(g), ticks: geo(t) }
  }, [L, W, H])
  useEffect(
    () => () => {
      grid.dispose()
      ticks.dispose()
    },
    [grid, ticks],
  )

  const label = (text: string, position: [number, number, number]) => (
    <Html key={`${text}-${position.join()}`} position={position} center style={{ pointerEvents: 'none' }}>
      <span className="text-[10px] whitespace-nowrap text-slate-400 tabular-nums">{text}</span>
    </Html>
  )

  return (
    <group>
      <lineSegments geometry={grid} raycast={() => null}>
        <lineBasicMaterial color="#8aa4c8" transparent opacity={0.16} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={ticks} raycast={() => null}>
        <lineBasicMaterial color="#cbd5e1" />
      </lineSegments>
      {meterSteps(L).map((x) => label(`${x} m`, [x, 0, W + 0.3]))}
      {meterSteps(H).map((y) => label(`${y} m`, [-0.3, y, W]))}
      {meterSteps(W).map((z) => label(`${z} m`, [L + 0.3, 0, z]))}
    </group>
  )
}

// All boxes render as one instanced mesh plus one merged line geometry for the outlines,
// so a full container of a couple of thousand cartons stays at two draw calls.
function PlacedBoxes({ placements, byId }: { placements: Placement[]; byId: Map<string, Item> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  // Capacity only grows, so the InstancedMesh isn't recreated on every small edit.
  const capacity = useMemo(() => Math.max(64, 2 ** Math.ceil(Math.log2(placements.length + 1))), [placements.length])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const color = new THREE.Color()
    placements.forEach((p, i) => {
      // Inset slightly so neighbouring boxes read as separate objects.
      const sx = Math.max(p.dx * M - 0.01, p.dx * M * 0.98)
      const sy = Math.max(p.dy * M - 0.01, p.dy * M * 0.98)
      const sz = Math.max(p.dz * M - 0.01, p.dz * M * 0.98)
      m.makeScale(sx, sy, sz).setPosition((p.x + p.dx / 2) * M, (p.y + p.dy / 2) * M, (p.z + p.dz / 2) * M)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, color.set(byId.get(p.itemId)?.color ?? '#999999'))
    })
    mesh.count = placements.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [placements, byId, capacity])

  const edges = useMemo(() => {
    const pos = new Float32Array(placements.length * 24 * 3)
    let o = 0
    for (const p of placements) {
      const x0 = p.x * M, x1 = (p.x + p.dx) * M
      const y0 = p.y * M, y1 = (p.y + p.dy) * M
      const z0 = p.z * M, z1 = (p.z + p.dz) * M
      const c = [
        [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
        [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
      ]
      for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) {
        pos.set(c[a], o)
        pos.set(c[b], o + 3)
        o += 6
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [placements])
  useEffect(() => () => edges.dispose(), [edges])

  const hp = hovered !== null ? placements[hovered] : undefined
  const hItem = hp && byId.get(hp.itemId)

  return (
    <>
      <instancedMesh
        key={capacity}
        ref={meshRef}
        args={[undefined, undefined, capacity]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          if (e.instanceId !== undefined && e.instanceId !== hovered) setHovered(e.instanceId)
        }}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#000000" transparent opacity={0.3} />
      </lineSegments>
      {hp && hItem && (
        <mesh position={[(hp.x + hp.dx / 2) * M, (hp.y + hp.dy / 2) * M, (hp.z + hp.dz / 2) * M]} raycast={() => null}>
          <boxGeometry args={[hp.dx * M + 0.01, hp.dy * M + 0.01, hp.dz * M + 0.01]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
          <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div className="rounded-md bg-slate-900/90 px-2 py-1 text-xs whitespace-nowrap text-slate-100 shadow-lg">
              <div className="font-medium">
                {hItem.name} #{hp.unit}
              </div>
              <div className="text-slate-400">
                {hItem.length}×{hItem.width}×{hItem.height} cm
              </div>
            </div>
          </Html>
        </mesh>
      )}
    </>
  )
}
