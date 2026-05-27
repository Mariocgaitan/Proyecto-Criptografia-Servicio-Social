import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

export const Scene4Cierre = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 25], [0, 1], C);
  const sceneOut = interpolate(frame, [262, 300], [1, 0], C);
  const sceneOp  = Math.min(sceneIn, sceneOut);

  // Nombre del proyecto — Apple zoom-out
  const nameScl  = spring({ frame: frame - 30, fps, config: { damping: 36, stiffness: 200 }, from: 1.9, to: 1 });
  const nameOp   = interpolate(frame, [30, 75], [0, 1], C);
  const nameBlur = interpolate(frame, [30, 72], [20, 0], C);

  // Línea divisora
  const lineW = interpolate(frame, [90, 175], [0, 560], C);

  // Universidad
  const uniOp   = interpolate(frame, [130, 175], [0, 1], C);
  const uniY    = interpolate(frame, [130, 175], [16, 0], C);
  const uniBlur = interpolate(frame, [130, 168], [6, 0], C);

  // Tagline
  const tagOp = interpolate(frame, [165, 210], [0, 1], C);
  const tagY  = interpolate(frame, [165, 210], [12, 0], C);

  // URL — el elemento más grande y prominente
  const urlScl = spring({ frame: frame - 195, fps, config: { damping: 28, stiffness: 185 }, from: 0.82, to: 1 });
  const urlOp  = interpolate(frame, [195, 240], [0, 1], C);
  const urlBlur = interpolate(frame, [195, 235], [8, 0], C);

  // Stack técnico
  const stackOp = interpolate(frame, [235, 275], [0, 1], C);

  const breathe = 1 + 0.004 * Math.sin(frame * 0.05);

  return (
    <div style={{
      width: 1920, height: 1080, backgroundColor: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity: sceneOp,
    }}>

      {/* Punto de luz central muy sutil */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 1000, height: 600,
        background: `radial-gradient(ellipse, ${COLORS.accent}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Contenido centrado */}
      <div style={{
        textAlign: "center",
        transform: `scale(${breathe})`,
        display: "flex", flexDirection: "column",
        alignItems: "center",
      }}>

        {/* Nombre del proyecto */}
        {frame >= 30 && (
          <div style={{
            fontFamily: FONTS.sans, fontSize: 112, fontWeight: 800,
            color: COLORS.ink, letterSpacing: "-4px", lineHeight: 1,
            opacity: nameOp,
            transform: `scale(${nameScl})`,
            filter: `blur(${nameBlur}px)`,
          }}>
            Feria Servicio Social
          </div>
        )}

        {/* Línea divisora con acento */}
        <div style={{
          width: lineW, height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
          margin: "28px auto",
          boxShadow: `0 0 24px ${COLORS.accentGlow}`,
        }} />

        {/* Universidad */}
        <div style={{
          opacity: uniOp,
          transform: `translateY(${uniY}px)`,
          filter: `blur(${uniBlur}px)`,
          fontFamily: FONTS.mono, fontSize: 20, fontWeight: 400,
          color: COLORS.ink45, letterSpacing: "6px",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          Tecnologico de Monterrey
        </div>

        {/* Tagline */}
        <div style={{
          opacity: tagOp, transform: `translateY(${tagY}px)`,
          fontFamily: FONTS.sans, fontSize: 22, fontWeight: 300,
          color: COLORS.ink45, letterSpacing: "-0.2px",
          marginBottom: 20,
        }}>
          Digitaliza la experiencia de tu evento.
        </div>

        {/* Stat de impacto */}
        <div style={{
          opacity: tagOp, transform: `translateY(${tagY}px)`,
          fontFamily: FONTS.mono, fontSize: 16, fontWeight: 600,
          color: COLORS.ink, letterSpacing: "0px",
          marginBottom: 44,
        }}>
          <span style={{ color: COLORS.accent }}>+500</span> inscripciones&nbsp;&nbsp;·&nbsp;&nbsp;
          <span style={{ color: COLORS.green }}>0</span> papeles
        </div>

        {/* URL — call to action */}
        {frame >= 195 && (
          <div style={{
            opacity: urlOp,
            transform: `scale(${urlScl})`,
            filter: `blur(${urlBlur}px)`,
          }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 42, fontWeight: 700,
              color: COLORS.accent, letterSpacing: "-0.5px",
            }}>
              feriaserviciosocial.com
            </div>
          </div>
        )}

        {/* Stack técnico mini */}
        <div style={{
          opacity: stackOp,
          display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {["FastAPI", "React", "PostgreSQL", "Redis", "Docker", "AWS EC2"].map((tech) => (
            <div key={tech} style={{
              fontFamily: FONTS.mono, fontSize: 12, color: COLORS.ink20,
              border: `1px solid ${COLORS.ink08}`,
              padding: "4px 12px", borderRadius: 100,
            }}>
              {tech}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
