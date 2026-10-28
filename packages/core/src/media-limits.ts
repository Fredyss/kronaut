export interface Ratio {
  readonly width: number;
  readonly height: number;
}

export interface ImageLimits {
  readonly mimes: readonly string[];
  readonly maxBytes: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minAspect?: Ratio;
  readonly maxAspect?: Ratio;
}

export interface VideoLimits {
  readonly mimes: readonly string[];
  readonly maxBytes: number;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly minAspect?: Ratio;
  readonly maxAspect?: Ratio;
  readonly maxFrameRate?: number;
  readonly maxPixels?: number;
}

export interface MediaLimits {
  readonly minCount: number;
  readonly maxCount: number;
  readonly image?: ImageLimits;
  readonly video?: VideoLimits;
  readonly mixed: boolean;
  readonly altText: {
    readonly supported: boolean;
    readonly required: boolean;
    readonly maxLength: number;
  };
  readonly aiLabel: boolean;
}
