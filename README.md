# Point Cloud Viewer

Browser point cloud viewer on Three.js: custom point shader, point budget, picking, measurement,
clipping plane, plan view beside the 3D scene. Three.js gives the renderer, scene graph, camera
controls, raycaster and loaders; this project is the application layer on top.

Live demo: **https://point-cloud-viewer.vercel.app**

**Stack:** React 19, TypeScript 6 strict, Vite 8, Three.js 0.185, SCSS modules, Vitest, ESLint with
Feature-Sliced Design boundaries.

## Features

| Feature           | Notes                                                           |
| ----------------- | --------------------------------------------------------------- |
| Rendering         | One `THREE.Points`, one draw call, custom `ShaderMaterial`      |
| Colour by scalar  | Elevation through a ramp texture, adjustable range, legend      |
| Point budget      | Stride sampling, live FPS and drawn count                       |
| Camera            | Orbit, fit to bounds on load, reset view, Z up                  |
| Picking           | Raycaster over the drawn points, highlight via a shader uniform |
| Measurement       | Distance, run, rise, slope, and a scale bar                     |
| Section           | Clipping plane on any axis, either side                         |
| Plan view         | Orthographic view beside the 3D one, one context, two viewports |
| Annotations       | Screen space labels with leader lines in the scene              |
| Own binary format | Fixed header plus two typed array blocks                        |
| Localisation      | English and Russian, `?lng=ru` pins the choice                  |

## Data

Every source resolves to one type before the renderer sees anything. The origin is float64 and the
points are float32 relative to it, because projected coordinates in the millions of meters lose half
a meter of precision in float32 alone.

```ts
interface PointCloudData {
  origin: [number, number, number]; // float64, dataset coordinates
  positions: Float32Array; // xyz relative to origin, Z up
  scalars: Float32Array; // one value per point
  pointCount: number;
  bounds: Box3; // same space as positions
  scalarRange: [number, number];
}
```

## Rendering pipeline

One `THREE.Points`, one `BufferGeometry`, one draw call, with `position`, `scalar` and a static
`slot` index as attributes. The vertex shader samples a ramp texture with the normalised scalar and
sizes the point in meters with distance attenuation, so colour and size both come from the GPU
rather than from a rebuilt buffer. Highlighting compares `slot` against a uniform, and clipping is a
dot product against a plane uniform, so both cost one uniform write.

## Point budget

The slider caps drawn points, logarithmically from ten thousand to the whole cloud. Every stride-th
point is copied into buffers allocated once per cloud, the draw range moves, and only the changed
range is uploaded; the geometry, material, `Points` object and attributes are never recreated. FPS,
drawn against total and the live GPU resource counts are in the interface, so the effect can be
measured on your own hardware.

## Releasing resources

Three.js frees nothing when an object leaves the scene, and a canvas holding a WebGL context keeps
that context alive. A cloud owns its geometry and material and releases both when replaced; the ramp
texture is shared by every material, so it belongs to the viewer and goes only with it. Across
twelve cloud swaps the counts of live canvases, contexts, observers, listeners and GPU resources are
all unchanged.

## Limits

- No octree and no level of detail. One buffer, one uniform stride.
- No streaming and no paging. The cloud is decoded whole and stays in memory.
- No culling beyond one bounding sphere for the whole cloud.
- Eight million drawn points per buffer.
- One format in the browser. Compressed lidar is converted offline, there is no `.laz` parser here.
- Picking is linear over the drawn points, so its cost follows the budget.

[Potree](https://github.com/potree/potree) has the octree and the out of core level of detail, and
is the right reference for what a full system looks like.

## Dataset

The bundled cloud is synthetic, written by `npm run seed` and never committed, with the point count
as an argument from a hundred thousand to thirty million. It is built to break the viewer where real
data does: shifted origin, Z up, uneven density, vegetation above the surface, buildings for a
section plane to cut. Code here is MIT; when a real tile ships, its licence covers the sample data
only.

## Running it

```bash
npm install
npm run dev
```

`predev` and `prebuild` generate the development cloud if it is missing.

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev server                                              |
| `npm run build`     | Type check, then production build                       |
| `npm run preview`   | Serve the production build                              |
| `npm run seed`      | Write the synthetic cloud; `-- --points 5m --seed 7 -f` |
| `npm run typecheck` | `tsc -b --noEmit`                                       |
| `npm run lint`      | ESLint, including the FSD boundaries                    |
| `npm run test`      | Vitest                                                  |
| `npm run format`    | Prettier                                                |

## Structure

Feature-Sliced Design, with layer order and slice public APIs enforced by `eslint-plugin-boundaries`
rather than only documented. The imperative Three.js layer sits in
`features/render-point-cloud/model`: React describes the viewer state as one plain object and the
viewer reconciles it, so the React side holds no graphics types.

```
src/
  app/        composition, i18n, global styles
  pages/      viewer
  widgets/    app-header, source-section, preview-section
  features/   render-point-cloud, point-budget, color-by-scalar, pick-point,
              measure-distance, clip-section, load-cloud, switch-language
  entities/   point-cloud: contract, binary format, decoder, loaders, sampling
  shared/     config, lib, ui, style tokens
scripts/      offline cloud generator
```

## Licence

MIT, see [LICENSE](LICENSE).
