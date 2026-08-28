/**
 * Design tokens.
 *
 * Every surface, border, shadow, and accent in the app resolves from here, so
 * that light and dark stay in step and a change to the visual language is a
 * change to one file. Components should read these rather than hardcoding rgba
 * strings inline.
 */

export const RADII = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  pill: '999px',
};

export const ACCENTS = {
  // One primary accent carries the brand. The rest are reserved for data
  // semantics (positive / negative / neutral series) and nothing else.
  primary: '#3b82f6',
  primaryMuted: 'rgba(59, 130, 246, 0.14)',
  positive: '#34d399',
  negative: '#fb7185',
  neutral: '#a78bfa',
  warning: '#fbbf24',
};

const dark = {
  canvas: '#0b1220',
  canvasGradient:
    'radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.10), transparent 60%), linear-gradient(180deg, #0d1526 0%, #0b1220 50%, #070c17 100%)',
  surface: 'rgba(19, 28, 46, 0.72)',
  surfaceRaised: 'rgba(25, 36, 58, 0.86)',
  surfaceSunken: 'rgba(9, 15, 27, 0.55)',
  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(148, 163, 184, 0.24)',
  text: '#e8edf5',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  shadow: '0 1px 2px rgba(2, 6, 23, 0.4), 0 8px 24px -8px rgba(2, 6, 23, 0.6)',
  shadowRaised: '0 1px 2px rgba(2, 6, 23, 0.5), 0 16px 40px -12px rgba(2, 6, 23, 0.7)',
  grid: 'rgba(148, 163, 184, 0.10)',
};

const light = {
  canvas: '#f6f8fc',
  canvasGradient:
    'radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.07), transparent 60%), linear-gradient(180deg, #fbfcfe 0%, #f6f8fc 50%, #eef2f8 100%)',
  surface: 'rgba(255, 255, 255, 0.86)',
  surfaceRaised: '#ffffff',
  surfaceSunken: 'rgba(241, 245, 249, 0.8)',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.14)',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  shadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -8px rgba(15, 23, 42, 0.10)',
  shadowRaised: '0 1px 2px rgba(15, 23, 42, 0.05), 0 16px 40px -12px rgba(15, 23, 42, 0.14)',
  grid: 'rgba(15, 23, 42, 0.07)',
};

/** Resolve the palette for the active mode. */
export function palette(isDarkMode) {
  return isDarkMode ? dark : light;
}

/**
 * Lining, tabular figures. Applied to any element showing a number that sits in
 * a column or changes in place, so digits stop jittering as values update.
 */
export const TABULAR = {
  fontVariantNumeric: 'tabular-nums lining-nums',
  fontFeatureSettings: `'tnum' 1, 'lnum' 1`,
};

/**
 * Chart series colors, validated with the data-viz palette checker against both
 * surfaces (lightness band, chroma floor, CVD separation, normal-vision floor,
 * contrast — all pass; worst adjacent pair ΔE 24.7 protan / 33.6 normal).
 * Assigned by identity, in fixed order — never cycled, never reassigned by rank.
 */
const seriesDark = {
  netTips: '#3987e5',
  tipOut: '#d95926',
};

const seriesLight = {
  netTips: '#2a78d6',
  tipOut: '#eb6834',
};

export function series(isDarkMode) {
  return isDarkMode ? seriesDark : seriesLight;
}
