// All dimensions are in centimetres.
// Axes: x = length (back wall → door), y = height, z = width.

export interface ContainerDims {
  length: number
  width: number
  height: number
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
  /** When true the item may only rotate around its vertical axis. */
  keepUpright: boolean
  color: string
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
}
