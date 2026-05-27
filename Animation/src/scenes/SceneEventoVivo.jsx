import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { QRAbstractGrid } from "../components/QRAbstractGrid.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Estudiantes que se registran en tiempo real
const REGS = [
  { name: "Carlos Silva",    tec: "A01234567", empresa: "Cemex",   t: 82  },
  { name: "Sofia Ramirez",   tec: "A01098765", empresa: "Femsa",   t: 98  },
  { name: "Diego Torres",    tec: "A01182345", empresa: "OXXO",    t: 115 },
  { name: "Ana Gutierrez",   tec: "A01456789", empresa: "Bimbo",   t: 130 },
  { name: "Luis Hernandez",  tec: "A01789012", empresa: "Cemex",   t: 145 },
  { name: "Valeria Morales", tec: "A01234012", empresa: "Banorte", t: 160 },
  { name: "Marco Jimenez",   tec: "A01345678", empresa: "Femsa",   t: 174 },
  { name: "Isabella Vega",   tec: "A01567890", empresa: "OXXO",    t: 188 },
];

const STEPS = [
  "Escanear QR del stand",
  "Iniciar sesion con @tec.mx",
  "Completar perfil (4 campos)",
];

const QR_SIZE = 280;

export const SceneEventoVivo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 22], [0, 1], C);
  const sceneOut = interpolate(frame, [420, 450], [1, 0], C);
  const opacity  = Math.min(sceneIn, sceneOut);
  const labelOp  = interpolate(frame, [8, 32], [0, 1], C);

  // ── QR scan animation ─────────────────────────────────────────────
  const qrOp     = interpolate(frame, [12, 42], [0, 1], C);
  const laserY   = interpolate(frame, [38, 90], [0, 1], C);
  const laserOp  = frame >= 38 && frame < 90
    ? Math.min(interpolate(frame, [38, 52], [0, 1], C), interpolate(frame, [80, 90], [1, 0], C))
    : 0;
  const scanDone  = frame >= 92;
  const scanFlash = scanDone ? interpolate(frame, [92, 112], [0.55, 0], C) : 0;
  const checkOp   = scanDone ? interpolate(frame, [94, 116], [0, 1], C) : 0;
  const qrGlow    = scanDone ? Math.min(interpolate(frame, [92, 135], [0, 1], C), 1) : 0;

  // Step indicators
  const stepOps = [
    interpolate(frame, [18, 40], [0, 1], C),
    interpolate(frame, [34, 56], [0, 1], C),
    interpolate(frame, [50, 72], [0, 1], C),
  ];

  // ── Live counter ───────────────────────────────────────────────────
  const counterOp  = interpolate(frame, [72, 98], [0, 1], C);
  const counterVal = Math.floor(interpolate(frame, [88, 272], [0, 260], C));
  const dotPulse   = 0.5 + 0.5 * Math.sin(frame / 8 * Math.PI);

  // ── Stats ──────────────────────────────────────────────────────────
  const statsOp  = interpolate(frame, [298, 340], [0, 1], C);
  const statsScl = spring({ frame: frame - 298, fps, config: { damping: 30, stiffness: 190 }, from: 0.9, to: 1 });

  // ── Zoom push ──────────────────────────────────────────────────────
  const sceneZoom = interpolate(frame, [402, 450], [1, 1.05], C);

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: COLORS.surface,
      position: "relative", overflow: "hidden",
      opacity,
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(0,85,255,0.09) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
      {/* Top ambient */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 280, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,85,255,0.07) 0%, transparent 100%)",
      }} />

      {/* Scene label */}
      <div style={{
        position: "absolute", top: 52, left: 80, zIndex: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.white30,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>04 · Evento en vivo</div>

      {/* Zoom wrapper */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${sceneZoom})`, transformOrigin: "50% 50%" }}>

        {/* MAIN LAYOUT — two columns */}
        <div style={{
          position: "absolute", top: 96, left: 80, right: 80, bottom: 52,
          display: "flex", gap: 0,
        }}>

          {/* ═══════════════ LEFT: QR Stand ═══════════════ */}
          <div style={{
            width: 490, flexShrink: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 26, opacity: qrOp,
          }}>
            {/* QR card */}
            <div style={{
              width: QR_SIZE + 56, height: QR_SIZE + 56,
              backgroundColor: "#FFFFFF", borderRadius: 22, padding: 28,
              position: "relative", overflow: "hidden",
              boxShadow: scanDone
                ? `0 0 ${40 + qrGlow * 55}px rgba(0,85,255,${0.32 + qrGlow * 0.18}), 0 24px 80px rgba(0,0,0,0.6)`
                : "0 24px 80px rgba(0,0,0,0.55)",
            }}>
              <QRAbstractGrid
                size={QR_SIZE}
                startFrame={16}
                buildDuration={72}
                cellColor={COLORS.ink}
              />

              {/* Laser beam sweeping QR */}
              {!scanDone && laserOp > 0 && (
                <div style={{
                  position: "absolute",
                  left: 28, right: 28,
                  top: 28 + laserY * QR_SIZE,
                  height: 3,
                  background: `linear-gradient(90deg, transparent, ${COLORS.accent} 25%, ${COLORS.accent} 75%, transparent)`,
                  boxShadow: `0 0 16px ${COLORS.accent}, 0 0 32px rgba(0,85,255,0.5)`,
                  opacity: laserOp, pointerEvents: "none",
                }} />
              )}

              {/* Scan flash */}
              {scanFlash > 0 && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 20,
                  backgroundColor: COLORS.accent, opacity: scanFlash * 0.38,
                  pointerEvents: "none",
                }} />
              )}

              {/* Success checkmark */}
              {scanDone && checkOp > 0 && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 20,
                  backgroundColor: `rgba(0,85,255,${checkOp * 0.06})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <div style={{
                    fontFamily: FONTS.sans, fontSize: 72, fontWeight: 900,
                    color: COLORS.accent, opacity: checkOp,
                    textShadow: `0 0 30px rgba(0,85,255,0.45)`,
                  }}>✓</div>
                </div>
              )}
            </div>

            {/* Stand label */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 700, color: COLORS.white, letterSpacing: "-0.3px" }}>
                Feria Servicio Social
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.white30, marginTop: 5, letterSpacing: "1px", textTransform: "uppercase" }}>
                Escanea para registrarte
              </div>
            </div>

            {/* 3 steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 11, width: "100%", paddingLeft: 16, paddingRight: 16 }}>
              {STEPS.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, opacity: stepOps[i] }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: i === 0 && scanDone ? COLORS.accent : "rgba(0,85,255,0.15)",
                    border: `2px solid ${i === 0 && scanDone ? COLORS.accent : "rgba(0,85,255,0.35)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FONTS.mono, fontSize: 11, fontWeight: 700,
                    color: i === 0 && scanDone ? COLORS.white : COLORS.white60,
                  }}>
                    {i === 0 && scanDone ? "✓" : `${i + 1}`}
                  </div>
                  <span style={{
                    fontFamily: FONTS.sans, fontSize: 14,
                    color: i === 0 && scanDone ? COLORS.white80 : COLORS.white60,
                  }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, flexShrink: 0, backgroundColor: COLORS.surfaceBorder, margin: "0 44px" }} />

          {/* ═══════════════ RIGHT: Live feed ═══════════════ */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 4 }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20, opacity: counterOp,
            }}>
              <div style={{
                fontFamily: FONTS.mono, fontSize: 11, color: COLORS.white30,
                letterSpacing: "2.5px", textTransform: "uppercase",
              }}>Registros en tiempo real</div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 18px", borderRadius: 20,
                backgroundColor: "rgba(0,85,255,0.10)", border: "1px solid rgba(0,85,255,0.28)",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: dotPulse }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent, letterSpacing: "1.5px" }}>EN VIVO</span>
              </div>
            </div>

            {/* Big counter */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8, opacity: counterOp }}>
              <span style={{
                fontFamily: FONTS.sans, fontSize: 100, fontWeight: 900,
                color: COLORS.white, letterSpacing: "-5px", lineHeight: 1,
              }}>{counterVal}</span>
              <span style={{ fontFamily: FONTS.sans, fontSize: 22, color: COLORS.white60, letterSpacing: "-0.5px" }}>
                estudiantes
              </span>
            </div>

            <div style={{ height: 1, backgroundColor: COLORS.surfaceBorder, marginBottom: 16, opacity: counterOp }} />

            {/* Registration cards */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>
              {REGS.map((r, i) => {
                if (frame < r.t) return null;
                const rowOp = interpolate(frame, [r.t, r.t + 16], [0, 1], C);
                const isNew = frame < r.t + 34;
                const ini   = r.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 16px", borderRadius: 10,
                    backgroundColor: isNew ? "rgba(0,85,255,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isNew ? "rgba(0,85,255,0.22)" : "rgba(255,255,255,0.05)"}`,
                    opacity: rowOp,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: "rgba(0,85,255,0.16)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: FONTS.mono, fontSize: 12, fontWeight: 700, color: COLORS.accent,
                    }}>{ini}</div>
                    <span style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.white80, flex: 1 }}>{r.name}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30 }}>{r.tec}</span>
                    <span style={{
                      fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent,
                      padding: "3px 12px", borderRadius: 12,
                      backgroundColor: "rgba(0,85,255,0.12)",
                    }}>{r.empresa}</span>
                    {isNew && <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: dotPulse, flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            {/* Stats bar */}
            <div style={{
              padding: "16px 22px", borderRadius: 14, marginTop: 16,
              backgroundColor: "rgba(0,85,255,0.06)", border: "1px solid rgba(0,85,255,0.16)",
              display: "flex", opacity: statsOp,
              transform: `scale(${statsScl})`, transformOrigin: "left center",
            }}>
              {[
                { val: "260",  label: "registros" },
                { val: "0",    label: "formularios en papel" },
                { val: "8.3s", label: "promedio por registro" },
              ].map(({ val, label }, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: "center",
                  borderLeft: i > 0 ? `1px solid ${COLORS.surfaceBorder}` : "none",
                }}>
                  <div style={{
                    fontFamily: FONTS.sans, fontSize: 28, fontWeight: 800,
                    color: COLORS.white, letterSpacing: "-1px",
                  }}>{val}</div>
                  <div style={{
                    fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30,
                    marginTop: 3, letterSpacing: "0.5px",
                  }}>{label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
