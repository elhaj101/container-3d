import { useState } from 'react'
import { parseBulk } from '../lib/bulk'
import { CONTAINER_PRESETS, CUSTOM_CONTAINER_ID, ITEM_PRESETS } from '../lib/presets'
import type { Item } from '../lib/types'
import { usePlanner } from '../store'
import { NumField } from './NumField'

type Counts = Record<string, number>

export function Sidebar({ unplaced, overweight }: { unplaced: Counts; overweight: Counts }) {
  return (
    <div className="flex flex-col gap-6">
      <ContainerPicker />
      <ItemList unplaced={unplaced} overweight={overweight} />
    </div>
  )
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ContainerPicker() {
  const { containerId, custom, selectContainer, setCustom } = usePlanner()
  const options = [...CONTAINER_PRESETS, { id: CUSTOM_CONTAINER_ID, name: 'Custom' }]

  return (
    <Section title="Container">
      <div className="grid grid-cols-2 gap-2">
        {options.map((c) => (
          <button
            key={c.id}
            onClick={() => selectContainer(c.id)}
            className={`rounded-md border px-2 py-2 text-left text-sm transition ${
              containerId === c.id
                ? 'border-sky-500 bg-sky-500/10 text-sky-100'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <div className="font-medium">{c.name}</div>
            {'length' in c && (
              <div className="text-[11px] text-slate-500">
                {c.length}×{c.width}×{c.height} cm · {(c.maxPayload! / 1000).toFixed(1)} t
              </div>
            )}
          </button>
        ))}
      </div>
      {containerId === CUSTOM_CONTAINER_ID && (
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Length" suffix="cm" value={custom.length} onChange={(length) => setCustom({ length })} min={1} />
          <NumField label="Width" suffix="cm" value={custom.width} onChange={(width) => setCustom({ width })} min={1} />
          <NumField label="Height" suffix="cm" value={custom.height} onChange={(height) => setCustom({ height })} min={1} />
          <NumField label="Max payload (0 = no limit)" suffix="kg" value={custom.maxPayload ?? 0} onChange={(maxPayload) => setCustom({ maxPayload })} />
        </div>
      )}
    </Section>
  )
}

type AddMode = 'preset' | 'custom' | 'bulk'

function ItemList({ unplaced, overweight }: { unplaced: Counts; overweight: Counts }) {
  const { items, updateItem, removeItem, clearItems, resetToDefaults } = usePlanner()
  const [mode, setMode] = useState<AddMode>('preset')

  return (
    <Section
      title="Items"
      action={
        <span className="flex gap-3 text-xs">
          <button onClick={resetToDefaults} className="text-slate-500 hover:text-sky-300">
            Reset to M / L / XXL
          </button>
          {items.length > 0 && (
            <button onClick={clearItems} className="text-slate-500 hover:text-rose-400">
              Clear all
            </button>
          )}
        </span>
      }
    >
      <div className="grid grid-cols-3 rounded-md border border-slate-700 p-0.5 text-xs">
        {(['preset', 'custom', 'bulk'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-2 py-1 capitalize ${mode === m ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {m === 'bulk' ? 'Bulk paste' : m}
          </button>
        ))}
      </div>
      {mode === 'preset' && <PresetAdder />}
      {mode === 'custom' && <CustomAdder />}
      {mode === 'bulk' && <BulkAdder />}

      {items.length === 0 && (
        <p className="text-sm text-slate-500">No items yet. Add some above, or reset to your standard boxes.</p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="color"
                value={it.color}
                onChange={(e) => updateItem(it.id, { color: e.target.value })}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Colour"
              />
              <input
                value={it.name}
                onChange={(e) => updateItem(it.id, { name: e.target.value })}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-100 outline-none"
              />
              <button
                onClick={() => removeItem(it.id)}
                className="text-slate-500 hover:text-rose-400"
                aria-label={`Remove ${it.name}`}
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <NumField label="L (cm)" value={it.length} onChange={(length) => updateItem(it.id, { length })} min={1} />
              <NumField label="W (cm)" value={it.width} onChange={(width) => updateItem(it.id, { width })} min={1} />
              <NumField label="H (cm)" value={it.height} onChange={(height) => updateItem(it.id, { height })} min={1} />
              <NumField label="Qty" value={it.quantity} onChange={(quantity) => updateItem(it.id, { quantity: Math.floor(quantity) })} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-1.5 text-slate-400">
                <input
                  type="checkbox"
                  checked={it.keepUpright}
                  onChange={(e) => updateItem(it.id, { keepUpright: e.target.checked })}
                  className="accent-sky-500"
                />
                This side up
              </label>
              {unplaced[it.id] > 0 && (
                <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
                  {overweight[it.id] === unplaced[it.id]
                    ? `${unplaced[it.id]} over payload`
                    : `${unplaced[it.id]} won't fit`}
                </span>
              )}
            </div>
            <FreightOptions item={it} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function freightSummary(it: Item) {
  const parts: string[] = []
  if (it.weightKg) parts.push(`${it.weightKg} kg each`)
  if (it.gap) parts.push(`${it.gap} cm spacing`)
  if (it.stackable === false) parts.push('no stacking')
  if ((it.sequence ?? 1) !== 1) parts.push(`sequence ${it.sequence}`)
  return parts.join(' · ')
}

function FreightOptions({ item: it }: { item: Item }) {
  const updateItem = usePlanner((s) => s.updateItem)
  const summary = freightSummary(it)
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-slate-500 hover:text-slate-300">
        Freight options{summary && <span className="text-slate-400"> · {summary}</span>}
      </summary>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumField label="Weight (kg)" value={it.weightKg ?? 0} step={0.1} onChange={(weightKg) => updateItem(it.id, { weightKg })} />
        <NumField label="Spacing (cm)" value={it.gap ?? 0} onChange={(gap) => updateItem(it.id, { gap })} />
        <NumField label="Load sequence" value={it.sequence ?? 1} min={1} onChange={(n) => updateItem(it.id, { sequence: Math.floor(n) })} />
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-slate-400">
        <input
          type="checkbox"
          checked={it.stackable === false}
          onChange={(e) => updateItem(it.id, { stackable: !e.target.checked })}
          className="accent-sky-500"
        />
        Do not stack (nothing on top)
      </label>
    </details>
  )
}

const primaryBtn = 'rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40'

function PresetAdder() {
  const addItem = usePlanner((s) => s.addItem)
  const [presetIndex, setPresetIndex] = useState(0)
  const [qty, setQty] = useState(1)

  return (
    <div className="flex items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-slate-400">
        Preset
        <select
          value={presetIndex}
          onChange={(e) => setPresetIndex(Number(e.target.value))}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        >
          {ITEM_PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name} ({p.length}×{p.width}×{p.height})
            </option>
          ))}
        </select>
      </label>
      <NumField label="Qty" value={qty} onChange={(n) => setQty(Math.max(1, Math.floor(n)))} min={1} className="w-16" />
      <button onClick={() => addItem(ITEM_PRESETS[presetIndex], qty)} className={primaryBtn}>
        Add
      </button>
    </div>
  )
}

function CustomAdder() {
  const addItem = usePlanner((s) => s.addItem)
  const [name, setName] = useState('')
  const [dims, setDims] = useState({ length: 50, width: 40, height: 40 })
  const [qty, setQty] = useState(1)
  const [keepUpright, setKeepUpright] = useState(false)

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        addItem({ name: name.trim() || `${dims.length}×${dims.width}×${dims.height}`, ...dims, keepUpright }, qty)
        setName('')
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
      />
      <div className="grid grid-cols-4 gap-2">
        <NumField label="L (cm)" value={dims.length} onChange={(length) => setDims({ ...dims, length })} min={1} />
        <NumField label="W (cm)" value={dims.width} onChange={(width) => setDims({ ...dims, width })} min={1} />
        <NumField label="H (cm)" value={dims.height} onChange={(height) => setDims({ ...dims, height })} min={1} />
        <NumField label="Qty" value={qty} onChange={(n) => setQty(Math.max(1, Math.floor(n)))} min={1} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={keepUpright} onChange={(e) => setKeepUpright(e.target.checked)} className="accent-sky-500" />
          This side up
        </label>
        <button type="submit" className={primaryBtn}>
          Add item
        </button>
      </div>
    </form>
  )
}

interface BatchOptions {
  gap: number
  weightKg: number
  sequence: number
  keepUpright: boolean
  noStack: boolean
}

const DEFAULT_BATCH: BatchOptions = { gap: 0, weightKg: 0, sequence: 1, keepUpright: false, noStack: false }

function BulkAdder() {
  const addItems = usePlanner((s) => s.addItems)
  const [text, setText] = useState('')
  const [opts, setOpts] = useState<BatchOptions>(DEFAULT_BATCH)
  const parsed = text.trim() ? parseBulk(text) : null
  const set = (patch: Partial<BatchOptions>) => setOpts((o) => ({ ...o, ...patch }))

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder={'One item per line, e.g.\nBox A, 40, 30, 30, 12, 8.5\nTV 120x20x75 x2 18kg\nFridge 70x70x180 1 upright'}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
      />
      <p className="text-[11px] text-slate-500">
        Name, L, W, H, Qty, Weight (cm, kg per unit). Commas, tabs (paste straight from a spreadsheet) or
        40x30x30 x5 12kg all work.
      </p>

      <fieldset className="flex flex-col gap-2 rounded-md border border-slate-800 p-2">
        <legend className="px-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Batch options · apply to every line
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Spacing (cm)" value={opts.gap} onChange={(gap) => set({ gap })} />
          <NumField label="Weight (kg)" value={opts.weightKg} step={0.1} onChange={(weightKg) => set({ weightKg })} />
          <NumField label="Load sequence" value={opts.sequence} min={1} onChange={(n) => set({ sequence: Math.floor(n) })} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={opts.keepUpright} onChange={(e) => set({ keepUpright: e.target.checked })} className="accent-sky-500" />
            This side up
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={opts.noStack} onChange={(e) => set({ noStack: e.target.checked })} className="accent-sky-500" />
            Do not stack
          </label>
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Spacing is kept between units side by side (half of it from the walls), for airflow or
          dunnage. Weight applies to lines that don't give their own. Load sequence 1 goes in first
          at the back; use higher numbers for the cargo that comes off first at the doors.
        </p>
      </fieldset>

      {parsed && parsed.errors.length > 0 && (
        <p className="text-[11px] text-rose-300">
          Couldn't read line{parsed.errors.length > 1 ? 's' : ''} {parsed.errors.map((e) => e.line).join(', ')}
        </p>
      )}
      <button
        disabled={!parsed || parsed.entries.length === 0}
        onClick={() => {
          if (!parsed) return
          addItems(
            parsed.entries.map(({ preset, quantity }) => ({
              quantity,
              preset: {
                ...preset,
                keepUpright: preset.keepUpright || opts.keepUpright,
                weightKg: preset.weightKg ?? (opts.weightKg || undefined),
                gap: opts.gap || undefined,
                stackable: opts.noStack ? false : undefined,
                sequence: opts.sequence,
              },
            })),
          )
          setText('')
        }}
        className={primaryBtn}
      >
        {parsed && parsed.entries.length > 0
          ? `Add ${parsed.entries.length} item${parsed.entries.length > 1 ? 's' : ''} (${parsed.entries.reduce((a, e) => a + e.quantity, 0)} units)`
          : 'Add items'}
      </button>
    </div>
  )
}
