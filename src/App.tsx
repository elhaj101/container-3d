import { useDeferredValue, useMemo } from 'react'
import { ContainerScene } from './components/ContainerScene'
import { LoadIndicator, Results } from './components/Results'
import { Sidebar } from './components/Sidebar'
import { pack } from './lib/packer'
import { useContainerDims, usePlanner } from './store'

export default function App() {
  const container = useContainerDims()
  const items = usePlanner((s) => s.items)
  const visibleCount = usePlanner((s) => s.visibleCount)
  // Pack from a deferred copy so typing stays responsive on big loads, and only repack
  // when something that affects packing changes (not names or colours).
  const packItems = useDeferredValue(items)
  const packKey = packItems.map((i) => `${i.id}:${i.length}:${i.width}:${i.height}:${i.quantity}:${i.keepUpright}:${i.gap}:${i.weightKg}:${i.stackable}:${i.floorOnly}:${i.sequence}`).join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => pack(container, packItems), [container, packKey])
  const visible = visibleCount === null ? result.placements : result.placements.slice(0, visibleCount)
  const visibleLength = visible.reduce((m, p) => Math.max(m, p.x + p.dx), 0)

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 lg:h-dvh lg:flex-row">
      {/* On phones the 3D view sits below the item list, so keep the load level pinned in view. */}
      <div className="sticky top-0 z-10 bg-slate-950/80 p-2 backdrop-blur lg:hidden">
        <LoadIndicator result={result} container={container} />
      </div>
      <aside className="w-full shrink-0 overflow-y-auto border-slate-800 p-4 lg:w-96 lg:border-r">
        <header className="mb-6">
          <h1 className="text-lg font-semibold">Container 3D</h1>
          <p className="text-sm text-slate-400">Pick a container, list your items, see how they pack.</p>
        </header>
        <Sidebar unplaced={result.unplaced} overweight={result.overweight} tooBigForDoor={result.tooBigForDoor} />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative h-[55vh] min-h-80 lg:h-auto lg:flex-1">
          <ContainerScene container={container} items={items} placements={visible} usedLength={visibleLength} />
          <div className="pointer-events-none absolute top-3 right-3 left-3 hidden justify-center lg:flex">
            <LoadIndicator result={result} container={container} />
          </div>
          <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-slate-500">
            Drag to orbit · scroll to zoom · right-drag to pan · hover a box for details
          </p>
        </div>
        <div className="border-t border-slate-800 p-4 lg:max-h-[45vh] lg:overflow-y-auto">
          <Results result={result} items={items} container={container} />
        </div>
      </main>
    </div>
  )
}
