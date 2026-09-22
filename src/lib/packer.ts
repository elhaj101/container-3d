import type { ContainerDims, Item, PackResult, Placement } from './types'

// Extreme-point heuristic (Crainic, Perboli & Tadei, 2008), first-fit decreasing by
// volume. Every item is treated as an axis-aligned bounding box. Candidate positions
// ("extreme points") are the corners created by each placed box, projected back onto
// the nearest wall or box so new boxes sit snugly. Boxes need a stable base: at least
// MIN_SUPPORT of their footprint must rest on the floor or on other boxes.

const MIN_SUPPORT = 0.75
const EPS = 1e-6

interface Point {
  x: number
  y: number
  z: number
}

type Size = [dx: number, dy: number, dz: number]

function orientations(item: Item): Size[] {
  const { length: l, width: w, height: h } = item
  const all: Size[] = item.keepUpright
    ? [
        [l, h, w],
        [w, h, l],
      ]
    : [
        [l, h, w],
        [w, h, l],
        [l, w, h],
        [h, w, l],
        [w, l, h],
        [h, l, w],
      ]
  // Drop duplicate orientations (cubes, square footprints).
  const seen = new Set<string>()
  return all.filter((s) => {
    const key = s.join('x')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function overlaps1d(a: number, alen: number, b: number, blen: number) {
  return a < b + blen - EPS && b < a + alen - EPS
}

function collides(p: Point, s: Size, placed: Placement[]) {
  for (const b of placed) {
    if (
      overlaps1d(p.x, s[0], b.x, b.dx) &&
      overlaps1d(p.y, s[1], b.y, b.dy) &&
      overlaps1d(p.z, s[2], b.z, b.dz)
    ) {
      return true
    }
  }
  return false
}

function overlapLen(a: number, alen: number, b: number, blen: number) {
  return Math.max(0, Math.min(a + alen, b + blen) - Math.max(a, b))
}

function supportRatio(p: Point, s: Size, placed: Placement[]) {
  if (p.y < EPS) return 1
  let area = 0
  for (const b of placed) {
    if (Math.abs(b.y + b.dy - p.y) > EPS) continue
    area += overlapLen(p.x, s[0], b.x, b.dx) * overlapLen(p.z, s[2], b.z, b.dz)
  }
  return area / (s[0] * s[2])
}

// Slide a point toward the origin along one axis until it meets a box face or a wall.
function project(p: Point, axis: 'x' | 'y' | 'z', placed: Placement[]): Point {
  let best = 0
  for (const b of placed) {
    let face: number
    let hit: boolean
    if (axis === 'x') {
      face = b.x + b.dx
      hit = p.y >= b.y - EPS && p.y < b.y + b.dy - EPS && p.z >= b.z - EPS && p.z < b.z + b.dz - EPS
    } else if (axis === 'y') {
      face = b.y + b.dy
      hit = p.x >= b.x - EPS && p.x < b.x + b.dx - EPS && p.z >= b.z - EPS && p.z < b.z + b.dz - EPS
    } else {
      face = b.z + b.dz
      hit = p.x >= b.x - EPS && p.x < b.x + b.dx - EPS && p.y >= b.y - EPS && p.y < b.y + b.dy - EPS
    }
    if (hit && face <= p[axis] + EPS && face > best) best = face
  }
  return { ...p, [axis]: best }
}

function newExtremePoints(b: Placement, placed: Placement[]): Point[] {
  const corners: [Point, ('x' | 'y' | 'z')[]][] = [
    [{ x: b.x + b.dx, y: b.y, z: b.z }, ['y', 'z']],
    [{ x: b.x, y: b.y + b.dy, z: b.z }, ['x', 'z']],
    [{ x: b.x, y: b.y, z: b.z + b.dz }, ['x', 'y']],
  ]
  const out: Point[] = []
  for (const [corner, axes] of corners) {
    out.push(corner)
    for (const axis of axes) out.push(project(corner, axis, placed))
  }
  return out
}

function pointKey(p: Point) {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
}

// Lower is better: fill from the back wall, floor first, then across the width.
function compare(a: Point & { s: Size }, b: Point & { s: Size }) {
  return a.x - b.x || a.y - b.y || a.z - b.z || a.x + a.s[0] - (b.x + b.s[0])
}

export function pack(container: ContainerDims, items: Item[]): PackResult {
  const units = items
    .filter((it) => it.length > 0 && it.width > 0 && it.height > 0)
    .flatMap((item) =>
      Array.from({ length: Math.max(0, Math.floor(item.quantity)) }, (_, i) => ({
        item,
        unit: i + 1,
      })),
    )
    .sort(
      (a, b) =>
        b.item.length * b.item.width * b.item.height -
          a.item.length * a.item.width * a.item.height ||
        Math.max(b.item.length, b.item.width, b.item.height) -
          Math.max(a.item.length, a.item.width, a.item.height),
    )

  const placed: Placement[] = []
  const unplaced: Record<string, number> = {}
  let points: Point[] = [{ x: 0, y: 0, z: 0 }]
  const { length: L, width: W, height: H } = container

  for (const { item, unit } of units) {
    let best: (Point & { s: Size }) | null = null

    for (const s of orientations(item)) {
      for (const p of points) {
        if (p.x + s[0] > L + EPS || p.y + s[1] > H + EPS || p.z + s[2] > W + EPS) continue
        const candidate = { ...p, s }
        if (best && compare(candidate, best) >= 0) continue
        if (collides(p, s, placed)) continue
        if (supportRatio(p, s, placed) < MIN_SUPPORT) continue
        best = candidate
      }
    }

    if (!best) {
      unplaced[item.id] = (unplaced[item.id] ?? 0) + 1
      continue
    }

    const placement: Placement = {
      itemId: item.id,
      unit,
      x: best.x,
      y: best.y,
      z: best.z,
      dx: best.s[0],
      dy: best.s[1],
      dz: best.s[2],
    }
    placed.push(placement)

    const keyed = new Map<string, Point>()
    for (const p of [...points, ...newExtremePoints(placement, placed)]) {
      if (p.x >= L - EPS || p.y >= H - EPS || p.z >= W - EPS) continue
      // Drop points that now sit inside a placed box.
      if (collides(p, [EPS * 10, EPS * 10, EPS * 10], placed)) continue
      keyed.set(pointKey(p), p)
    }
    points = [...keyed.values()]
  }

  const usedVolume = placed.reduce((sum, b) => sum + b.dx * b.dy * b.dz, 0)
  return {
    placements: placed,
    unplaced,
    containerVolume: L * W * H,
    usedVolume,
    usedLength: placed.reduce((m, b) => Math.max(m, b.x + b.dx), 0),
  }
}
