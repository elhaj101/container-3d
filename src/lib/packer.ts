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

function collides(p: Point, s: Size, placed: Iterable<Placement>) {
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

// Uniform grid over placed boxes so collision and support queries only scan neighbours.
const CELL = 50

class BoxGrid {
  private cells = new Map<number, Placement[]>()

  private static key(ix: number, iy: number, iz: number) {
    return ix + iy * 1024 + iz * 1048576
  }

  private range(p: Point, s: Size) {
    return [
      Math.floor(p.x / CELL),
      Math.floor((p.x + s[0] - EPS) / CELL),
      Math.floor(p.y / CELL),
      Math.floor((p.y + s[1] - EPS) / CELL),
      Math.floor(p.z / CELL),
      Math.floor((p.z + s[2] - EPS) / CELL),
    ]
  }

  add(b: Placement) {
    const [x0, x1, y0, y1, z0, z1] = this.range(b, [b.dx, b.dy, b.dz])
    for (let ix = x0; ix <= x1; ix++)
      for (let iy = y0; iy <= y1; iy++)
        for (let iz = z0; iz <= z1; iz++) {
          const k = BoxGrid.key(ix, iy, iz)
          const cell = this.cells.get(k)
          if (cell) cell.push(b)
          else this.cells.set(k, [b])
        }
  }

  /** Boxes whose cells overlap the region (may include duplicates and near misses). */
  near(p: Point, s: Size): Set<Placement> {
    const out = new Set<Placement>()
    const [x0, x1, y0, y1, z0, z1] = this.range(p, s)
    for (let ix = x0; ix <= x1; ix++)
      for (let iy = y0; iy <= y1; iy++)
        for (let iz = z0; iz <= z1; iz++) {
          const cell = this.cells.get(BoxGrid.key(ix, iy, iz))
          if (cell) for (const b of cell) out.add(b)
        }
    return out
  }
}

function overlapLen(a: number, alen: number, b: number, blen: number) {
  return Math.max(0, Math.min(a + alen, b + blen) - Math.max(a, b))
}

// Internal box: the footprint reserved for a unit, including its spacing.
interface Box extends Placement {
  stackable: boolean
  gap: number
}

function supportRatio(p: Point, s: Size, placed: Iterable<Placement>) {
  if (p.y < EPS) return 1
  let area = 0
  for (const b of placed) {
    if (Math.abs(b.y + b.dy - p.y) > EPS) continue
    if ((b as Box).stackable === false) continue
    area += overlapLen(p.x, s[0], b.x, b.dx) * overlapLen(p.z, s[2], b.z, b.dz)
  }
  return area / (s[0] * s[2])
}

// Slide a point toward the origin along one axis until it meets a box face or a wall.
function project(p: Point, axis: 'x' | 'y' | 'z', placed: Iterable<Placement>): Point {
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

function newExtremePoints(b: Placement, grid: BoxGrid): Point[] {
  const corners: [Point, ('x' | 'y' | 'z')[]][] = [
    [{ x: b.x + b.dx, y: b.y, z: b.z }, ['y', 'z']],
    [{ x: b.x, y: b.y + b.dy, z: b.z }, ['x', 'z']],
    [{ x: b.x, y: b.y, z: b.z + b.dz }, ['x', 'y']],
  ]
  const out: Point[] = []
  for (const [corner, axes] of corners) {
    out.push(corner)
    for (const axis of axes) {
      // Only boxes along the line from the corner back to the wall can stop it.
      const from = { ...corner, [axis]: 0 }
      const size: Size = [EPS * 10, EPS * 10, EPS * 10]
      size['xyz'.indexOf(axis)] = Math.max(corner[axis], EPS * 10)
      out.push(project(corner, axis, grid.near(from, size)))
    }
  }
  return out
}

function pointKey(p: Point) {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
}

const byPreference = (a: Point, b: Point) => a.x - b.x || a.y - b.y || a.z - b.z

function insertSorted(points: Point[], p: Point) {
  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (byPreference(points[mid], p) < 0) lo = mid + 1
    else hi = mid
  }
  points.splice(lo, 0, p)
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
        (a.item.sequence ?? 1) - (b.item.sequence ?? 1) ||
        // Floor-only items claim floor space before anything can cover it.
        Number(b.item.floorOnly ?? false) - Number(a.item.floorOnly ?? false) ||
        b.item.length * b.item.width * b.item.height -
          a.item.length * a.item.width * a.item.height ||
        Math.max(b.item.length, b.item.width, b.item.height) -
          Math.max(a.item.length, a.item.width, a.item.height),
    )

  const placed: Box[] = []
  const grid = new BoxGrid()
  const unplaced: Record<string, number> = {}
  const overweight: Record<string, number> = {}
  const tooBigForDoor: Record<string, number> = {}
  const doorW = container.doorWidth || Infinity
  const doorH = container.doorHeight || Infinity
  const maxPayload = container.maxPayload && container.maxPayload > 0 ? container.maxPayload : Infinity
  let totalWeight = 0
  let points: Point[] = [{ x: 0, y: 0, z: 0 }]
  const pointKeys = new Set([pointKey(points[0])])
  const { length: L, width: W, height: H } = container

  let lastFailedItem: string | null = null
  // Each load sequence starts in front of everything loaded before it, so an earlier
  // stop's cargo is never buried behind a later one's.
  let currentSequence = -Infinity
  let minX = 0

  for (const { item, unit } of units) {
    // Units of one item are consecutive and nothing changes after a failure, so once
    // one unit doesn't fit, the rest of that item won't either.
    if (lastFailedItem === item.id) {
      unplaced[item.id] = (unplaced[item.id] ?? 0) + 1
      continue
    }
    const weight = Math.max(0, item.weightKg ?? 0)
    if (totalWeight + weight > maxPayload + EPS) {
      unplaced[item.id] = (unplaced[item.id] ?? 0) + 1
      overweight[item.id] = (overweight[item.id] ?? 0) + 1
      continue
    }
    const gap = Math.max(0, item.gap ?? 0)
    const sequence = item.sequence ?? 1
    if (sequence !== currentSequence) {
      if (placed.length) minX = placed.reduce((m, b) => Math.max(m, b.x + b.dx), 0)
      currentSequence = sequence
    }

    // Points are kept sorted in placement preference order, so the first point with any
    // valid orientation wins; among its orientations take the one reaching least far
    // toward the doors.
    let best: (Point & { s: Size }) | null = null
    // Spacing widens the reserved footprint; height is left alone so stacks stay in contact.
    // Units go in lengthwise through the doors, so their height × width must pass the opening.
    const insideFits = orientations(item).filter(([dx, dy, dz]) => dx <= L + EPS && dy <= H + EPS && dz <= W + EPS)
    const doorFits = insideFits.filter(([, dy, dz]) => dy <= doorH + EPS && dz <= doorW + EPS)
    if (insideFits.length > 0 && doorFits.length === 0) {
      unplaced[item.id] = (unplaced[item.id] ?? 0) + 1
      tooBigForDoor[item.id] = (tooBigForDoor[item.id] ?? 0) + 1
      continue
    }
    const sizes = doorFits.map(([dx, dy, dz]): Size => [dx + gap, dy, dz + gap])
    for (const p of points) {
      if (p.x < minX - EPS) continue
      if (item.floorOnly && p.y > EPS) continue
      for (const s of sizes) {
        if (p.x + s[0] > L + EPS || p.y + s[1] > H + EPS || p.z + s[2] > W + EPS) continue
        if (best && s[0] >= best.s[0]) continue
        if (collides(p, s, grid.near(p, s))) continue
        // Supporting boxes sit just below the footprint.
        if (p.y > EPS && supportRatio(p, s, grid.near({ ...p, y: p.y - 1 }, [s[0], 1, s[2]])) < MIN_SUPPORT) continue
        best = { ...p, s }
      }
      if (best) break
    }

    if (!best) {
      unplaced[item.id] = (unplaced[item.id] ?? 0) + 1
      lastFailedItem = item.id
      continue
    }
    lastFailedItem = null

    const placement: Box = {
      itemId: item.id,
      unit,
      x: best.x,
      y: best.y,
      z: best.z,
      dx: best.s[0],
      dy: best.s[1],
      dz: best.s[2],
      stackable: item.stackable !== false,
      gap,
    }
    placed.push(placement)
    totalWeight += weight
    grid.add(placement)

    // Only the new box can swallow an existing point; new points are checked against all.
    const tiny: Size = [EPS * 10, EPS * 10, EPS * 10]
    points = points.filter((p) => {
      if (!collides(p, tiny, [placement])) return true
      pointKeys.delete(pointKey(p))
      return false
    })
    for (const p of newExtremePoints(placement, grid)) {
      if (p.x >= L - EPS || p.y >= H - EPS || p.z >= W - EPS) continue
      const key = pointKey(p)
      if (pointKeys.has(key) || collides(p, tiny, grid.near(p, tiny))) continue
      pointKeys.add(key)
      insertSorted(points, p)
    }
  }

  // Report each unit's real size and position, centred in its reserved footprint.
  const placements: Placement[] = placed.map(({ itemId, unit, x, y, z, dx, dy, dz, gap }) => ({
    itemId,
    unit,
    x: x + gap / 2,
    y,
    z: z + gap / 2,
    dx: dx - gap,
    dy,
    dz: dz - gap,
  }))
  const usedVolume = placements.reduce((sum, b) => sum + b.dx * b.dy * b.dz, 0)
  return {
    placements,
    unplaced,
    overweight,
    tooBigForDoor,
    totalWeight,
    containerVolume: L * W * H,
    usedVolume,
    usedLength: placed.reduce((m, b) => Math.max(m, b.x + b.dx), 0),
  }
}
