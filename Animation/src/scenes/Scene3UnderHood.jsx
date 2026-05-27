import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Duration: 240 frames (8 s @ 30 fps)
// Las 3 garantias mapean directamente a Seguro / Rapido / Escalable

const GUARANTEES = [
  {
    claim:    "Seguro",
    headline: "Validacion institucional y acceso temporal",
    desc:     "Login exclusivo @tec.mx con QR de expiracion automatica",
    techs:    ["OAuth 2.0", "TOTP RFC 6238"],
    color:    COLORS.accent,
    glow:     COLORS.accentGlow,
    enterF:   50,
  },
  {
    claim:    "Rapido",
    headline: "API asincrona y cache en tiempo real",
    desc:     "Inscripcion validada en menos de 2.3 segundos",
    techs:    ["FastAPI", "Redis"],
    color:    COLORS.green,
    glow:     COLORS.greenGlow,
    enterF:   84,
  },
  {
    claim:    "Escalable",
    headline: "Infraestructura cloud lista para produccion",
    desc:     "Mas de 500 inscripciones sin degradacion del servicio",
    techs:    ["PostgreSQL", "Docker", "AWS EC2"],
    color:    COLORS.violet,
    glow:     "rgba(124,58,237,0.25)",
    enterF:   118,
  },
];

export const Scene3UnderHood = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 20], [0, 1], C);
  const sceneOut = interpolate(frame, [218, 240], [1, 0], C);
  const opacity  = Math.min(sceneIn, sceneOut);
  const labelOp  = interpolate(frame, [8, 30], [0, 1], C);

  const headlineOp  = interpolate(frame, [18, 46], [0, 1], C);
  const headlineScl = spring({ frame: frame - 18, fps, config: { damping: 30, stiffness: 195 }, from: 0.88, to: 1 });

  const statsOp = interpolate(frame, [158, 186], [0, 1], C);

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: COLORS.bg,
      position: "relative", overflow: "hidden",
      opacity,
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(8,8,26,0.06) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
      }} />

      {/* Accent gradient top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
        opacity: interpolate(frame, [5, 30], [0, 1], C),
      }} />

      {/* Label */}
      <div style={{
        position: "absolute", top: 60, left: 80, zIndex: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>
        06 &middot; Confianza tecnica
      </div>

      {/* Headline */}
      <div style={{
        position: "absolute", top: 110, left: 80,
        opacity: headlineOp,
        transform: `scale(${headlineScl})`,
        transformOrigin: "left center",
      }}>
        <div style={{ fontFamily: FONTS.sans, fontSize: 60, fontWeight: 800, letterSpacing: "-2.5px", lineHeight: 1 }}>
          <span style={{ color: COLORS.accent }}>Seguro.</span>{" "}
          <span style={{ color: COLORS.green }}>Rapido.</span>{" "}
          <span style={{ color: COLORS.violet }}>Escalable.</span>
        </div>
        <div style={{ fontFamily: FONTS.sans, fontSize: 18, fontWeight: 300, color: COLORS.ink45, marginTop: 10, letterSpacing: "-0.2px" }}>
          La tecnologia detras del sistema.
        </div>
      </div>

      {/* 3 Guarantee cards */}
      <div style={{
        position: "absolute",
        top: 258, left: 80, right: 80,
        display: "flex", gap: 28,
      }}>
        {GUARANTEES.map((g, i) => {
          if (frame < g.enterF) return null;
          const cardScl = spring({ frame: frame - g.enterF, fps, config: { damping: 22, stiffness: 175 }, from: 0.86, to: 1 });
          const cardOp  = interpolate(frame, [g.enterF, g.enterF + 20], [0, 1], C);
          return (
            <div key={i} style={{
              flex: 1,
              borderRadius: 20,
              backgroundColor: COLORS.surfaceCard,
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "32px 36px",
              transform: `scale(${cardScl})`,
              transformOrigin: "bottom center",
              opacity: cardOp,
              boxShadow: "0 8px 40px rgba(0,0,0,0.20)",
            }}>
              {/* Claim */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ fontFamily: FONTS.sans, fontSize: 40, fontWeight: 900, color: g.color, letterSpacing: "-1.5px" }}>
                  {g.claim}
                </div>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: g.color, boxShadow: `0 0 18px ${g.glow}` }} />
              </div>

              {/* Headline */}
              <div style={{ fontFamily: FONTS.sans, fontSize: 16, fontWeight: 600, color: COLORS.white, lineHeight: 1.4, marginBottom: 10, letterSpacing: "-0.3px" }}>
                {g.headline}
              </div>

              {/* Desc */}
              <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white60, lineHeight: 1.55, marginBottom: 24 }}>
                {g.desc}
              </div>

              {/* Tech badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {g.techs.map((t, j) => (
                  <div key={j} style={{
                    padding: "4px 14px", borderRadius: 20,
                    backgroundColor: `${g.color}12`,
                    border: `1px solid ${g.color}28`,
                    fontFamily: FONTS.mono, fontSize: 12, color: g.color,
                    opacity: interpolate(frame, [g.enterF + 14 + j * 9, g.enterF + 30 + j * 9], [0, 1], C),
                  }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats bar */}
      <div style={{
        position: "absolute", bottom: 64, left: 80, right: 80,
        display: "flex", justifyContent: "center", gap: 100,
        opacity: statsOp,
      }}>
        {[
          { val: "+500", unit: "inscritos / feria", color: COLORS.green  },
          { val: "0",    unit: "papel",             color: COLORS.accent },
          { val: "2.3s", unit: "por inscripcion",   color: COLORS.violet },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.sans, fontSize: 52, fontWeight: 900, color: s.color, letterSpacing: "-2px", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ink45, marginTop: 5, letterSpacing: "0.5px" }}>{s.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
