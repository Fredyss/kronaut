export interface Ratio {
  readonly width: number;
  readonly height: number;
}

export interface AspectRange {
  readonly min: Ratio;
  readonly max: Ratio;
}

const ratioOf = ({ width, height }: Ratio) => width / height;

export function clampAspect(ratio: Ratio, range: AspectRange | null): Ratio {
  if (range === null) return ratio;
  if (ratioOf(ratio) < ratioOf(range.min)) return range.min;
  if (ratioOf(ratio) > ratioOf(range.max)) return range.max;
  return ratio;
}
