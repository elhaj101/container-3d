import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { checkKey, grantAccess, hasAccess } from '../lib/access'

// The planner is only fetched once the key checks out, so the locked page stays light.
const App = lazy(() => import('../App'))

const GOLD = '#F6C744'

export function AccessGate() {
  const [unlocked, setUnlocked] = useState(hasAccess)

  if (unlocked) {
    return (
      <Suspense fallback={<Loading />}>
        <App />
      </Suspense>
    )
  }
  return <LoginScreen onUnlock={() => setUnlocked(true)} />
}

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 text-sm text-slate-400">
      Loading planner…
    </div>
  )
}

function LoginScreen({ onUnlock }: { onUnlock: () => void }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [status, setStatus] = useState<'idle' | 'checking' | 'wrong' | 'ok'>('idle')
  const [shake, setShake] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!key.trim() || status === 'checking') return
    setStatus('checking')
    if (await checkKey(key)) {
      setStatus('ok')
      grantAccess(remember)
      setTimeout(onUnlock, 450)
    } else {
      setStatus('wrong')
      setShake((n) => n + 1)
      inputRef.current?.select()
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <Backdrop />

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img
            src="./el-haj-logo-light.webp"
            alt="El Haj International — Shipping · Trading"
            className="h-auto w-64 select-none drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)] sm:w-72"
            draggable={false}
          />
        </div>

        <div
          key={shake}
          className={`rounded-2xl border border-white/10 bg-slate-900/70 p-7 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8 ${shake ? 'animate-[gate-shake_0.4s_ease-in-out]' : ''}`}
        >
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: GOLD }}>
              Private access
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Container 3D</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              Load planner for El Haj International shipments. Enter your access key to continue.
            </p>
          </div>

          <form onSubmit={submit} noValidate>
            <label htmlFor="access-key" className="mb-2 block text-xs font-medium text-slate-300">
              Access key
            </label>
            <div
              className={`flex items-center rounded-xl border bg-slate-950/80 transition-colors focus-within:ring-2 ${
                status === 'wrong'
                  ? 'border-red-500/70 focus-within:ring-red-500/30'
                  : 'border-slate-700 focus-within:border-amber-300/70 focus-within:ring-amber-300/20'
              }`}
            >
              <KeyIcon />
              <input
                ref={inputRef}
                id="access-key"
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => { setKey(e.target.value); if (status === 'wrong') setStatus('idle') }}
                placeholder="EHI-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={status === 'wrong'}
                aria-describedby="access-key-msg"
                className="min-w-0 flex-1 bg-transparent py-3 pr-2 font-mono text-[15px] tracking-wider text-slate-100 outline-none placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="mr-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
                aria-label={show ? 'Hide access key' : 'Show access key'}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>

            <p id="access-key-msg" role="alert" className="mt-2 min-h-5 text-xs text-red-400">
              {status === 'wrong' ? "That key didn't work. Check it and try again." : ''}
            </p>

            <label className="mt-1 mb-6 flex cursor-pointer items-center gap-2.5 text-sm text-slate-400 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-slate-600 bg-slate-900 accent-amber-400"
              />
              Remember this device
            </label>

            <button
              type="submit"
              disabled={!key.trim() || status === 'checking' || status === 'ok'}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/10 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: `linear-gradient(180deg, #FFD966 0%, ${GOLD} 55%, #E0A92A 100%)` }}
            >
              {status === 'checking' ? 'Checking…' : status === 'ok' ? 'Unlocked' : 'Unlock planner'}
              {status === 'idle' || status === 'wrong' ? (
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              ) : null}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Need a key? Ask El Haj International.
        </p>
      </main>

    </div>
  )
}

function KeyIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="ml-3.5 mr-2.5 size-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 20 3m-3 3 2.5 2.5M14.5 8.5 17 11" />
    </svg>
  )
}

/** Blueprint grid, a soft warm glow, and a wireframe 20ft container in isometric view. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 30%, transparent 80%)',
        }}
      />
      <div className="absolute top-1/2 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.06] blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-600/[0.06] blur-3xl" />

      <svg
        viewBox="0 0 600 360"
        className="absolute top-1/2 left-1/2 w-[min(1100px,160vw)] -translate-x-1/2 -translate-y-[46%] opacity-[0.16]"
        fill="none"
        stroke={GOLD}
        strokeWidth="1"
        strokeLinejoin="round"
      >
        {/* Isometric box: front face, top, side */}
        <path d="M110 170 L370 290 L500 230 L240 110 Z" />
        <path d="M110 170 L110 250 L370 370 L370 290" />
        <path d="M370 370 L500 310 L500 230" />
        {/* Corrugation on the long side */}
        {Array.from({ length: 16 }, (_, i) => {
          const t = (i + 1) / 17
          const x = 110 + 260 * t
          const y = 170 + 120 * t
          return <path key={i} d={`M${x} ${y} L${x} ${y + 80}`} strokeOpacity="0.55" />
        })}
        {/* Doors on the short side */}
        <path d="M435 260 L435 340" strokeOpacity="0.8" />
        <path d="M405 274 L405 354 M465 246 L465 326" strokeOpacity="0.45" />
      </svg>
    </div>
  )
}
