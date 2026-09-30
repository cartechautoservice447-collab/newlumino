import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useCustomization } from "@/context/customization-context";
import { cn } from "@/lib/utils";

type GlassPanelProps = {
  children: ReactNode;
  className?: string;
  draggable?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
};

/**
 * Exact GlassPanel element adapted from fluid-glass-studio.
 * When in "fluid-glass" (old website) theme, renders the authentic 3D water-gel lens,
 * specular sheen, liquid refraction filter (#liquid-refraction), and veil layer.
 * When in default NewLumino theme, gracefully defaults to the standard .glass-panel.
 */
export function GlassPanel({
  children,
  className,
  draggable = false,
  onClick,
  interactive = Boolean(onClick),
  style,
}: GlassPanelProps) {
  const { settings } = useCustomization();
  const isFluidGlass = settings.theme === "fluid-glass";

  if (!isFluidGlass) {
    return (
      <div
        onClick={onClick}
        style={style}
        className={cn("glass-panel relative", className)}
      >
        {children}
      </div>
    );
  }

  const gel = (settings.fluidGel ?? 55) / 100;
  const spring = {
    type: "spring" as const,
    stiffness: settings.fluidBounceStiffness ?? 200,
    damping: settings.fluidBounceDamping ?? 24,
    mass: 0.6 + gel * 0.4,
  };

  return (
    <motion.div
      onClick={onClick}
      drag={draggable}
      dragElastic={0.25}
      dragConstraints={{ left: -40, right: 40, top: -30, bottom: 30 }}
      dragSnapToOrigin
      whileHover={interactive ? { scale: 1.02, y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      transition={spring}
      style={{
        backgroundColor: "var(--water-gel-bg)",
        backdropFilter: "blur(var(--fluid-density, 12px)) saturate(200%) contrast(105%)",
        WebkitBackdropFilter: "blur(var(--fluid-density, 12px)) saturate(200%) contrast(105%)",
        borderRadius: `var(--fluid-border-radius, ${18 + gel * 26}px)`,
        border: "1px solid rgba(255, 255, 255, 0.22)",
        borderTopColor: "rgba(255, 255, 255, 0.4)",
        boxShadow: `inset 0 ${1 + gel * 1.5}px ${2 + gel * 3}px 0 rgba(255, 255, 255, ${0.35 + gel * 0.3}), inset 0 -${2 + gel * 3}px ${4 + gel * 6}px 0 rgba(0, 0, 0, ${0.16 + gel * 0.2}), 0 ${8 + gel * 10}px ${32 + gel * 24}px 0 rgba(0, 0, 0, ${0.2 + gel * 0.22})`,
        ...style,
      }}
      className={cn(
        "liquid-panel relative overflow-hidden will-change-transform",
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {/* 3D Glass Lens Specular Sheen Gradient */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.02) 55%, rgba(255, 255, 255, 0.09) 100%)",
        }}
      />
      {/* Edge Refraction Filter Layer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border border-white/35 mix-blend-screen opacity-25"
        style={{ filter: "url(#liquid-refraction)" }}
      />
      {/* Dynamic Veil Layer for Light/Night theme contrast */}
      <span aria-hidden className="liquid-veil pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />
      {children}
    </motion.div>
  );
}
