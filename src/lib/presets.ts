import type { ContainerPreset, Item } from './types'

// Typical internal dimensions of ISO dry containers, in cm.
// Exact values vary slightly by manufacturer.
export const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: '20gp', name: "20' Standard", length: 589, width: 235, height: 239 },
  { id: '40gp', name: "40' Standard", length: 1203, width: 235, height: 239 },
  { id: '40hc', name: "40' High Cube", length: 1203, width: 235, height: 269 },
  { id: '45hc', name: "45' High Cube", length: 1356, width: 235, height: 269 },
]

export const CUSTOM_CONTAINER_ID = 'custom'

export type ItemPreset = Omit<Item, 'id' | 'quantity' | 'color'>

// El Haj International's standard shipping cartons (see BOX_SIZES in that project's
// pricing.ts). These seed the item list on first load.
export const BUSINESS_BOXES: ItemPreset[] = [
  { name: 'Box M', length: 40, width: 30, height: 30, keepUpright: false },
  { name: 'Box L', length: 60, width: 38, height: 38, keepUpright: false },
  { name: 'Box XXL', length: 75, width: 42, height: 41, keepUpright: false },
]

// Irregular items are approximated by their bounding box.
export const ITEM_PRESETS: ItemPreset[] = [
  ...BUSINESS_BOXES,
  { name: 'Moving box', length: 60, width: 40, height: 40, keepUpright: false },
  { name: 'Large box', length: 80, width: 60, height: 60, keepUpright: false },
  { name: 'Euro pallet', length: 120, width: 80, height: 144, keepUpright: true },
  { name: 'Bicycle', length: 180, width: 60, height: 110, keepUpright: false },
  { name: 'Washing machine', length: 60, width: 60, height: 85, keepUpright: true },
  { name: 'Fridge', length: 70, width: 70, height: 180, keepUpright: true },
  { name: 'Sofa (3-seat)', length: 210, width: 95, height: 85, keepUpright: false },
  { name: '200 L drum', length: 60, width: 60, height: 90, keepUpright: true },
]

export const ITEM_COLORS = [
  '#e07a3f',
  '#3f8fe0',
  '#4bb37a',
  '#c9a227',
  '#a35bd6',
  '#d64f6b',
  '#2fb3b3',
  '#8a8f3a',
  '#6b7bd6',
  '#b86f4b',
]
