import { useCustomization } from "@/context/customization-context";

const FILTER_ID = "liquid-glass-refraction";

export function LiquidGlassEngine() {
  const { settings } = useCustomization();
  const { liquidGlassEnabled, liquidDensity, liquidClearness } = settings;

  if (!liquidGlassEnabled) return null;

  const scale = 3 + (liquidClearness / 100) * 14;
  const freq = 0.006 + (liquidDensity / 40) * 0.05;

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
