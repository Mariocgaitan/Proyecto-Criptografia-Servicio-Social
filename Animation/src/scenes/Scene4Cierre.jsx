import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Duration: 120 frames (4 s @ 30 fps)

export const Scene4Cierre = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 18], [0, 1], C);
  const sceneOut = interpolate(frame, [104, 120], [1, 0], C);
  const opacity  = Math.min(sceneIn, sceneOut);

  // Nombre principal
  const nameScl  = spring({ frame: frame - 8, fps, config: { damping: 36, stiffness: 200 }, from: 1.8, to: 1 });
  const nameOp   = interpolate(frame, [8, 42], [0, 1], C);
  const nameBlur = interpolate(frame, [8, 36], [18, 0], C);

  // Linea divisora
  const lineW = interpolate(frame, [38, 72], [0, 560], C);

  // Tagline nuevo
  const taglineOp = interpolate(frame, [60, 90], [0, 1], C);
  const taglineY  = interpolate(frame, [60, 90], [14, 0], C);

  // URL
  const urlOp   = interpolate(frame, [74, 104], [0, 1], C);
  const urlScl  = spring({ frame: frame - 74, fps, config: { damping: 28, stiffness: 185 }, from: 0.85, to: 1 });
  const urlBlur = interpolate(frame, [74, 98], [8, 0], C);

  // Subtle breathe
  const breathe = 1 + 0.003 * Math.sin(frame * 0.08);

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: COLORS.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 1000, height: 640,
        background: `radial-gradient(ellipse, ${COLORS.accentDim} 0%, transparent 68%)`,
        pointerEvents: "none",
      }} />

      <div style={{
        textAlign: "center",
        transform: `scale(${breathe})`,
        display: "flex", flexDirection: "column",
        alignItems: "center",
      }}>
        {/* Nombre */}
        {frame >= 8 && (
          <div style={{
            fontFamily: FONTS.sans, fontSize: 108, fontWeight: 800,
            color: COLORS.ink, letterSpacing: "-4px", lineHeight: 1,
            opacity: nameOp,
            transform: `scale(${nameScl})`,
            filter: `blur(${nameBlur}px)`,
          }}>
            Feria Servicio Social
          </div>
        )}

        {/* Linea */}
        <div style={{
          width: lineW, height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
          margin: "28px auto",
          boxShadow: `0 0 24px ${COLORS.accentGlow}`,
        }} />

        {/* Tagline */}
        <div style={{
          opacity: taglineOp,
          transform: `translateY(${taglineY}px)`,
          fontFamily: FONTS.sans, fontSize: 26, fontWeight: 300,
          color: COLORS.ink45, letterSpacing: "-0.3px",
          marginBottom: 36,
        }}>
          Del papel al control total del evento.
        </div>

        {/* URL */}
        {frame >= 74 && (
          <div style={{
            opacity: urlOp,
            transform: `scale(${urlScl})`,
            filter: `blur(${urlBlur}px)`,
          }}>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 40, fontWeight: 700,
              color: COLORS.accent, letterSpacing: "-0.5px",
            }}>
              feriaserviciosocial.com
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
