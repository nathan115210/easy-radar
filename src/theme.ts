import { generateColors } from "@mantine/colors-generator";
import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * The app's one fixed theme (PRD §14.2). Every ramp is generated from
 * exactly one of the five approved seeds — no default Mantine blue/red/
 * green palette is referenced anywhere. Ramps are pre-generated here
 * rather than called at render time, per Mantine's own guidance for
 * `generateColors` (it needs a moment of arithmetic per shade, so doing
 * it once at module load avoids repeating that work on every render).
 */
const PRIMARY_SEED = "#3A506B"; // headings, active navigation, dark foreground
const ACCENT_SEED = "#5BC0BE"; // interactive accent, selected state, success
const SURFACE_SEED = "#CDEDF6"; // page surface, subtle highlight, information background
const SECONDARY_SURFACE_SEED = "#A8B59F"; // secondary surface, read state, calm success
const WARNING_SEED = "#C9A68B"; // warning and ignored/destructive confirmation

const primary: MantineColorsTuple = generateColors(PRIMARY_SEED);
const accent: MantineColorsTuple = generateColors(ACCENT_SEED);
const surface: MantineColorsTuple = generateColors(SURFACE_SEED);
const secondarySurface: MantineColorsTuple = generateColors(SECONDARY_SURFACE_SEED);
const warning: MantineColorsTuple = generateColors(WARNING_SEED);

export const theme = createTheme({
  primaryColor: "primary",
  colors: {
    primary,
    accent,
    surface,
    "secondary-surface": secondarySurface,
    warning,
  },
  // Local system font stack only — no CDN or remotely hosted font (PRD §14.2).
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
});
