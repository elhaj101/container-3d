# Container 3D

A visual container-loading planner. Pick a container (standard ISO sizes or a custom
length/width/height), list the items you need to fit — boxes, pallets, bicycles, anything
with a bounding size — and see them packed into a 3D view of the container, with used vs.
remaining space shown live.

## Status

Early scaffold — repo just created, no app code yet.

## Planned stack

**Frontend (does the real work, no backend required for v1)**
- React + TypeScript, built with Vite
- Tailwind CSS for the UI (container picker, item form, results panel)
- Three.js via `@react-three/fiber` + `@react-three/drei` for the 3D scene
  (orbit camera, dimension labels, translucent container walls)
- Zustand for state (selected container, item list, computed layout)
- Packing engine written in TypeScript, run entirely client-side: a
  first-fit-decreasing / extreme-point heuristic over oriented bounding boxes
- Deploy: Vercel or GitHub Pages (static, no server cost)

**Modeling irregular items (bicycles, etc.)**
Everything is packed as an oriented bounding box (L×W×H), not its literal shape — true
irregular-shape nesting is a much harder geometry problem and not worth it for v1. Ship a
few presets (e.g. "Bicycle ≈ 180×60×110 cm") plus a custom-size entry, and an optional
"this side must stay up" orientation lock.

**Container presets**
20' GP, 40' GP, 40' HC, 45' HC standard ISO dimensions, plus a "Custom" option with
editable length/width/height.

**Output**
Packed volume % and remaining free volume, an item-by-item placement list, and the
remaining space rendered as a ghosted region in the 3D view.

**Optional backend upgrade path (only if this grows past a client-side tool)**
Django REST Framework (matches the stack used in other portfolio projects) running a
heavier solver — e.g. Python's `py3dbp` — for large item counts, saved/shared packing
plans, or user accounts. Not needed for the core use case.

**Visual polish (v2, optional)**
Preset items (bicycle, pallet, drum) can later get real meshes instead of a plain
labeled box: model them in Blender, export as glTF/GLB, and load them with
`@react-three/drei`'s `useGLTF`. This only changes what's rendered inside each item's
bounding box — the packing algorithm still places everything by bounding-box
dimensions regardless of the mesh. Not needed to ship v1.
