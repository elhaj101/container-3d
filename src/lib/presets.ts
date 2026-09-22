import type { ContainerPreset, Item } from './types'

// Typical internal dimensions (cm) and max payload (kg) of ISO dry containers.
// Exact values vary by manufacturer; check the CSC plate on the actual box.
export const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: '20gp', name: "20' Standard", length: 589, width: 235, height: 239, maxPayload: 28200 },
  { id: '40gp', name: "40' Standard", length: 1203, width: 235, height: 239, maxPayload: 26700 },
  { id: '40hc', name: "40' High Cube", length: 1203, width: 235, height: 269, maxPayload: 26500 },
  { id: '45hc', name: "45' High Cube", length: 1356, width: 235, height: 269, maxPayload: 27600 },
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
  { name: '200 L drum', length: 60, width: 60, height: 90, keepUpright: true, shape: 'cylinder' },
  { name: 'Carpet roll', length: 40, width: 40, height: 250, keepUpright: false, shape: 'cylinder' },
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

export interface CarPreset {
  make: string
  model: string
  /** Exterior length × width (without mirrors) × height, cm. */
  length: number
  width: number
  height: number
  /** Approximate kerb weight, kg. Varies by engine and trim. */
  weightKg: number
}

// Published exterior dimensions of current-generation models (base body style).
// Trim, wheels and roof rails change these slightly: check the actual vehicle's papers.
export const CAR_PRESETS: CarPreset[] = [
  { make: 'Toyota', model: 'Corolla sedan (E210)', length: 463, width: 178, height: 143.5, weightKg: 1380 },
  { make: 'Volkswagen', model: 'Golf 8', length: 428.4, width: 178.9, height: 145.6, weightKg: 1290 },
  { make: 'Honda', model: 'Civic sedan (11th gen)', length: 467.4, width: 180.2, height: 141.5, weightKg: 1340 },
  { make: 'Toyota', model: 'RAV4 (XA50)', length: 460, width: 185.5, height: 168.5, weightKg: 1650 },
  { make: 'Hyundai', model: 'Tucson (NX4)', length: 450, width: 186.5, height: 165, weightKg: 1550 },
  { make: 'Mercedes-Benz', model: 'C-Class sedan (W206)', length: 475.1, width: 182, height: 143.8, weightKg: 1650 },
  { make: 'BMW', model: '3 Series sedan (G20)', length: 470.9, width: 182.7, height: 144.2, weightKg: 1550 },
  { make: 'Tesla', model: 'Model 3 (2024)', length: 472, width: 185, height: 144.1, weightKg: 1760 },
  { make: 'Toyota', model: 'Hilux Double Cab (AN120)', length: 532.5, width: 185.5, height: 181.5, weightKg: 2100 },
  { make: 'Toyota', model: 'Land Cruiser 300', length: 498.5, width: 198, height: 194.5, weightKg: 2500 },
]

// Cars always travel upright, on the floor, with nothing on top, and with room to lash
// them down and open a door.
export const CAR_DEFAULT_GAP = 10

export function carItem(car: Omit<CarPreset, 'make' | 'model'> & { name: string }, gap = CAR_DEFAULT_GAP): ItemPreset {
  return {
    name: car.name,
    length: car.length,
    width: car.width,
    height: car.height,
    weightKg: car.weightKg,
    shape: 'car',
    keepUpright: true,
    floorOnly: true,
    stackable: false,
    gap,
  }
}
