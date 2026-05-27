// ── Paleta de colores ─────────────────────────────────────────────────────────
export const COLORS = {
  // Fondo blanco — base del rediseño
  bg:            "#FFFFFF",
  bgSoft:        "#EEF2FF",                   // blanco levemente azulado

  // Tipografía sobre fondo claro
  ink:           "#08081A",                   // negro con tono índigo (premium)
  ink70:         "rgba(8,8,26,0.70)",
  ink45:         "rgba(8,8,26,0.45)",
  ink20:         "rgba(8,8,26,0.20)",
  ink08:         "rgba(8,8,26,0.08)",

  // Acento principal
  accent:        "#0055FF",                   // azul eléctrico vívido
  accentGlow:    "rgba(0,85,255,0.25)",
  accentDim:     "rgba(0,85,255,0.10)",

  // Confirmaciones / Empresa
  green:         "#00C853",
  greenGlow:     "rgba(0,200,83,0.25)",

  // Admin
  violet:        "#7C3AED",

  // Superficies oscuras (artefactos dark premium sobre blanco)
  surface:       "#0A0A1E",
  surfaceCard:   "#111127",
  surfaceBorder: "rgba(255,255,255,0.10)",

  // Tipografía sobre superficies oscuras
  white:         "#ffffff",
  white80:       "rgba(255,255,255,0.80)",
  white60:       "rgba(255,255,255,0.60)",
  white30:       "rgba(255,255,255,0.30)",
  white10:       "rgba(255,255,255,0.10)",
  white05:       "rgba(255,255,255,0.05)",
  glass:         "rgba(255,255,255,0.06)",
  glassBorder:   "rgba(255,255,255,0.12)",

  // Legado terminal
  terminal:      "#0D0D1A",
};

// ── Tipografías ───────────────────────────────────────────────────────────────
export const FONTS = {
  sans: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  mono: '"Fira Code", "Courier New", monospace',
};

// ── Frames por escena (30 FPS, total 2700 = 90s) ─────────────────────────────
export const SCENE_FRAMES = {
  S1:      { from: 0,    duration: 360 },   // 12s — El Problema
  SBRIDGE: { from: 360,  duration: 180 },   //  6s — Nace la línea digital
  S2A:     { from: 540,  duration: 540 },   // 18s — Estudiante
  S2B:     { from: 1080, duration: 420 },   // 14s — Empresa
  SLIVE:   { from: 1500, duration: 450 },   // 15s — Evento vivo          (NEW)
  S2C:     { from: 1950, duration: 390 },   // 13s — Admin
  S3:      { from: 2340, duration: 240 },   //  8s — Seguridad
  S4:      { from: 2580, duration: 120 },   //  4s — Cierre
};
// Total: 360+180+540+420+450+390+240+120 = 2700 ✓

// ── Configuraciones de spring ─────────────────────────────────────────────────
export const SPRING = {
  standard: { damping: 14, stiffness: 120 },
  gentle:   { damping: 20, stiffness:  80 },
  bouncy:   { damping: 10, stiffness: 100 },
  snappy:   { damping: 18, stiffness: 200 },
};
