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

// Axis a round item lies along, from its placed size: the side matching its length.
function cylinderAxis(p: Placement, item: Item): 'x' | 'y' | 'z' {
  if (Math.abs(p.dy - item.height) < 1e-6) return 'y'
  if (Math.abs(p.dx - item.height) < 1e-6) return 'x'
  return 'z'
}

const Q_Y = new THREE.Quaternion()
const Q_X = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
const Q_Z = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)

const capacityFor = (n: number) => Math.max(64, 2 ** Math.ceil(Math.log2(n + 1)))

// All items render as two instanced meshes (boxes, round items) plus one merged line
// geometry for box outlines, so a full container of a couple of thousand units stays at
// a handful of draw calls.
function PlacedBoxes({ placements, byId }: { placements: Placement[]; byId: Map<string, Item> }) {
  const boxRef = useRef<THREE.InstancedMesh>(null)
  const cylRef = useRef<THREE.InstancedMesh>(null)
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const cabinRef = useRef<THREE.InstancedMesh>(null)
  const wheelRef = useRef<THREE.InstancedMesh>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  // Placement indices per shape; instance i of a mesh maps back through these.
  const { boxIdx, cylIdx, carIdx } = useMemo(() => {
    const boxIdx: number[] = []
    const cylIdx: number[] = []
    const carIdx: number[] = []
    placements.forEach((p, i) => {
      const shape = byId.get(p.itemId)?.shape
      ;(shape === 'cylinder' ? cylIdx : shape === 'car' ? carIdx : boxIdx).push(i)
    })
    return { boxIdx, cylIdx, carIdx }
  }, [placements, byId])
  // Capacity only grows in steps, so meshes aren't recreated on every small edit.
  const boxCap = capacityFor(boxIdx.length)
  const cylCap = capacityFor(cylIdx.length)
  const carCap = capacityFor(carIdx.length)

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const scale = new THREE.Vector3()
    const color = new THREE.Color()
    // Inset slightly so neighbouring units read as separate objects.
    const inset = (v: number) => Math.max(v * M - 0.01, v * M * 0.98)

    const box = boxRef.current
    if (box) {
      boxIdx.forEach((pi, i) => {
        const p = placements[pi]
        pos.set((p.x + p.dx / 2) * M, (p.y + p.dy / 2) * M, (p.z + p.dz / 2) * M)
        m.compose(pos, Q_Y, scale.set(inset(p.dx), inset(p.dy), inset(p.dz)))
        box.setMatrixAt(i, m)
        box.setColorAt(i, color.set(byId.get(p.itemId)?.color ?? '#999999'))
      })
      box.count = boxIdx.length
      box.instanceMatrix.needsUpdate = true
      if (box.instanceColor) box.instanceColor.needsUpdate = true
      box.computeBoundingSphere()
    }

    const cyl = cylRef.current
    if (cyl) {
      cylIdx.forEach((pi, i) => {
        const p = placements[pi]
        const item = byId.get(p.itemId)!
        const axis = cylinderAxis(p, item)
        pos.set((p.x + p.dx / 2) * M, (p.y + p.dy / 2) * M, (p.z + p.dz / 2) * M)
        // The unit cylinder's axis is local y; scale (radial, axis, radial) then rotate.
        if (axis === 'y') m.compose(pos, Q_Y, scale.set(inset(p.dx), inset(p.dy), inset(p.dz)))
        else if (axis === 'x') m.compose(pos, Q_X, scale.set(inset(p.dy), inset(p.dx), inset(p.dz)))
        else m.compose(pos, Q_Z, scale.set(inset(p.dx), inset(p.dz), inset(p.dy)))
        cyl.setMatrixAt(i, m)
        cyl.setColorAt(i, color.set(item.color))
      })
      cyl.count = cylIdx.length
      cyl.instanceMatrix.needsUpdate = true
      if (cyl.instanceColor) cyl.instanceColor.needsUpdate = true
      cyl.computeBoundingSphere()
    }

    const body = bodyRef.current
    const cabin = cabinRef.current
    const wheels = wheelRef.current
    if (body && cabin && wheels) {
      const dark = new THREE.Color('#0b1220')
      const tyre = new THREE.Color('#111418')
      carIdx.forEach((pi, i) => {
        const p = placements[pi]
        const item = byId.get(p.itemId)!
        // Cars only turn about the vertical axis; find which way the bonnet points.
        const alongX = Math.abs(p.dx - item.length) < 1e-6 || p.dx >= p.dz
        const len = (alongX ? p.dx : p.dz) * M
        const wid = (alongX ? p.dz : p.dx) * M
        const h = p.dy * M
        const cx = (p.x + p.dx / 2) * M
        const cz = (p.z + p.dz / 2) * M
        const y0 = p.y * M
        // Place a part given offsets and size in the car's own frame (length, up, width).
        const part = (mesh: THREE.InstancedMesh, at: number, ol: number, oy: number, ow: number, sl: number, sy: number, sw: number, q = Q_Y) => {
          pos.set(cx + (alongX ? ol : ow), y0 + oy, cz + (alongX ? ow : ol))
          scale.set(alongX ? sl : sw, sy, alongX ? sw : sl)
          mesh.setMatrixAt(at, m.compose(pos, q, scale))
        }
        color.set(item.color)
        part(body, i, 0, h * 0.35, 0, len * 0.98, h * 0.46, wid * 0.98)
        body.setColorAt(i, color)
        part(cabin, i, -len * 0.04, h * 0.79, 0, len * 0.5, h * 0.42, wid * 0.86)
        cabin.setColorAt(i, color.clone().lerp(dark, 0.55))
        // Wheels: unit cylinder turned so its axis runs across the car.
        const r = Math.min(h * 0.22, len * 0.08)
        const q = alongX ? Q_Z : Q_X
        let w = i * 4
        for (const sl of [-1, 1])
          for (const sw of [-1, 1]) {
            const ol = sl * len * 0.33
            const ow = sw * (wid / 2 - wid * 0.07)
            pos.set(cx + (alongX ? ol : ow), y0 + r, cz + (alongX ? ow : ol))
            scale.set(r * 2, wid * 0.12, r * 2)
            wheels.setMatrixAt(w, m.compose(pos, q, scale))
            wheels.setColorAt(w, tyre)
            w++
          }
      })
      for (const mesh of [body, cabin]) mesh.count = carIdx.length
      wheels.count = carIdx.length * 4
      for (const mesh of [body, cabin, wheels]) {
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        mesh.computeBoundingSphere()
      }
    }
  }, [placements, byId, boxIdx, cylIdx, carIdx, boxCap, cylCap, carCap])

  const edges = useMemo(() => {
    const pos = new Float32Array(boxIdx.length * 24 * 3)
    let o = 0
    for (const pi of boxIdx) {
      const p = placements[pi]
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
  }, [placements, boxIdx])
  useEffect(() => () => edges.dispose(), [edges])

  const hoverHandlers = (idx: number[], perPlacement = 1) => ({
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (e.instanceId === undefined) return
      const pi = idx[Math.floor(e.instanceId / perPlacement)]
      if (pi !== hovered) setHovered(pi)
    },
    onPointerOut: () => setHovered(null),
  })

  const hp = hovered !== null ? placements[hovered] : undefined
  const hItem = hp && byId.get(hp.itemId)

  return (
    <>
      <instancedMesh key={`b${boxCap}`} ref={boxRef} args={[undefined, undefined, boxCap]} {...hoverHandlers(boxIdx)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh key={`c${cylCap}`} ref={cylRef} args={[undefined, undefined, cylCap]} {...hoverHandlers(cylIdx)}>
        <cylinderGeometry args={[0.5, 0.5, 1, 28]} />
        <meshStandardMaterial />
      </instancedMesh>
      <instancedMesh key={`cb${carCap}`} ref={bodyRef} args={[undefined, undefined, carCap]} {...hoverHandlers(carIdx)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.3} roughness={0.45} />
      </instancedMesh>
      <instancedMesh key={`cc${carCap}`} ref={cabinRef} args={[undefined, undefined, carCap]} {...hoverHandlers(carIdx)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.5} roughness={0.2} />
      </instancedMesh>
      <instancedMesh key={`cw${carCap}`} ref={wheelRef} args={[undefined, undefined, carCap * 4]} {...hoverHandlers(carIdx, 4)}>
        <cylinderGeometry args={[0.5, 0.5, 1, 20]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#000000" transparent opacity={0.3} />
      </lineSegments>
      {hp && hItem && (
        <mesh position={[(hp.x + hp.dx / 2) * M, (hp.y + hp.dy / 2) * M, (hp.z + hp.dz / 2) * M]} raycast={() => null}>
          <boxGeometry args={[hp.dx * M + 0.01, hp.dy * M + 0.01, hp.dz * M + 0.01]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={hItem.shape && hItem.shape !== 'box' ? 0.12 : 0.25} depthWrite={false} />
          <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div className="rounded-md bg-slate-900/90 px-2 py-1 text-xs whitespace-nowrap text-slate-100 shadow-lg">
              <div className="font-medium">
                {hItem.name} #{hp.unit}
              </div>
              <div className="text-slate-400">
                {hItem.shape === 'cylinder'
                  ? `Ø${hItem.length} × ${hItem.height} cm`
                  : `${hItem.length}×${hItem.width}×${hItem.height} cm`}
              </div>
            </div>
          </Html>
        </mesh>
      )}
    </>
  )
}
