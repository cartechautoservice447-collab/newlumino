import { useCustomization } from "@/context/customization-context";

const FILTER_ID = "liquid-glass-refraction";

/**
 * Mounted once by CustomizationProvider. Renders nothing when the effect is
 * off. When on, it injects the SVG feTurbulence/feDisplacementMap filter
 * (id="liquid-glass-refraction") that src/styles.css references on
 * `.glass-panel::before` — and styles.css only *applies* that filter on
 * devices with a fine pointer + hover support (desktop), so mobile skips
 * the expensive part automatically.
 *
 * Everything else — the transparent panel background, refractive backdrop
 * blur, edge specular highlight, and the hover/tap bounce — lives entirely
 * in CSS now, gated by [data-liquid-glass="on"] on <html>. There is no
 * JS listener or animation loop here anymore; that was the source of the
 * mobile lag, and it's no longer needed now that the highlight is a static
 * edge glow instead of a cursor-tracked spotlight.
 */
export function LiquidGlassEngine() {
  const { settings } = useCustomization();
  const { liquidGlassEnabled, liquidDensity, liquidClearness } = settings;

  if (!liquidGlassEnabled) return null;

  // Restrained range (was 6–40, now 3–17) so the refraction reads as
  // "crystal clear glass" rather than melted, even before clipping.
  const scale = 3 + (liquidClearness / 100) * 14; // feDisplacementMap scale
  const freq = 0.006 + (liquidDensity / 40) * 0.05; // feTurbulence baseFrequency

  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden">
      <defs>
        <filter id={FILTER_ID} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={freq}
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation={liquidDensity / 8} result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
