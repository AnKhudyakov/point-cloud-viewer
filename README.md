# Point Cloud Viewer

A point cloud viewer that runs in the browser, built directly on Three.js: a custom point shader, a
point budget you can move while watching the frame rate, picking, measurement, a clipping plane and
a plan view beside the 3D scene. Live demo: **https://point-cloud-viewer.vercel.app**

This is an application on top of an engine, not an engine. Three.js supplies the renderer, the scene
graph, the camera controls, the raycaster and the loaders. Everything above that is written here:
the point material, the sampling, the picking, the annotations, the resource ownership.

**Stack:** React 19, TypeScript 6 strict, Vite 8, Three.js 0.185, SCSS modules, Vitest, ESLint with
Feature-Sliced Design boundaries, deployed on Vercel.

## What it does

| Feature               | Notes                                                                            |
| --------------------- | -------------------------------------------------------------------------------- |
| Point cloud rendering | One `THREE.Points`, one draw call, custom `ShaderMaterial`                       |
| Colour by scalar      | Elevation mapped through a viridis ramp texture, adjustable range, legend        |
| Point budget          | Stride sampling into preallocated buffers, live FPS and drawn count              |
| Camera                | Orbit controls, fit to bounds on load, reset view, Z up                          |
| Picking               | Raycaster over the drawn subset, highlight through a shader attribute            |
| Measurement           | Distance, horizontal run, rise and slope between two points, with a scale bar    |
| Section               | Clipping plane on any axis, cut position, either side                            |
| Plan view             | Orthographic top down view beside the 3D scene, one WebGL context, two viewports |
| Annotations           | Screen space labels with leader lines drawn in the scene                         |
| Resource release      | Explicit disposal, checked by counting live resources across cloud swaps         |
| Own binary format     | Fixed header plus two typed array blocks, decoded without per point parsing      |
| Two languages         | English and Russian, `?lng=ru` pins the choice                                   |

## The data path

### Contract

Every source resolves to one type before the renderer sees anything:

```ts
interface PointCloudData {
  origin: [number, number, number]; // float64, dataset coordinates
  positions: Float32Array; // xyz relative to origin, Z up
  scalars: Float32Array; // one value per point
  pointCount: number;
  bounds: Box3; // relative to origin, same space as positions
  scalarRange: [number, number];
}
```

Sources are the bundled binary file and a file the user drops in. Adding PLY through `PLYLoader`
means one more variant and one more branch, with nothing in the graphics layer touching it.

### Why the origin is float64 and the points are float32

This is the load bearing decision, not a detail. Real scans carry projected coordinates: an AHN tile
in RD New has eastings in the hundreds of thousands and northings between three and six hundred
thousand; UTM northings reach into the millions. `Float32` holds about seven significant digits, so
at a coordinate of 5,678,901 the gap between representable values is already around half a meter.
Points quantise onto that grid, the cloud shimmers as the camera moves, and distance measurements
drift.

So the reference point is stored and applied in float64, and the points are float32 relative to it.
The interface shows both: pick a point and you get the local coordinate the GPU works with and the
dataset coordinate the survey uses, added back in double precision.

### File format

Little endian, a fixed 92 byte header, then two typed array blocks:

| Offset   | Size | Field                                      |
| -------- | ---- | ------------------------------------------ |
| 0        | 4    | magic, ASCII `PCVB`                        |
| 4        | 4    | version, uint32                            |
| 8        | 4    | pointCount, uint32                         |
| 12       | 24   | origin, 3 x float64                        |
| 36       | 24   | bboxMin, 3 x float64, absolute coordinates |
| 60       | 24   | bboxMax, 3 x float64, absolute coordinates |
| 84       | 4    | scalarMin, float32                         |
| 88       | 4    | scalarMax, float32                         |
| 92       | 12n  | positions, float32 xyz relative to origin  |
| 92 + 12n | 4n   | scalars, float32                           |

Both blocks start on a four byte boundary, which is what lets the decoder build `Float32Array` views
straight over the downloaded buffer instead of copying it. At sixteen bytes per point a million
points is sixteen megabytes. The header carries the bounding box so the viewer never has to scan
every point to find it, and the decoder rejects a wrong magic, an unknown version or a length that
disagrees with the point count, which is what catches a truncated download before it reaches the
GPU.

## Rendering pipeline

One `THREE.Points` with one `BufferGeometry`, one draw call, no mesh per point. Three attributes:

- `position`, three float32 per point, in the space of the cloud origin;
- `scalar`, one float32 per point, the value the colour comes from;
- `slot`, one float32 per point, a static index used for highlighting.

The vertex shader does four things.

**Colour from the scalar.** The scalar is normalised against a range uniform and used to sample a
256 pixel ramp texture. Colour is computed on the GPU rather than stored in a `color` attribute, and
that is a deliberate departure: the range is adjustable, and with a colour attribute every drag of
the slider would mean recomputing and re-uploading three floats per point, ninety million writes on
a thirty million point cloud. In the shader it is one uniform write. The ramp is declared once in
TypeScript and used for both the texture and the CSS gradient in the legend, so the two cannot drift
apart.

**Point size with distance attenuation.** `gl_PointSize` is `pointSize * projectionScale / depth`,
where `projectionScale` is the drawing buffer height divided by twice the tangent of half the field
of view. That makes `pointSize` a diameter in meters rather than pixels, so a point keeps its
physical size as the camera moves, and the result is clamped to a sane pixel range so distant points
never vanish and near ones never smear. The default is derived from the cloud itself, at roughly one
and a half times the mean point spacing.

**Highlight.** The picked point is compared against a `uSelected` uniform using the static `slot`
attribute. Selecting a point costs one uniform write and touches no buffer, which is the whole
reason the attribute exists rather than a per click upload of a flag array. Float32 holds integers
exactly up to 16.7 million, above the buffer ceiling, so the comparison cannot drift. The
highlighted point is drawn larger, in white, with a dark ring added in the fragment shader.

**Clipping.** A clipped point is moved outside the clip volume, where the GPU drops it before
rasterising. Cheaper than a discard per fragment, and it avoids wiring Three.js clipping chunks into
a hand written shader for what is one dot product.

The fragment shader turns square points into round ones by discarding outside a radius, and adds the
highlight ring. No branching: both are `mix` and `step`.

## Performance

The point budget is the part worth reading. A slider caps how many points are drawn, on a
logarithmic scale from ten thousand to the whole cloud, because a linear slider across four orders
of magnitude is useless.

**What happens on a budget change.** The stride is `ceil(total / budget)`. Every stride-th point is
copied into buffers allocated once per cloud, the draw range moves to the number written, and only
the range that changed is uploaded, through `addUpdateRange`. That is it.

**What does not happen.** The geometry, the material, the `Points` object and the attributes are the
same instances before and after. Nothing is recreated, nothing is added to or removed from the
scene. There is a test that holds references to all four and asserts they survive three budget
changes.

**Why a compacted copy instead of an index buffer.** An index buffer would be four bytes per point
instead of sixteen, but strided index reads still pull cache lines from across the whole position
buffer, so the frame time would follow the budget only weakly. Compacting the drawn subset keeps
vertex fetch dense, which is what makes the effect visible on the FPS counter. That visibility is
the point of the feature.

**Numbers.** Sixteen bytes per point, so the bundled 500,000 point cloud is 7.6 MB and one million
points would be 16 MB. The generator writes 500,000 points in 0.2 s, five million in 2.2 s and
thirty million in 11.8 s at constant memory, streaming two attribute blocks to two file positions. A
single buffer is capped at eight million drawn points. The interface shows FPS, drawn against total,
the current stride and the live count of GPU geometries, textures and programs, so frame rates can
be read on your own hardware rather than taken on trust. Headless Chrome on a software rasteriser
holds sixty frames a second at 200,000 points, which is a floor rather than a measurement of a real
GPU.

The plan view shares one WebGL context and one canvas with the 3D view, drawn as two viewports with
the scissor test on so each pass and its clear stay inside their own half. A second renderer would
mean a second context, and a browser grants only a handful of those.

## Releasing resources

Three.js does not free GPU resources when an object leaves the scene. Geometries, materials,
textures and shader programs are released only when `dispose` is called on them, and a canvas that
has a WebGL context keeps that context alive.

Ownership here is split on purpose:

- **a cloud owns** its geometry and its material, and releases both when it is replaced;
- **the viewer owns** the ramp texture, the annotation geometries and their materials, the orbit
  controls, the resize observer, the pointer listeners, the animation frame, the renderer and the
  canvas it created.

The ramp texture is the interesting one. It is shared by every material the viewer ever builds, so
it must survive a cloud swap and go only when the viewer goes. Disposing a shared resource along
with the first object that used it is the classic version of this bug, and there is a test asserting
that disposing a cloud does not fire `dispose` on the texture. Disposal is idempotent: calling it
three times releases once.

**How this is checked, not asserted.** Twelve cloud swaps in the browser, with live object counts
read after a forced garbage collection:

|                                      | before    | after     |
| ------------------------------------ | --------- | --------- |
| live canvases                        | 1         | 1         |
| live WebGL contexts                  | 1         | 1         |
| live resize observers                | 1         | 1         |
| DOM nodes                            | 223       | 223       |
| JS event listeners                   | 168       | 168       |
| GPU geometries / textures / programs | 1 / 1 / 1 | 1 / 1 / 1 |

An earlier version failed this. Reloading a cloud unmounted the canvas, because the preview had
nothing to show while the next cloud was in flight, so every reload built a new WebGL context:
thirteen canvases and thirteen contexts after twelve swaps, close to the ceiling Chrome enforces on
live contexts. The loader now keeps the last cloud it read, the preview goes on drawing it while the
next one loads, and one viewer serves them all.

## Deliberate limitations

None of these are oversights. They are the line between an application and an engine, and the whole
project sits on the application side.

- **No octree and no level of detail.** Everything drawn is in one buffer, sampled with a uniform
  stride. A real system builds a spatial index and swaps detail per node as the camera moves.
- **No streaming and no paging.** The whole cloud is downloaded and decoded before anything appears,
  and it all stays in memory. There is no out of core path.
- **No frustum culling beyond the whole object.** One bounding sphere for the entire cloud.
- **One buffer, capped at eight million drawn points.** Past that a viewer needs the two items
  above. The cap is shown in the interface rather than hidden.
- **One format in the browser.** The project binary format only. Compressed lidar is converted
  offline; there is no `.laz` parser here and there will not be, because writing one teaches nothing
  about graphics.
- **Datasets are decimated in advance**, offline, not at runtime.
- **Picking is linear over the drawn points.** No spatial index, so the cost follows the budget.
  Lowering the budget speeds picking up as well.

[Potree](https://github.com/potree/potree) is the open source point cloud engine that does have the
octree and the out of core level of detail. It is the right reference for what a full system looks
like, and the honest answer to "why only half a million points here".

## Data

The bundled cloud is synthetic, written by `npm run seed` and never committed. It is generated to
break the viewer where real data does: a shifted origin with a northing in the millions, Z up,
elevations well away from zero, uneven point density from rejection sampling against a noise field,
vegetation returns spread above the surface, and rotated buildings with walls and roofs so a section
plane has something to cut. Point count is an argument, so the same command produces a hundred
thousand points or thirty million.

No attribution is required for synthetic data. When a real tile ships, the credit belongs both here
and in the interface footer, where the viewer already has a slot for it, because a demo is opened
far more often than a README is read. Candidate sources are AHN through GeoTiles, IGN Lidar HD, USGS
3DEP and Open Heritage 3D. Code in this repository is MIT; a data licence would cover the sample
data only.

## Running it

```bash
npm install
npm run dev
```

`predev` and `prebuild` generate the development cloud if it is missing, so there is no separate
setup step.

| Script              | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Dev server, generating the cloud first if needed             |
| `npm run build`     | Type check, then production build                            |
| `npm run preview`   | Serve the production build                                   |
| `npm run seed`      | Write the synthetic cloud; `-- --points 5m --seed 7 --force` |
| `npm run typecheck` | `tsc -b --noEmit` across the app, test and tooling projects  |
| `npm run lint`      | ESLint, including the Feature-Sliced Design boundary rules   |
| `npm run test`      | Vitest, 160 tests over geometry, format and reconciliation   |
| `npm run format`    | Prettier                                                     |

## Structure

Feature-Sliced Design, with the layer order and the slice public APIs enforced by
`eslint-plugin-boundaries` rather than only documented. An upward import or a reach past an
`index.ts` fails the lint run.

```
src/
  app/        composition, i18n, global styles
  pages/      viewer: owns the source and the active section
  widgets/    app-header, source-section, preview-section
  features/   render-point-cloud, point-budget, color-by-scalar,
              pick-point, measure-distance, clip-section,
              load-cloud, switch-language
  entities/   point-cloud: contract, binary format, decoder, loaders, sampling
  shared/     config, lib, ui, style tokens
scripts/      offline cloud generator
```

The imperative Three.js layer lives in `features/render-point-cloud/model`. React describes the
whole viewer state as one plain object and the viewer reconciles it, so the React side owns no
graphics types and needs no effect per control. `SceneState` contains no Three.js type at all.

Tests cover the parts where a mistake is silent: bounds and camera framing, the binary format and
its validation, stride sampling and the mapping from a drawn slot back to a point in the file, the
colour ramp, screen projection, the scale bar, viewport splitting, the clipping half space, and the
scene reconciliation rules. Rendering itself is not unit tested.

## Licence

MIT, see [LICENSE](LICENSE).
