import { PixelRatio, useWindowDimensions } from 'react-native';

/** Logical-width reference (common phone) for proportional scaling */
const GUIDE_WIDTH = 375;

/**
 * Limits system font scaling so layouts stay stable while remaining accessible.
 */
export const TEXT_MAX_FONT_MULTIPLIER = 1.35;

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  /** Web can report 0×0 for one frame before layout; avoid collapsed layouts. */
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const shortSide = Math.min(w, h);
  const longSide = Math.max(w, h);

  const widthRatio = shortSide / GUIDE_WIDTH;

  const scale = (size: number) =>
    PixelRatio.roundToNearestPixel(size * widthRatio);

  /** Grows slower than `scale` — better for typography and tablets */
  const moderate = (size: number, factor = 0.55) =>
    PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);

  /** Use for text sizes; system `fontScale` applied via Text + maxFontSizeMultiplier */
  const scaledFont = (size: number) => moderate(size);

  const gutter = Math.max(12, Math.min(44, Math.round(w * 0.06)));

  const contentMaxWidth = Math.min(shortSide * 0.92, 520);

  return {
    width: w,
    height: h,
    shortSide,
    longSide,
    fontScale,
    scale,
    moderate,
    scaledFont,
    gutter,
    contentMaxWidth,
  };
}
