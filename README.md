# Container 3D

A visual container-loading planner. Pick a container (standard ISO sizes or a custom
length/width/height), list the items you need to fit — boxes, pallets, bicycles, anything
with a bounding size — and see them packed into a 3D view of the container, with used vs.
remaining space shown live.

## Status

v1 working locally: container presets + custom size, item presets, custom items (single or
bulk paste), client-side packing, 3D view, live load indicator, load-order stepper.

Live: https://elhaj101.github.io/container-3d/ (redeploys on every push to `main`)

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # packing engine + bulk-paste parser tests
npm run build   # static build in dist/
```

## Using it

- **Default items** are three standard shipping cartons: M 40×30×30, L 60×38×38,
  XXL 75×42×41 cm. "Reset to M / L / XXL" restores them.
- **Add items** three ways: pick a preset, enter one custom size, or **bulk paste** — one
  item per line, e.g. `Box A, 40, 30, 30, 12, 8.5` (name, L, W, H, qty, kg per unit),
  tab-separated rows copied from a spreadsheet, or `TV 120x20x75 x2 18kg`. Add `upright`
  to a line to lock its orientation.
- **Round items** (drums, barrels, rolls, reels) toggle to "Round": enter a diameter and a
  length, and they render as cylinders — standing on end when "Stand on end" is ticked,
  lying down otherwise. Pasted lines that mention a drum, barrel, roll or reel (or use
  `Ø60x90`) are round automatically. Packing uses their square footprint (Ø × Ø), the
  usual straight-row stow; staggered/nested drum patterns aren't modelled.
- **Freight options**, set per batch when bulk pasting and editable per item afterwards:
  - *Spacing* — horizontal clearance between units (half of it kept from the walls), for
    airflow, dunnage or handling room.
  - *Weight* — kg per unit; loading stops at the container's max payload and the tool
    says how many units were left off for weight.
  - *Do not stack* — nothing is placed on top of that item.
  - *Always bottom* — the item stands on the container floor, never on other items
    (heavy goods, liquids); these are loaded first within their load sequence so the
    floor is still free for them.
  - *This side up* — the item only rotates around its vertical axis.
  - *Load sequence* — for multi-drop consolidation: sequence 1 goes in first at the back,
    and each later sequence starts in front of everything loaded before it, so an early
    stop's cargo is never buried behind a later one's.
- **Load indicator** at the top of the 3D view shows how full the container is (% of
  volume, plus % of payload when weights are set) and turns red when units don't fit.
- **1 m reference grid** on the container walls, floor and ceiling, with labelled ticks.
- Everything is saved in the browser (localStorage), so a plan survives a reload.

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
