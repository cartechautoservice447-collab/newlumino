import { useCustomization } from "@/context/customization-context";

const FILTER_ID = "liquid-glass-refraction";
const FLUID_FILTER_ID = "liquid-refraction";

export function LiquidGlassEngine() {
  const { settings } = useCustomization();
  const { liquidGlassEnabled, liquidDensity, liquidClearness, fluidClearness } = settings;

  // Fluid Glass Studio (Old website) refraction parameters:
  const fluidClarity = (fluidClearness ?? 35) / 100;
  const fluidFreq = (0.006 + (1 - fluidClarity) * 0.02).toFixed(4);
  const fluidScale = Number((1 + (1 - fluidClarity) * 5).toFixed(2));

  // Default NewLumino liquid parameters:
  const scale = 3 + (liquidClearness / 100) * 14;
  const freq = 0.006 + (liquidDensity / 40) * 0.05;

  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden" focusable="false">
      <defs>
        {/* Old Website Theme (Fluid Glass Studio) SVG Refraction Filter */}
        <filter id={FLUID_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={fluidFreq}
            numOctaves={2}
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale={fluidScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Current Website Default Liquid Glass Refraction Filter */}
        {liquidGlassEnabled && (
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
        )}
      </defs>
    </svg>
  );
}
