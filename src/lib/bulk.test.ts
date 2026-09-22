import { describe, expect, it } from 'vitest'
import { parseBulk } from './bulk'

describe('parseBulk', () => {
  it('reads comma-separated rows and skips a header', () => {
    const { entries, errors } = parseBulk('name,length,width,height,qty\nBox A, 40, 30, 30, 5\nCrate,100,80,60,2')
    expect(errors).toEqual([])
    expect(entries).toEqual([
      { preset: { name: 'Box A', length: 40, width: 30, height: 30, keepUpright: false }, quantity: 5 },
      { preset: { name: 'Crate', length: 100, width: 80, height: 60, keepUpright: false }, quantity: 2 },
    ])
  })

  it('reads tab-separated spreadsheet paste', () => {
    const { entries } = parseBulk('Pallet\t120\t80\t144\t3')
    expect(entries[0]).toMatchObject({ preset: { name: 'Pallet', length: 120 }, quantity: 3 })
  })

  it('reads LxWxH shorthand with optional name and quantity', () => {
    const { entries } = parseBulk('40x30x30\nTV 120×20×75 x4\nRug 200*40*40 qty 2')
    expect(entries.map((e) => [e.preset.name, e.preset.length, e.quantity])).toEqual([
      ['40×30×30', 40, 1],
      ['TV', 120, 4],
      ['Rug', 200, 2],
    ])
  })

  it('accepts decimal commas in shorthand and the upright keyword', () => {
    const { entries } = parseBulk('Fridge 70,5x70x180 1 upright')
    expect(entries[0].preset).toMatchObject({ name: 'Fridge', length: 70.5, keepUpright: true })
  })

  it('reports lines it cannot read', () => {
    const { entries, errors } = parseBulk('Box, 40, 30\n\nok 10x10x10\nbad line 12')
    expect(entries).toHaveLength(1)
    expect(errors).toEqual([
      { line: 1, text: 'Box, 40, 30' },
      { line: 4, text: 'bad line 12' },
    ])
  })
})

describe('parseBulk — weights', () => {
  it('reads weight from a sixth column or a kg token', () => {
    const { entries } = parseBulk('Crate, 100, 80, 60, 2, 35.5\nBox 40x30x30 x5 12kg\nTV 120x20x75 x2')
    expect(entries.map((e) => e.preset.weightKg)).toEqual([35.5, 12, undefined])
    expect(entries[1].quantity).toBe(5)
  })
})

describe('parseBulk — round items', () => {
  it('treats drums, rolls and "round" lines as cylinders', () => {
    const { entries } = parseBulk('Oil drum 60x60x90 x20 upright\nCarpet roll Ø40x250 x3\nPipe round, 30, 30, 600, 4')
    expect(entries.map((e) => [e.preset.shape, e.preset.length, e.preset.width, e.preset.height, e.quantity])).toEqual([
      ['cylinder', 60, 60, 90, 20],
      ['cylinder', 40, 40, 250, 3],
      ['cylinder', 30, 30, 600, 4],
    ])
    expect(entries[1].preset.name).toBe('Carpet roll')
  })

  it('leaves ordinary boxes alone', () => {
    expect(parseBulk('Box 40x30x30').entries[0].preset.shape).toBeUndefined()
  })
})
