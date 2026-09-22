import { describe, expect, it } from 'vitest'
import { pack } from './packer'
import { CAR_PRESETS, carItem, CONTAINER_PRESETS } from './presets'
import type { Item, Placement } from './types'

function item(overrides: Partial<Item>): Item {
  return {
    id: 'a',
    name: 'Box',
    length: 10,
    width: 10,
    height: 10,
    quantity: 1,
    keepUpright: false,
    color: '#000',
    ...overrides,
  }
}

function overlap(a: Placement, b: Placement) {
  const o = (p: number, pl: number, q: number, ql: number) => p < q + ql && q < p + pl
  return o(a.x, a.dx, b.x, b.dx) && o(a.y, a.dy, b.y, b.dy) && o(a.z, a.dz, b.z, b.dz)
}

function assertValid(placements: Placement[], L: number, W: number, H: number) {
  for (const p of placements) {
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.z).toBeGreaterThanOrEqual(0)
    expect(p.x + p.dx).toBeLessThanOrEqual(L + 1e-6)
    expect(p.y + p.dy).toBeLessThanOrEqual(H + 1e-6)
    expect(p.z + p.dz).toBeLessThanOrEqual(W + 1e-6)
  }
  for (let i = 0; i < placements.length; i++)
    for (let j = i + 1; j < placements.length; j++)
      expect(overlap(placements[i], placements[j])).toBe(false)
}

describe('pack', () => {
  it('fills a container exactly with unit cubes', () => {
    const res = pack({ length: 20, width: 20, height: 20 }, [item({ quantity: 8 })])
    expect(res.placements).toHaveLength(8)
    expect(res.unplaced).toEqual({})
    expect(res.usedVolume).toBe(res.containerVolume)
    assertValid(res.placements, 20, 20, 20)
  })

  it('reports items that do not fit', () => {
    const res = pack({ length: 20, width: 20, height: 20 }, [item({ quantity: 9 })])
    expect(res.placements).toHaveLength(8)
    expect(res.unplaced).toEqual({ a: 1 })
  })

  it('rotates an item to make it fit', () => {
    const res = pack({ length: 50, width: 50, height: 20 }, [
      item({ length: 10, width: 10, height: 40 }),
    ])
    expect(res.placements).toHaveLength(1)
    expect(res.placements[0].dy).toBe(10)
  })

  it('never tips an item marked keep upright', () => {
    const res = pack({ length: 50, width: 50, height: 20 }, [
      item({ length: 10, width: 10, height: 40, keepUpright: true }),
    ])
    expect(res.placements).toHaveLength(0)
    expect(res.unplaced).toEqual({ a: 1 })
  })

  it('does not stack boxes in mid-air', () => {
    const res = pack({ length: 100, width: 100, height: 100 }, [
      item({ id: 'big', length: 50, width: 50, height: 50, quantity: 1 }),
      item({ id: 'small', length: 10, width: 10, height: 10, quantity: 30 }),
    ])
    for (const p of res.placements) {
      if (p.y === 0) continue
      const support = res.placements.some(
        (q) =>
          q.y + q.dy === p.y &&
          q.x < p.x + p.dx &&
          p.x < q.x + q.dx &&
          q.z < p.z + p.dz &&
          p.z < q.z + q.dz,
      )
      expect(support).toBe(true)
    }
    assertValid(res.placements, 100, 100, 100)
  })

  it('packs a realistic mixed load into a 20ft container without overlaps', () => {
    const L = 589
    const W = 235
    const H = 239
    const res = pack({ length: L, width: W, height: H }, [
      item({ id: 'pallet', length: 120, width: 80, height: 144, quantity: 6, keepUpright: true }),
      item({ id: 'bike', length: 180, width: 60, height: 110, quantity: 4 }),
      item({ id: 'box', length: 60, width: 40, height: 40, quantity: 60 }),
      item({ id: 'fridge', length: 70, width: 70, height: 180, quantity: 2, keepUpright: true }),
    ])
    assertValid(res.placements, L, W, H)
    expect(res.placements.length).toBe(72)
  })

  it('ignores items with zero quantity or zero size', () => {
    const res = pack({ length: 20, width: 20, height: 20 }, [
      item({ id: 'a', quantity: 0 }),
      item({ id: 'b', length: 0 }),
    ])
    expect(res.placements).toHaveLength(0)
    expect(res.unplaced).toEqual({})
  })
})

describe('pack — freight options', () => {
  it('keeps the requested spacing between units and half of it from the walls', () => {
    const res = pack({ length: 60, width: 20, height: 10 }, [item({ gap: 10, quantity: 5 })])
    expect(res.placements).toHaveLength(3)
    expect(res.placements.map((p) => p.x).sort((a, b) => a - b)).toEqual([5, 25, 45])
    expect(res.placements.every((p) => p.z === 5 && p.dx === 10 && p.dz === 10)).toBe(true)
    expect(res.unplaced).toEqual({ a: 2 })
  })

  it('never puts anything on top of a non-stackable item', () => {
    const res = pack({ length: 10, width: 10, height: 30 }, [item({ stackable: false, quantity: 3 })])
    expect(res.placements).toHaveLength(1)
  })

  it('stops loading at the payload limit and says why', () => {
    const res = pack({ length: 100, width: 100, height: 100, maxPayload: 50 }, [
      item({ weightKg: 20, quantity: 4 }),
    ])
    expect(res.placements).toHaveLength(2)
    expect(res.totalWeight).toBe(40)
    expect(res.overweight).toEqual({ a: 2 })
  })

  it('loads sequence 1 at the back and never tucks later sequences behind it', () => {
    const res = pack({ length: 100, width: 100, height: 100 }, [
      item({ id: 'late', length: 50, width: 50, height: 50, sequence: 2 }),
      item({ id: 'early', length: 20, width: 20, height: 20, quantity: 3, sequence: 1 }),
    ])
    const early = res.placements.filter((p) => p.itemId === 'early')
    const late = res.placements.find((p) => p.itemId === 'late')!
    const earlyFront = Math.max(...early.map((p) => p.x + p.dx))
    expect(late.x).toBeGreaterThanOrEqual(earlyFront)
  })

  it('keeps floor-only items on the floor, even when they are small', () => {
    const res = pack({ length: 20, width: 10, height: 30 }, [
      item({ id: 'big', length: 10, width: 10, height: 10, quantity: 3 }),
      item({ id: 'heavy', length: 10, width: 10, height: 5, quantity: 2, floorOnly: true }),
    ])
    const heavy = res.placements.filter((p) => p.itemId === 'heavy')
    expect(heavy).toHaveLength(2)
    expect(heavy.every((p) => p.y === 0)).toBe(true)
  })

  it('leaves floor-only items out rather than stacking them', () => {
    const res = pack({ length: 10, width: 10, height: 30 }, [item({ floorOnly: true, quantity: 2 })])
    expect(res.placements).toHaveLength(1)
    expect(res.unplaced).toEqual({ a: 1 })
  })

  it('loads cars upright, on the floor, one row per container width', () => {
    const corolla = CAR_PRESETS[0]
    const car = { ...item({ id: 'car', quantity: 3 }), ...carItem({ ...corolla, name: 'Corolla' }) }
    const twenty = pack(CONTAINER_PRESETS[0], [car])
    expect(twenty.placements).toHaveLength(1)
    const forty = pack(CONTAINER_PRESETS[1], [car])
    expect(forty.placements).toHaveLength(2)
    expect(forty.placements.every((p) => p.y === 0 && p.dy === corolla.height)).toBe(true)
  })
})
