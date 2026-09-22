import { useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  step?: number
  suffix?: string
  className?: string
}

// Keeps a local draft while focused so the field can be cleared mid-edit without snapping to 0.
export function NumField({ label, value, onChange, min = 0, step = 1, suffix, className = '' }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <label className={`flex flex-col gap-1 text-[11px] text-slate-400 ${className}`}>
      {label}
      <span className="relative flex items-center">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(n) && n >= min) onChange(n)
          }}
          onBlur={() => setDraft(null)}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
        />
        {suffix && <span className="pointer-events-none absolute right-2 text-xs text-slate-500">{suffix}</span>}
      </span>
    </label>
  )
}
