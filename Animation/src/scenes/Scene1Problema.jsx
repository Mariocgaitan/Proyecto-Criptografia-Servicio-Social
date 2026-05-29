import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { DigitalGuideLine } from "../components/DigitalGuideLine.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };




export const Scene1Problema = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 20], [0, 1], C);
  const sceneOut = interpolate(frame, [338, 360], [1, 0], C);
  const labelOp  = interpolate(frame, [8, 35], [0, 1], C);

  const counterVal = Math.floor(interpolate(frame, [20, 185], [0, 547], C));
  const counterOp  = Math.min(
    interpolate(frame, [20, 50], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );

  const t1Op = Math.min(
    interpolate(frame, [5, 30], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );
  const t2Op = Math.min(
    interpolate(frame, [18, 48], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );

  const solOp  = interpolate(frame, [268, 308], [0, 1], C);
  const solScl = spring({ frame: frame - 268, fps, config: { damping: 30, stiffness: 195 }, from: 0.88, to: 1 });
  const solBlr = interpolate(frame, [268, 304], [16, 0], C);

  const lineOp = Math.min(
    interpolate(frame, [195, 215], [0, 0.80], C),
    interpolate(frame, [228, 248], [0.80, 0], C)
  );
  const underlineOp = Math.min(
    interpolate(frame, [295, 315], [0, 1], C),
    interpolate(frame, [342, 355], [1, 0], C)
  );

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: "#EDE8DF",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity: Math.min(sceneIn, sceneOut),
    }}>
      {/* Cuadrícula cenital */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.05,
        backgroundImage: `
          linear-gradient(rgba(8,8,26,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(8,8,26,0.5) 1px, transparent 1px)
        `,
        backgroundSize: "88px 88px",
      }} />
      {/* Viñeta */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 84% at 50% 50%, transparent 30%, rgba(0,0,0,0.22) 100%)",
      }} />

      {/* Etiqueta */}
      <div style={{
        position: "absolute", top: 60, left: 80, zIndex: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>01 · El Problema</div>

      {/* Contador */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -52%)",
        textAlign: "center", opacity: counterOp, zIndex: 8, pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: FONTS.sans, fontSize: 155, fontWeight: 900,
          color: COLORS.ink, letterSpacing: "-6px", lineHeight: 1,
        }}>{counterVal}</div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: 14, color: COLORS.ink45,
          letterSpacing: "1px", marginTop: 6,
        }}>formularios acumulados este semestre</div>
      </div>

      {/* Texto narrativo */}
      <div style={{ position: "absolute", left: 80, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
        <div style={{
          opacity: t1Op, fontFamily: FONTS.sans, fontSize: 72, fontWeight: 800,
          color: COLORS.ink, letterSpacing: "-2.5px", lineHeight: 1.1,
        }}>Cada semestre.</div>
        <div style={{
          opacity: t2Op, marginTop: 12, fontFamily: FONTS.sans, fontSize: 46,
          fontWeight: 300, color: COLORS.ink70, letterSpacing: "-1px", lineHeight: 1.3,
        }}>
          Miles de formularios.<br />
          <span style={{ color: COLORS.ink45, fontSize: 38 }}>En papel. Uno por uno.</span>
        </div>
      </div>



      {/* "Hay una mejor manera." */}
      {frame >= 258 && (
        <div style={{
          position: "absolute", width: "100%", textAlign: "center",
          zIndex: 70, opacity: solOp,
          transform: `scale(${solScl})`, filter: `blur(${solBlr}px)`,
        }}>
          <div style={{
            fontFamily: FONTS.sans, fontSize: 104, fontWeight: 800,
            color: COLORS.ink, letterSpacing: "-4px", lineHeight: 1.05,
          }}>
            Hay una{" "}
            <span style={{ color: COLORS.accent }}>mejor manera.</span>
          </div>
        </div>
      )}

      {/* Pulso azul */}
      <DigitalGuideLine
        mode="pulse" startFrame={195} duration={100}
        x1={0} y1={540} x2={1920} y2={540}
        color={COLORS.accent} strokeWidth={3}
        glow={true} glowSize={18} pulseCount={4}
        opacity={lineOp} style={{ zIndex: 65 }}
        viewBox="0 0 1920 1080"
      />

      {/* Subrayado */}
      {frame >= 290 && (
        <DigitalGuideLine
          mode="underline" startFrame={295} duration={22}
          x1={810} x2={1555} y1={619}
          color={COLORS.accent} strokeWidth={5}
          glow={true} glowSize={14}
          opacity={underlineOp} style={{ zIndex: 72 }}
          viewBox="0 0 1920 1080"
        />
      )}
    </div>
  );
};
