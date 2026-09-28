# Customization Engine (Settings Modal)

A gear button at the bottom of the sidebar opens a glassmorphic "Engine Customization" panel that live-controls theme, glass quality, motion and typography. All values persist in localStorage and apply instantly through root CSS variables.

## Settings panel

- Gear button pinned to the bottom of Column 1, matching the existing glass control styling.
- Opens a dialog built on the existing shadcn dialog, restyled as a glass panel with sections: Theme, Glass, Motion, Typography.
- Footer with "Reset to defaults".
- Every control updates the live app immediately (no Apply button).

## Theme base

Three options: Original (current sapphire/violet glows on GitHub dark), Dark (flat deep slate, glows removed), White / Light Glass (light surfaces, dark text, soft cool glows). Switching swaps the background gradient layers and text/border contrast tokens. Code blocks keep the exact GitHub Dark palette in all themes.

## Glass quality

- Preset ticks: Low / Medium / High / Ultra — each sets blur, transparency and thickness together.
- Sliders that fine-tune (and switch the preset to "Custom"):
  - Glass blur: 0–32px
  - Glass transparency: 10–90% panel opacity
  - Glass thickness: border width plus shadow depth

## Motion

Four tiers driving a motion multiplier and a reduced-motion flag:

- Low: animations disabled, transitions near-zero, pulse glow off.
- Medium: standard transitions on layout changes and card hovers.
- High: longer fluid panel resizing, hover scaling, active-press depth.
- Ultra: spring easing, micro-pulse glow rings, GPU-accelerated (will-change/transform) transitions.

Motion also respects the OS `prefers-reduced-motion` setting as a floor.

## Typography

- UI font: Inter, System Sans, JetBrains Mono (Fira Code / JetBrains Mono stack already loaded for code).
- UI font size and line height sliders.
- Editor font size and line height sliders (applies to the markdown textarea and preview).

## Technical notes

- New `src/lib/customization.ts`: settings type, defaults, presets, localStorage load/save, and a `toCssVars(settings)` mapper.
- New `src/context/customization-context.tsx`: `CustomizationProvider` + `useCustomization()`; hydrates from localStorage after mount (avoids SSR mismatch), writes CSS custom properties and a `data-theme` / `data-motion` attribute onto `document.documentElement`.
- Provider mounted in `src/routes/__root.tsx` so variables exist app-wide.
- `src/styles.css`: introduce variables `--glass-blur`, `--glass-alpha`, `--glass-border-w`, `--glass-shadow-strength`, `--motion-scale`, `--ui-font`, `--ui-font-size`, `--ui-line-height`, `--editor-font-size`, `--editor-line-height`, plus theme blocks for the three bases. `glass-panel` and `app-backdrop` utilities read these instead of fixed values; existing hard-coded `backdrop-blur-*` classes on the panels are replaced with a variable-driven glass class.
- New `src/components/settings/settings-dialog.tsx` (sections split into small subcomponents) using existing shadcn dialog, slider, switch, and radio/tick controls.
- `src/components/notes/sidebar-panel.tsx` gains the gear button; `src/routes/index.tsx` owns the open state.
- No backend; notes logic untouched.
