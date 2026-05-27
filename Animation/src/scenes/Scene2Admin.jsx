import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Duration: 390 frames (13 s @ 30 fps)

const CAPACITY_BARS = [
  { label: "Cemex",   used: 3, max: 5, color: COLORS.accent            },
  { label: "Femsa",   used: 1, max: 3, color: COLORS.violet            },
  { label: "OXXO",    used: 4, max: 5, color: "#4D7AFF"               },
  { label: "Bimbo",   used: 2, max: 4, color: "#A375FF"               },
  { label: "Banorte", used: 3, max: 4, color: "rgba(255,255,255,0.45)" },
];

const LIVE_FEED = [
  { name: "Carlos Silva",    code: "A01234567", empresa: "Cemex",   t: 88  },
  { name: "Sofia Ramirez",   code: "A01098765", empresa: "Femsa",   t: 108 },
  { name: "Diego Torres",    code: "A01182345", empresa: "OXXO",    t: 125 },
  { name: "Ana Gutierrez",   code: "A01456789", empresa: "Bimbo",   t: 142 },
  { name: "Luis Hernandez",  code: "A01789012", empresa: "Cemex",   t: 158 },
  { name: "Valeria Morales", code: "A01234012", empresa: "Banorte", t: 173 },
];

const COMPANIES = ["Cemex", "Femsa", "OXXO", "Bimbo", "Banorte"];
const CRED_USERS = ["cemex_admin", "femsa_ops", "oxxo_scanner"];

export const Scene2Admin = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 22], [0, 1], C);
  const sceneOut = interpolate(frame, [368, 390], [1, 0], C);
  const opacity  = Math.min(sceneIn, sceneOut);
  const labelOp  = interpolate(frame, [8, 32], [0, 1], C);

  const chromeOp = interpolate(frame, [5, 35], [0, 1], C);

  // Headline
  const headlineOp  = interpolate(frame, [15, 42], [0, 1], C);
  const headlineScl = spring({ frame: frame - 15, fps, config: { damping: 28, stiffness: 195 }, from: 0.88, to: 1 });

  // Status badge
  const statusOp = interpolate(frame, [30, 55], [0, 1], C);
  const dotPulse = 0.55 + 0.45 * Math.sin((frame / 6) * Math.PI);

  // Left panel
  const leftOp       = interpolate(frame, [28, 55], [0, 1], C);
  const toggleX      = interpolate(frame, [56, 70], [2, 24], C);
  const isToggleOn   = frame >= 63;
  const iniciaBtnOp  = interpolate(frame, [40, 62], [0, 1], C);
  const csvOp        = interpolate(frame, [82, 108], [0, 1], C);
  const credOp       = interpolate(frame, [100, 125], [0, 1], C);

  // Center panel
  const feedTitleOp = interpolate(frame, [72, 96], [0, 1], C);
  const countOp     = interpolate(frame, [38, 62], [0, 1], C);
  const inscritos   = Math.floor(interpolate(frame, [42, 210], [0, 260], C));
  const statOp      = interpolate(frame, [202, 230], [0, 1], C);

  // Right panel
  const rightOp = interpolate(frame, [52, 76], [0, 1], C);
  const barProg = interpolate(frame, [62, 170], [0, 1], C);
  const tagsOp  = interpolate(frame, [142, 168], [0, 1], C);
  const projOp  = interpolate(frame, [198, 225], [0, 1], C);

  // Push zoom
  const sceneZoom = interpolate(frame, [358, 390], [1, 1.04], C);

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: COLORS.surface,
      position: "relative", overflow: "hidden",
      opacity,
    }}>
      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,85,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,85,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px", opacity: 0.8,
      }} />

      {/* Top glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 220, pointerEvents: "none",
        background: "linear-gradient(180deg, rgba(0,85,255,0.07) 0%, transparent 100%)",
      }} />

      {/* Zoom wrapper */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${sceneZoom})`, transformOrigin: "50% 50%" }}>

        {/* TOP NAV */}
        <div style={{
          position: "absolute", top: 48, left: 80, right: 80,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          opacity: chromeOp, zIndex: 30,
        }}>
          <div style={{ opacity: headlineOp, transform: `scale(${headlineScl})`, transformOrigin: "left center" }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 34, fontWeight: 800, color: COLORS.white, letterSpacing: "-1px" }}>
              Control en tiempo real.
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.white60, letterSpacing: "2px", textTransform: "uppercase", marginTop: 4 }}>
              Feria Servicio Social - Panel de administracion
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", borderRadius: 30,
            backgroundColor: "rgba(0,85,255,0.10)", border: "1px solid rgba(0,85,255,0.28)",
            opacity: statusOp,
          }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: dotPulse, boxShadow: `0 0 10px ${COLORS.accent}` }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.accent, letterSpacing: "1.5px", textTransform: "uppercase" }}>Evento activo</span>
          </div>
        </div>

        {/* Top divider */}
        <div style={{ position: "absolute", top: 146, left: 80, right: 80, height: 1, backgroundColor: COLORS.surfaceBorder, opacity: chromeOp }} />

        {/* THREE COLUMNS */}
        <div style={{ position: "absolute", top: 158, left: 80, right: 80, bottom: 72, display: "flex", gap: 0, opacity: chromeOp }}>

          {/* LEFT: Controles */}
          <div style={{ width: 330, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingRight: 28, opacity: leftOp }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 2 }}>Controles</div>

            {/* Pre-registro toggle */}
            <div style={{ padding: "16px 18px", borderRadius: 12, backgroundColor: COLORS.surfaceCard, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 600, color: COLORS.white }}>Pre-registro</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: isToggleOn ? COLORS.white80 : COLORS.white30, marginTop: 3 }}>
                    {isToggleOn ? "Abierto" : "Cerrado"}
                  </div>
                </div>
                <div style={{ width: 50, height: 26, borderRadius: 13, position: "relative", backgroundColor: isToggleOn ? COLORS.accent : "rgba(255,255,255,0.18)", boxShadow: isToggleOn ? `0 0 12px ${COLORS.accentGlow}` : "none", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: toggleX, width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            </div>

            {/* Iniciar evento */}
            <div style={{ padding: "15px 18px", borderRadius: 12, backgroundColor: COLORS.accent, boxShadow: `0 4px 22px ${COLORS.accentGlow}`, display: "flex", alignItems: "center", gap: 10, opacity: iniciaBtnOp }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.mono, fontSize: 12, color: COLORS.white }}>
                &#9654;
              </div>
              <span style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: COLORS.white }}>Iniciar evento</span>
            </div>

            {/* CSV */}
            <div style={{ padding: "13px 16px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12, opacity: csvOp }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(0,85,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.mono, fontSize: 10, color: COLORS.accent }}>CSV</div>
              <div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80 }}>Carga masiva</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.white30, marginTop: 2 }}>/api/admin/upload-csv</div>
              </div>
            </div>

            {/* Credenciales */}
            <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: COLORS.surfaceCard, border: "1px solid rgba(255,255,255,0.06)", opacity: credOp }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Credenciales</div>
              {CRED_USERS.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, opacity: interpolate(frame, [100 + i * 12, 118 + i * 12], [0, 1], C) }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.accent, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.white60 }}>{u}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider L-C */}
          <div style={{ width: 1, flexShrink: 0, backgroundColor: COLORS.surfaceBorder }} />

          {/* CENTER: Inscripciones en vivo */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingLeft: 28, paddingRight: 28 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 10, opacity: feedTitleOp }}>Inscripciones en vivo</div>

            {/* Big counter */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, opacity: countOp }}>
              <span style={{ fontFamily: FONTS.sans, fontSize: 88, fontWeight: 900, color: COLORS.white, letterSpacing: "-4px", lineHeight: 1 }}>{inscritos}</span>
              <div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.white60 }}>inscritos</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: dotPulse, boxShadow: `0 0 8px ${COLORS.accent}` }} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.accent, letterSpacing: "1.5px" }}>EN TIEMPO REAL</span>
                </div>
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: COLORS.surfaceBorder, marginBottom: 12 }} />

            {/* Live feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              {LIVE_FEED.map((r, i) => {
                if (frame < r.t) return null;
                const rowOp = interpolate(frame, [r.t, r.t + 18], [0, 1], C);
                const isNew = frame < r.t + 28;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", borderRadius: 8, backgroundColor: isNew ? "rgba(0,85,255,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${isNew ? "rgba(0,85,255,0.18)" : "rgba(255,255,255,0.05)"}`, opacity: rowOp }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: isNew ? dotPulse : 0.30, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80, flex: 1 }}>{r.name}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30 }}>{r.code}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent, padding: "2px 10px", borderRadius: 12, backgroundColor: "rgba(0,85,255,0.12)" }}>{r.empresa}</span>
                  </div>
                );
              })}
            </div>

            {/* Stat footer */}
            <div style={{ padding: "14px 18px", borderRadius: 12, backgroundColor: "rgba(0,85,255,0.06)", border: "1px solid rgba(0,85,255,0.15)", marginTop: 12, opacity: statOp }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600, color: COLORS.white80 }}>260 inscritos en 10 minutos</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, marginTop: 4 }}>26 reg/min &middot; Tasa de exito: 100%</div>
            </div>
          </div>

          {/* Divider C-R */}
          <div style={{ width: 1, flexShrink: 0, backgroundColor: COLORS.surfaceBorder }} />

          {/* RIGHT: Cupos + Empresas */}
          <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingLeft: 28, opacity: rightOp }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 2 }}>Cupos por empresa</div>

            {CAPACITY_BARS.map((b, i) => {
              const filled   = b.used * Math.min(1, barProg);
              const barWidth = (filled / b.max) * 100;
              const barOp    = interpolate(frame, [62 + i * 12, 82 + i * 12], [0, 1], C);
              return (
                <div key={i} style={{ opacity: barOp }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80 }}>{b.label}</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: b.color, padding: "2px 8px", borderRadius: 8, backgroundColor: `${b.color}18` }}>{Math.round(filled)}/{b.max}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barWidth}%`, background: `linear-gradient(90deg, ${b.color} 0%, ${b.color}BB 100%)`, borderRadius: 5, boxShadow: `0 0 8px ${b.color}44` }} />
                  </div>
                </div>
              );
            })}

            {/* Empresas activas */}
            <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: COLORS.surfaceCard, border: "1px solid rgba(255,255,255,0.07)", opacity: tagsOp }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>Empresas activas</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {COMPANIES.map((c, i) => (
                  <div key={i} style={{ padding: "4px 13px", borderRadius: 20, backgroundColor: "rgba(0,85,255,0.10)", border: "1px solid rgba(0,85,255,0.26)", fontFamily: FONTS.sans, fontSize: 12, color: COLORS.accent, opacity: interpolate(frame, [142 + i * 9, 160 + i * 9], [0, 1], C) }}>{c}</div>
                ))}
              </div>
            </div>

            {/* Proyectos summary */}
            <div style={{ padding: "14px 16px", borderRadius: 12, backgroundColor: "rgba(0,85,255,0.05)", border: "1px solid rgba(0,85,255,0.12)", opacity: projOp }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.white60 }}>Proyectos activos</span>
                <span style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 800, color: COLORS.accent }}>24</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.white60 }}>Cupos disponibles</span>
                <span style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 800, color: COLORS.accent }}>{Math.max(0, 21 - Math.round(21 * Math.min(1, barProg)))}</span>
              </div>
            </div>
          </div>

        </div>
      </div>{/* end zoom wrapper */}

      {/* Scene label */}
      <div style={{ position: "absolute", top: 60, right: 80, zIndex: 80, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.white60, letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp }}>
        05 &middot; Centro de control
      </div>
    </div>
  );
};
