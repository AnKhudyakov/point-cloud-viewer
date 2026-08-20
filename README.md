# Point Cloud Viewer

Browser point cloud viewer on Three.js: custom point shader, point budget, picking, measurement,
clipping plane, plan view beside the 3D scene.

Live demo: **https://point-cloud-viewer.vercel.app**

Three.js gives the renderer, scene graph, camera controls, raycaster and loaders. This project is
the application layer on top.

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

Every source resolves to one type before the renderer sees anything:

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

**Why the origin is float64.** Real scans carry projected coordinates, and UTM northings reach into
the millions. Float32 gives about seven significant digits, so near 5,678,901 the gap between
representable values is half a meter: points snap to that grid, the cloud shimmers as the camera
moves, measurements drift. So the origin is double precision and the points are float32 relative to
it. Pick a point and the panel shows both coordinates.

**File format.** Little endian, a 92 byte header, then two typed array blocks:

| Offset   | Size | Field                                     |
| -------- | ---- | ----------------------------------------- |
| 0        | 4    | magic, ASCII `PCVB`                       |
| 4        | 4    | version, uint32                           |
| 8        | 4    | pointCount, uint32                        |
| 12       | 24   | origin, 3 x float64                       |
| 36       | 24   | bboxMin, 3 x float64, absolute            |
| 60       | 24   | bboxMax, 3 x float64, absolute            |
| 84       | 4    | scalarMin, float32                        |
| 88       | 4    | scalarMax, float32                        |
| 92       | 12n  | positions, float32 xyz relative to origin |
| 92 + 12n | 4n   | scalars, float32                          |

Both blocks are four byte aligned, so the decoder builds `Float32Array` views over the downloaded
buffer instead of copying. Sixteen bytes per point. The bounding box comes from the header, and a
bad magic, unknown version or wrong length is rejected before the data reaches the GPU.

## Rendering pipeline

One `THREE.Points`, one `BufferGeometry`, one draw call. Attributes: `position`, `scalar`, and a
static `slot` index for highlighting.

The vertex shader normalises the scalar against a range uniform, samples a 256 pixel ramp texture,
and sets `gl_PointSize` to `pointSize * projectionScale / depth`. With `projectionScale` derived
from the buffer height and the field of view, `pointSize` is a diameter in meters, so points keep
their physical size as the camera moves. The default comes from the mean point spacing.

Colour lives in the shader, not in a `color` attribute. The range is adjustable, and a colour
attribute would mean re-uploading three floats per point on every drag of the slider. In the shader
it is one uniform write. The ramp is declared once in TypeScript and feeds both the texture and the
legend gradient.

Highlighting compares `slot` against a `uSelected` uniform, so selecting a point costs one uniform
write and no buffer upload. Clipping is a dot product against a plane uniform; clipped points are
moved outside the clip volume for the GPU to drop.

## Point budget

The slider caps drawn points, logarithmically from ten thousand to the whole cloud.

On a change: stride is `ceil(total / budget)`, every stride-th point is copied into buffers
allocated once per cloud, the draw range moves, and only the changed range is uploaded via
`addUpdateRange`. The geometry, the material, the `Points` object and the attributes are never
recreated; a test holds references to all four and asserts they survive three budget changes.

The drawn subset is compacted rather than indexed. Strided index reads would still pull cache lines
from across the whole buffer, and the frame time would barely follow the budget.

The bundled cloud is 500,000 points and 7.6 MB. The generator writes thirty million in twelve
seconds at constant memory. One buffer is capped at eight million drawn points. FPS, drawn against
total, the stride and the live GPU resource counts are in the interface, so the numbers can be read
on your own hardware.

The plan view shares one context and one canvas with the 3D view: two viewports with the scissor
test on. A second renderer would mean a second WebGL context, and browsers grant few of those.

## Releasing resources

Three.js frees nothing when an object leaves the scene, and a canvas holding a WebGL context keeps
that context alive.

A cloud owns its geometry and material and releases both when replaced. The viewer owns the ramp
texture, the annotation geometries and materials, the controls, the resize observer, the pointer
listeners, the animation frame, the renderer and the canvas it created.

The ramp texture is the case worth naming: shared by every material the viewer builds, so it must
survive a cloud swap and go only with the viewer. Releasing a shared resource with the first object
that used it is the usual form of this bug; a test asserts that disposing a cloud leaves the texture
alone. Across twelve cloud swaps, with a forced garbage collection before each reading, the counts
of live canvases, contexts, observers, DOM nodes, listeners and GPU resources are all unchanged.

## Limits

- No octree and no level of detail. One buffer, one uniform stride.
- No streaming and no paging. The cloud is decoded whole and stays in memory.
- No culling beyond one bounding sphere for the whole cloud.
- Eight million drawn points per buffer.
- One format in the browser. Compressed lidar is converted offline, there is no `.laz` parser here.
- Datasets are decimated in advance, not at runtime.
- Picking is linear over the drawn points, so its cost follows the budget.

[Potree](https://github.com/potree/potree) has the octree and the out of core level of detail, and
is the right reference for what a full system looks like.

## Dataset

The bundled cloud is synthetic, written by `npm run seed` and never committed. It is built to break
the viewer where real data does: shifted origin, Z up, elevations away from zero, uneven density,
vegetation above the surface, rotated buildings for a section plane to cut. Point count is an
argument, from a hundred thousand to thirty million.

Synthetic data needs no attribution. When a real tile ships, the credit goes here and into the
interface footer, which already has a slot for it. Code is MIT; a data licence would cover the
sample data only.

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
rather than only documented.

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

The imperative Three.js layer sits in `features/render-point-cloud/model`. React describes the
viewer state as one plain object and the viewer reconciles it, so the React side holds no graphics
types.

Tests cover the geometry and the format, where a mistake would be silent. Rendering is not unit
tested.

## Licence

MIT, see [LICENSE](LICENSE).
