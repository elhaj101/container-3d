import type { ItemPreset } from './presets'

export interface BulkEntry {
  preset: ItemPreset
  quantity: number
}

export interface BulkParseResult {
  entries: BulkEntry[]
  /** 1-based line numbers with the original text, for lines that couldn't be read. */
  errors: { line: number; text: string }[]
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`
const DIMS = new RegExp(String.raw`${NUM}\s*[x×*]\s*${NUM}\s*[x×*]\s*${NUM}`, 'i')
const UPRIGHT = /\b(upright|this side up|keep upright)\b/i
const ROUND = /Ø|\b(round|cylinder|drums?|barrels?|kegs?|rolls?|reels?)\b/i
const DIMS2 = new RegExp(String.raw`${NUM}\s*[x×*]\s*${NUM}`, 'i')
const WEIGHT = new RegExp(String.raw`${NUM}\s*kg\b`, 'i')

const toNum = (s: string) => Number(s.replace(',', '.'))

/**
 * Parse pasted item lines. One item per line, in either shape:
 *   Name, L, W, H, Qty, Weight   (comma, semicolon or tab separated — spreadsheet paste works)
 *   Name 40x30x30 x5 12kg        (dimensions joined by x/×, quantity after)
 * Name, quantity and weight (kg per unit) are optional; quantity defaults to 1.
 * Add "upright" to lock orientation. Lines naming a drum, barrel, keg, roll or reel, or
 * saying "round", are round items: diameter × length (Ø60x90) or L×W×H using the larger of
 * L and W as the diameter.
 * Header rows and blank lines are skipped.
 */
export function parseBulk(text: string): BulkParseResult {
  const entries: BulkEntry[] = []
  const errors: BulkParseResult['errors'] = []

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const keepUpright = UPRIGHT.test(line)
    const round = ROUND.test(line)
    let clean = line.replace(UPRIGHT, '').trim()
    let weightKg: number | undefined
    const w = clean.match(WEIGHT)
    if (w) {
      weightKg = toNum(w[1])
      clean = (clean.slice(0, w.index) + clean.slice(w.index! + w[0].length)).trim()
    }
    if (!/\d/.test(clean)) return // header row

    let name = ''
    let dims: number[] | null = null
    let quantity = 1

    let m = clean.match(DIMS)
    // Round items are usually given as Ø×length; don't mistake "Ø40x250 x3" for three sizes.
    const twoDims = round && (clean.includes('Ø') || (m !== null && /^\S+[x×*]\S+\s[x×*]/i.test(m[0])))
    const m2 = twoDims || (!m && round) ? clean.match(DIMS2) : null
    if (m2) m = null
    if (m2) {
      const [d, h] = [toNum(m2[1]), toNum(m2[2])]
      dims = [d, d, h]
      name = clean.slice(0, m2.index).replace(/[\s,;:\t-]+$/, '').replace(/Ø\s*$/, '').trim()
      const q = clean.slice(m2.index! + m2[0].length).match(/\d+/)
      if (q) quantity = Number(q[0])
    } else if (m) {
      dims = [toNum(m[1]), toNum(m[2]), toNum(m[3])]
      name = clean.slice(0, m.index).replace(/[\s,;:\t-]+$/, '').trim()
      const q = clean.slice(m.index! + m[0].length).match(/\d+/)
      if (q) quantity = Number(q[0])
    } else {
      const fields = clean.split(/[,;\t]/).map((f) => f.trim()).filter(Boolean)
      const numeric = fields.filter((f) => /^\d+(?:\.\d+)?$/.test(f))
      if (numeric.length >= 3) {
        dims = numeric.slice(0, 3).map(Number)
        if (numeric[3]) quantity = Number(numeric[3])
        if (numeric[4] && weightKg === undefined) weightKg = Number(numeric[4])
        name = fields.find((f) => !/^\d+(?:\.\d+)?$/.test(f)) ?? ''
      }
    }

    if (!dims || dims.some((d) => !(d > 0)) || !(quantity >= 1)) {
      errors.push({ line: i + 1, text: raw })
      return
    }
    let [length, width, height] = dims
    if (round) length = width = Math.max(length, width)
    entries.push({
      preset: {
        name: name || (round ? `Ø${length}×${height}` : `${length}×${width}×${height}`),
        length,
        width,
        height,
        keepUpright,
        ...(round && { shape: 'cylinder' as const }),
        ...(weightKg !== undefined && { weightKg }),
      },
      quantity: Math.floor(quantity),
    })
  })

  return { entries, errors }
}
