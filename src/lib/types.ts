// All dimensions are in centimetres.
// Axes: x = length (back wall → door), y = height, z = width.

export interface ContainerDims {
  length: number
  width: number
  height: number
  /** Maximum cargo weight in kg. Omitted or 0 = no weight check. */
  maxPayload?: number
}

export interface ContainerPreset extends ContainerDims {
  id: string
  name: string
}

export interface Item {
  id: string
  name: string
  length: number
  width: number
  height: number
  quantity: number
  /** When true the item may only rotate around its vertical axis (round items stand on end). */
  keepUpright: boolean
  /**
   * 'cylinder' = round item (drum, barrel, roll): length = width = diameter, height = length
   * along its axis. Packed by its square footprint, rendered round. 'car' = vehicle, packed
   * by its bounding box and rendered as a simple car. Defaults to 'box'.
   */
  shape?: 'box' | 'cylinder' | 'car'
  color: string
  /** Horizontal spacing between units, cm. Half of it is kept from walls too. */
  gap?: number
  /** Weight of one unit, kg. */
  weightKg?: number
  /** When false nothing may be placed on top of this item. Defaults to true. */
  stackable?: boolean
  /** When true the item must stand on the container floor, never on other items. */
  floorOnly?: boolean
  /** Load sequence: 1 is loaded first (back wall), higher numbers nearer the doors. */
  sequence?: number
}

export interface Placement {
  itemId: string
  /** 1-based index of this unit among the item's quantity. */
  unit: number
  x: number
  y: number
  z: number
  /** Placed size along each axis, after rotation. */
  dx: number
  dy: number
  dz: number
}

export interface PackResult {
  placements: Placement[]
  /** itemId → number of units that could not be placed. */
  unplaced: Record<string, number>
  containerVolume: number
  usedVolume: number
  /** Furthest x reached by any placed box — how much floor length is used. */
  usedLength: number
  /** Total weight of placed units, kg. */
  totalWeight: number
  /** itemId → units left out only because the payload limit was reached. */
  overweight: Record<string, number>
}
