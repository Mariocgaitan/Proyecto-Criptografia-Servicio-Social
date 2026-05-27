import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { DigitalGuideLine } from "../components/DigitalGuideLine.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Paleta de bandas — solo colores de la paleta oficial (sin rojo/verde/naranja)
const HEADER_COLORS = [COLORS.accent, COLORS.violet, "#4D7AFF", "#1E3A8A", "#5B21B6"];

// Generador pseudo-aleatorio determinístico (reproducible, sin Math.random)
function hr(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// 65 papeles: posición orgánica, delays cortos, dinámica variada por papel
// Sin cuadrícula — cada papel cae de forma única con su propio rebote
const PAPERS = Array.from({ length: 65 }, (_, i) => ({
  x:      hr(i * 3)     * 1940 - 970,          // -970 a +970
  y:      hr(i * 3 + 1) * 1060 - 495,          // cubre toda la pantalla
  rot:    hr(i * 3 + 2) * 56   - 28,           // -28 a +28 grados
  delay:  Math.floor(hr(i * 5 + 9) * 95) + 6,  // 6..101 frames — llegan rapido
  w:      Math.floor(hr(i * 5 + 7) * 42) + 84, // 84..126 px
  damp:   12 + hr(i * 7 + 3) * 10,             // 12..22  (variedad de rebote)
  stiff:  95 + hr(i * 7 + 4) * 65,             // 95..160 (caída rápida o lenta)
  startY: -(900 + hr(i * 7 + 5) * 330),        // -900..-1230 (alturas variadas)
}));

const SWEEP_START = 230;
const SWEEP_DUR   = 52;

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

      {/* 65 papeles — posición orgánica, caída variada, llegada rápida */}
      {PAPERS.map((p, i) => {
        // Cada papel tiene su propio spring de caída (damping y stiffness únicos)
        const landY = spring({
          frame: frame - p.delay, fps,
          config: { damping: p.damp, stiffness: p.stiff },
          from: p.startY, to: p.y,
        });
        const landScale = spring({
          frame: frame - p.delay, fps,
          config: { damping: p.damp + 8, stiffness: p.stiff + 40 },
          from: 0.15, to: 1,
        });
        const appearedOp = interpolate(frame, [p.delay, p.delay + 8], [0, 1], C);

        // Sweep — vuelan radialmente hacia afuera
        const sweepProg  = interpolate(frame, [SWEEP_START, SWEEP_START + SWEEP_DUR], [0, 1], C);
        const dist       = Math.sqrt(p.x * p.x + p.y * p.y) || 1;
        const sweepX     = (p.x / dist) * sweepProg * 2200;
        const sweepY     = (p.y / dist) * sweepProg * 1300;
        const sweepScale = interpolate(frame, [SWEEP_START, SWEEP_START + SWEEP_DUR * 0.8], [1, 0.3], C);
        const sweepOp    = interpolate(frame, [SWEEP_START + 5, SWEEP_START + SWEEP_DUR * 0.7], [1, 0], C);

        const isSweeping = frame >= SWEEP_START;
        const tx = isSweeping ? p.x + sweepX : p.x;
        const ty = isSweeping ? p.y + sweepY : landY;
        const sc = isSweeping ? sweepScale   : landScale;
        const op = isSweeping ? sweepOp      : appearedOp;

        const pw = p.w;
        const ph = Math.round(pw * 1.294);
        const hc = HEADER_COLORS[i % HEADER_COLORS.length];

        return (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: pw, height: ph,
            marginLeft: -pw / 2, marginTop: -ph / 2,
            transform: `translate(${tx}px, ${ty}px) rotate(${p.rot}deg) scale(${sc})`,
            opacity: op, zIndex: 3 + i,
            backgroundColor: "#FEFEFE", borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "1px 3px 12px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            <div style={{ height: 7, backgroundColor: hc, opacity: 0.82 }} />
            <div style={{ padding: "5px 8px 4px", display: "flex", flexDirection: "column" }}>
              <div style={{ height: 3, borderRadius: 1, backgroundColor: "rgba(0,0,0,0.18)", width: "87%", marginBottom: 5 }} />
              {[82, 68, 90, 55, 75, 88, 60].map((w, j) => (
                <div key={j} style={{ marginBottom: 4 }}>
                  <div style={{ height: 1.5, borderRadius: 0.5, backgroundColor: "rgba(0,0,0,0.07)", width: `${Math.round(w * 0.42)}%`, marginBottom: 1.5 }} />
                  <div style={{ height: 1.5, borderRadius: 0.5, backgroundColor: `rgba(0,0,0,${j % 2 === 0 ? 0.12 : 0.09})`, width: `${w}%` }} />
                </div>
              ))}
              <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                <div style={{ flex: 1, borderBottom: "1px solid rgba(0,0,0,0.10)", height: 9 }} />
                <div style={{ flex: 1, borderBottom: "1px solid rgba(0,0,0,0.10)", height: 9 }} />
              </div>
            </div>
          </div>
        );
      })}

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
