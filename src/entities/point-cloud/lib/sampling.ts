export const MIN_BUDGET = 1;

export function strideFor(total: number, budget: number): number {
  if (total <= 0) {
    return 1;
  }
  if (budget >= total) {
    return 1;
  }
  if (budget < MIN_BUDGET) {
    return total;
  }
  return Math.ceil(total / budget);
}

export function sampledCount(total: number, stride: number): number {
  if (total <= 0 || stride <= 0) {
    return 0;
  }
  return Math.ceil(total / stride);
}

export function sampleByStride(
  source: Float32Array,
  target: Float32Array,
  components: number,
  count: number,
  stride: number,
): number {
  const capacity = Math.floor(target.length / components);
  const available = Math.floor(source.length / components);
  const limit = Math.min(count, capacity);

  let written = 0;
  for (let i = 0; i < limit; i += 1) {
    const from = i * stride;
    if (from >= available) {
      break;
    }
    const source0 = from * components;
    const target0 = written * components;
    for (let c = 0; c < components; c += 1) {
      target[target0 + c] = source[source0 + c];
    }
    written += 1;
  }

  return written;
}

export function sourceIndexFor(slot: number, stride: number): number {
  return slot * stride;
}

export function slotForSource(sourceIndex: number, stride: number): number | null {
  if (sourceIndex < 0 || stride <= 0) {
    return null;
  }
  if (sourceIndex % stride !== 0) {
    return null;
  }
  return sourceIndex / stride;
}
