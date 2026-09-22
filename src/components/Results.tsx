import type { ContainerDims, Item, PackResult } from '../lib/types'
import { usePlanner } from '../store'

const m3 = (cm3: number) => (cm3 / 1e6).toFixed(2)
const kg = (n: number) => `${Math.round(n).toLocaleString('en')} kg`

export function Results({ result, items, container }: { result: PackResult; items: Item[]; container: ContainerDims }) {
  const { visibleCount, setVisibleCount } = usePlanner()
  const total = result.placements.length
  const shown = visibleCount ?? total
  const pct = result.containerVolume ? (result.usedVolume / result.containerVolume) * 100 : 0
  const unplacedTotal = Object.values(result.unplaced).reduce((a, b) => a + b, 0)
  const freeLength = container.length - result.usedLength

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Volume used" value={`${pct.toFixed(1)}%`} sub={`${m3(result.usedVolume)} of ${m3(result.containerVolume)} m³`} />
        <Stat label="Free volume" value={`${m3(result.containerVolume - result.usedVolume)} m³`} />
        <Stat
          label="Cargo weight"
          value={`${kg(result.totalWeight)}`}
          sub={container.maxPayload ? `of ${kg(container.maxPayload)} max payload` : 'no payload limit set'}
          warn={Object.keys(result.overweight).length > 0}
        />
        <Stat label="Free floor at doors" value={`${(freeLength / 100).toFixed(2)} m`} sub="green region in 3D" />
        <Stat
          label="Packed"
          value={`${total} unit${total === 1 ? '' : 's'}`}
          sub={unplacedTotal ? `${unplacedTotal} won't fit` : 'everything fits'}
          warn={unplacedTotal > 0}
        />
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>

      {total > 0 && (
        <label className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="flex justify-between">
            <span>Load order — step through placements</span>
            <span className="text-slate-300">
              {shown} / {total}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={total}
            value={shown}
            onChange={(e) => {
              const n = Number(e.target.value)
              setVisibleCount(n === total ? null : n)
            }}
            className="accent-sky-500"
          />
        </label>
      )}

      {total > 0 && <PlacementList result={result} items={items} shown={shown} />}
    </div>
  )
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-100 tabular-nums">{value}</div>
      {sub && <div className={`text-[11px] ${warn ? 'text-rose-300' : 'text-slate-500'}`}>{sub}</div>}
    </div>
  )
}

function PlacementList({ result, items, shown }: { result: PackResult; items: Item[]; shown: number }) {
  const byId = new Map(items.map((i) => [i.id, i]))
  return (
    <details className="rounded-lg border border-slate-800 bg-slate-900/60">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
        Placement list
      </summary>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="sticky top-0 bg-slate-900 text-slate-500">
            <tr>
              <th className="px-3 py-1.5 font-medium">#</th>
              <th className="px-3 py-1.5 font-medium">Item</th>
              <th className="px-3 py-1.5 font-medium">Position x/y/z (cm)</th>
              <th className="px-3 py-1.5 font-medium">Placed as L×H×W</th>
            </tr>
          </thead>
          <tbody>
            {result.placements.map((p, i) => {
              const item = byId.get(p.itemId)
              return (
                <tr key={`${p.itemId}-${p.unit}`} className={i < shown ? 'text-slate-300' : 'text-slate-600'}>
                  <td className="px-3 py-1">{i + 1}</td>
                  <td className="px-3 py-1">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: item?.color }} />
                    {item?.name} #{p.unit}
                  </td>
                  <td className="px-3 py-1">
                    {p.x} / {p.y} / {p.z}
                  </td>
                  <td className="px-3 py-1">
                    {p.dx}×{p.dy}×{p.dz}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// Always-visible headline over the 3D view: how loaded the container is, in plain words.
export function LoadIndicator({ result, container }: { result: PackResult; container: ContainerDims }) {
  const pct = result.containerVolume ? (result.usedVolume / result.containerVolume) * 100 : 0
  const unplaced = Object.values(result.unplaced).reduce((a, b) => a + b, 0)
  const overweight = Object.values(result.overweight).reduce((a, b) => a + b, 0)
  const doorBlocked = Object.values(result.tooBigForDoor).reduce((a, b) => a + b, 0)
  const free = m3(result.containerVolume - result.usedVolume)
  const weightPct =
    container.maxPayload && result.totalWeight > 0 ? (result.totalWeight / container.maxPayload) * 100 : null
  const weightNote = weightPct !== null ? ` · weight ${weightPct.toFixed(0)}% of payload` : ''

  let tone = 'border-sky-500/40 bg-sky-950/80 text-sky-100'
  let message = `Container is ${pct.toFixed(1)}% loaded, ${free} m³ still free${weightNote}`
  if (result.placements.length === 0 && unplaced === 0) {
    tone = 'border-slate-600 bg-slate-900/80 text-slate-300'
    message = 'Container is empty (0% loaded). Add items to start packing'
  } else if (doorBlocked > 0) {
    tone = 'border-rose-500/50 bg-rose-950/80 text-rose-100'
    message = `${doorBlocked} unit${doorBlocked === 1 ? '' : 's'} can't pass the door opening (${container.doorWidth}×${container.doorHeight} cm). Container is ${pct.toFixed(1)}% loaded`
  } else if (overweight > 0) {
    tone = 'border-rose-500/50 bg-rose-950/80 text-rose-100'
    message = `Payload limit reached (${kg(result.totalWeight)}) at ${pct.toFixed(1)}% of volume. ${overweight} unit${overweight === 1 ? '' : 's'} left off for weight`
  } else if (unplaced > 0) {
    tone = 'border-rose-500/50 bg-rose-950/80 text-rose-100'
    message = `Container is ${pct.toFixed(1)}% loaded. ${unplaced} unit${unplaced === 1 ? '' : 's'} won't fit in the space left${weightNote}`
  } else if (pct >= 85 || (weightPct ?? 0) >= 90) {
    tone = 'border-emerald-500/50 bg-emerald-950/80 text-emerald-100'
    message = `Container is ${pct.toFixed(1)}% loaded, nearly full (${free} m³ free)${weightNote}`
  }

  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-lg border px-3 py-2 shadow-lg backdrop-blur ${tone}`}>
      <span className="text-2xl font-bold tabular-nums">{pct.toFixed(0)}%</span>
      <span className="text-sm leading-tight">{message}</span>
    </div>
  )
}
