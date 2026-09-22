import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BUSINESS_BOXES, CONTAINER_PRESETS, CUSTOM_CONTAINER_ID, ITEM_COLORS, type ItemPreset } from './lib/presets'
import type { ContainerDims, Item } from './lib/types'

interface PlannerState {
  containerId: string
  custom: ContainerDims
  items: Item[]
  /** How many placements to show, for stepping through the load order. null = all. */
  visibleCount: number | null
  selectContainer: (id: string) => void
  setCustom: (dims: Partial<ContainerDims>) => void
  addItem: (preset: ItemPreset, quantity?: number) => void
  addItems: (entries: { preset: ItemPreset; quantity: number }[]) => void
  resetToDefaults: () => void
  updateItem: (id: string, patch: Partial<Item>) => void
  removeItem: (id: string) => void
  clearItems: () => void
  setVisibleCount: (n: number | null) => void
}

function nextColor(items: Item[]) {
  const used = new Set(items.map((i) => i.color))
  return ITEM_COLORS.find((c) => !used.has(c)) ?? ITEM_COLORS[items.length % ITEM_COLORS.length]
}

function withIds(entries: { preset: ItemPreset; quantity: number }[], existing: Item[]): Item[] {
  const out = [...existing]
  for (const { preset, quantity } of entries) {
    out.push({ ...preset, id: crypto.randomUUID(), quantity, color: nextColor(out) })
  }
  return out
}

const DEFAULT_QUANTITY = 20

function defaultItems() {
  return withIds(
    BUSINESS_BOXES.map((preset) => ({ preset, quantity: DEFAULT_QUANTITY })),
    [],
  )
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
      containerId: '20gp',
      custom: { length: 600, width: 240, height: 240 },
      items: defaultItems(),
      visibleCount: null,
      selectContainer: (containerId) => set({ containerId, visibleCount: null }),
      setCustom: (dims) => set((s) => ({ custom: { ...s.custom, ...dims }, visibleCount: null })),
      addItem: (preset, quantity = 1) =>
        set((s) => ({ items: withIds([{ preset, quantity }], s.items), visibleCount: null })),
      addItems: (entries) =>
        set((s) => ({ items: withIds(entries, s.items), visibleCount: null })),
      resetToDefaults: () => set({ items: defaultItems(), visibleCount: null }),
      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
          visibleCount: null,
        })),
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== id), visibleCount: null })),
      clearItems: () => set({ items: [], visibleCount: null }),
      setVisibleCount: (visibleCount) => set({ visibleCount }),
    }),
    {
      name: 'container-3d',
      partialize: ({ containerId, custom, items }) => ({ containerId, custom, items }),
    },
  ),
)

export function useContainerDims(): ContainerDims {
  const containerId = usePlanner((s) => s.containerId)
  const custom = usePlanner((s) => s.custom)
  if (containerId === CUSTOM_CONTAINER_ID) return custom
  return CONTAINER_PRESETS.find((c) => c.id === containerId) ?? CONTAINER_PRESETS[0]
}
