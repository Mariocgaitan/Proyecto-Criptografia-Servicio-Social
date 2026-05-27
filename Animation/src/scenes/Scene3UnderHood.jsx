import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Fase 1: Pares problema → solución
const PAIRS = [
  { bad: "Formularios en papel", good: "QR digital instantáneo",  startF: 75 },
  { bad: "Filas de espera",      good: "Inscripción en 2.3s",     startF: 112 },
  { bad: "Sin historial",        good: "Dashboard en tiempo real", startF: 148 },
];

// Fase 2: Tech stack
const TECHS = [
  { name: "FastAPI",      role: "API REST + async",     color: COLORS.accent,  startF: 210 },
  { name: "React",        role: "SPA frontend",          color: "#61DAFB",      startF: 222 },
  { name: "PostgreSQL",   role: "Base de datos",         color: "#336791",      startF: 234 },
  { name: "Redis",        role: "Cache · QR tokens",    color: "#DC382D",      startF: 246 },
  { name: "Docker",       role: "Contenedores prod",     color: "#2496ED",      startF: 258 },
  { name: "AWS EC2",      role: "Infraestructura cloud", color: "#FF9900",      startF: 270 },
  { name: "TOTP RFC6238", role: "2FA autenticación",     color: COLORS.violet,  startF: 282 },
  { name: "OAuth 2.0",    role: "SSO Google",            color: "#4285F4",      startF: 294 },
];

// Fase 3: Estadísticas de impacto
const STATS = [
  { value: "0",    unit: "papel",              label: "Proceso 100% digital",      color: COLORS.green,  startF: 345 },
  { value: "2.3s", unit: "",                   label: "por inscripción",            color: COLORS.accent, startF: 380 },
  { value: "+500", unit: "insc / feria",       label: "escala sin problema",        color: COLORS.violet, startF: 412 },
];

export const Scene3UnderHood = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 22], [0, 1], C);
  const sceneOut = interpolate(frame, [422, 450], [1, 0], C);
  const labelOp  = interpolate(frame, [10, 38], [0, 1], C);

  // Opacidades de fase (timing más lento)
  const phase1Op = Math.min(
    interpolate(frame, [18, 46], [0, 1], C),
    interpolate(frame, [165, 188], [1, 0], C)
  );
  const phase2Op = Math.min(
    interpolate(frame, [188, 212], [0, 1], C),
    interpolate(frame, [310, 330], [1, 0], C)
  );
  const phase3Op = interpolate(frame, [330, 352], [0, 1], C);

  return (
    <div style={{
      width: 1920, height: 1080, backgroundColor: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity: Math.min(sceneIn, sceneOut),
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `radial-gradient(circle, ${COLORS.ink} 1px, transparent 1px)`,
        backgroundSize: "56px 56px",
      }} />

      {/* Etiqueta */}
      <div style={{
        position: "absolute", top: 60, left: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>
        03 · Por qué funciona
      </div>

      {/* ── FASE 1: Lo que resolvemos ── */}
      <div style={{
        position: "absolute", width: "100%", display: "flex",
        flexDirection: "column", alignItems: "center", gap: 0,
        opacity: phase1Op,
      }}>
        {/* Título */}
        <div style={{
          fontFamily: FONTS.sans, fontSize: 18, fontWeight: 600,
          color: COLORS.ink45, letterSpacing: "4px", textTransform: "uppercase",
          marginBottom: 42,
          opacity: interpolate(frame, [18, 46], [0, 1], C),
        }}>
          Lo que resolvemos
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, width: 900 }}>
          {PAIRS.map((p, i) => {
            const pairOp = interpolate(frame, [p.startF, p.startF + 22], [0, 1], C);
            const pairY  = interpolate(frame, [p.startF, p.startF + 22], [18, 0], C);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 24,
                opacity: pairOp, transform: `translateY(${pairY}px)`,
              }}>
                {/* BAD */}
                <div style={{
                  flex: 1, padding: "14px 20px", borderRadius: 10,
                  backgroundColor: "rgba(255,68,68,0.06)",
                  border: "1px solid rgba(255,68,68,0.18)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 16, color: "#FF4444" }}>✗</span>
                  <span style={{ fontFamily: FONTS.sans, fontSize: 17, color: COLORS.ink, fontWeight: 500 }}>{p.bad}</span>
                </div>
                {/* Arrow */}
                <span style={{ fontSize: 22, color: COLORS.ink45 }}>→</span>
                {/* GOOD */}
                <div style={{
                  flex: 1, padding: "14px 20px", borderRadius: 10,
                  backgroundColor: "rgba(0,200,83,0.06)",
                  border: "1px solid rgba(0,200,83,0.22)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 16, color: COLORS.green }}>✓</span>
                  <span style={{ fontFamily: FONTS.sans, fontSize: 17, color: COLORS.ink, fontWeight: 600 }}>{p.good}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FASE 2: Stack tecnológico ── */}
      <div style={{
        position: "absolute", width: "100%", display: "flex",
        flexDirection: "column", alignItems: "center",
        opacity: phase2Op,
      }}>
        <div style={{
          fontFamily: FONTS.sans, fontSize: 18, fontWeight: 600,
          color: COLORS.ink45, letterSpacing: "4px", textTransform: "uppercase",
          marginBottom: 40,
          opacity: interpolate(frame, [148, 172], [0, 1], C),
        }}>
          Stack tecnológico
        </div>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center",
          maxWidth: 1040,
        }}>
          {TECHS.map((t, i) => {
            const chipOp  = interpolate(frame, [t.startF, t.startF + 16], [0, 1], C);
            const chipScl = spring({ frame: frame - t.startF, fps, config: { damping: 26, stiffness: 200 }, from: 0.78, to: 1 });
            return (
              <div key={i} style={{
                padding: "12px 20px", borderRadius: 12,
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.surfaceBorder}`,
                display: "flex", flexDirection: "column", gap: 4, minWidth: 160,
                opacity: chipOp, transform: `scale(${chipScl})`,
                boxShadow: `0 0 20px ${t.color}18`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}` }} />
                  <span style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: COLORS.white }}>
                    {t.name}
                  </span>
                </div>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "0.3px" }}>
                  {t.role}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FASE 3: Resultados ── */}
      <div style={{
        position: "absolute", width: "100%", display: "flex",
        flexDirection: "column", alignItems: "center",
        opacity: phase3Op,
      }}>
        <div style={{
          fontFamily: FONTS.sans, fontSize: 18, fontWeight: 600,
          color: COLORS.ink45, letterSpacing: "4px", textTransform: "uppercase",
          marginBottom: 60,
        }}>
          Resultados
        </div>

        <div style={{ display: "flex", gap: 80, alignItems: "flex-end" }}>
          {STATS.map((s, i) => {
            const stScl = spring({ frame: frame - s.startF, fps, config: { damping: 24, stiffness: 180 }, from: 0.5, to: 1 });
            const stBlr = interpolate(frame, [s.startF, s.startF + 28], [20, 0], C);
            const stOp  = interpolate(frame, [s.startF, s.startF + 22], [0, 1], C);
            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                opacity: stOp, transform: `scale(${stScl})`,
                filter: `blur(${stBlr}px)`,
              }}>
                {/* Línea decorativa top */}
                <div style={{ width: 2, height: 40, backgroundColor: s.color, borderRadius: 2, opacity: 0.5 }} />
                {/* Número */}
                <div style={{
                  fontFamily: FONTS.sans, fontWeight: 900, lineHeight: 1,
                  letterSpacing: "-3px",
                  fontSize: 100,
                  color: s.color,
                  textShadow: `0 0 60px ${s.color}55`,
                }}>
                  {s.value}
                  {s.unit && (
                    <span style={{ fontSize: 28, fontWeight: 400, letterSpacing: "0px", marginLeft: 8, color: `${s.color}AA` }}>
                      {s.unit}
                    </span>
                  )}
                </div>
                {/* Label */}
                <div style={{
                  fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink45,
                  fontWeight: 400, letterSpacing: "0.5px",
                }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
