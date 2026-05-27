import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

const HEADER_COLORS = [COLORS.accent, COLORS.violet, COLORS.green, "#1E3A8A", "#E04040"];

// 60 papeles — 6 filas × 9 columnas + 6 extras en zona central
// El texto aparece primero; los papeles caen y lo tapan por z-index
const PAPERS = [
  // Fila 1 — parte superior (y ≈ −392)
  { x: -850, y: -392, rot: -14, delay: 30 },
  { x: -635, y: -380, rot:   7, delay: 38 },
  { x: -418, y: -394, rot:  -5, delay: 45 },
  { x: -200, y: -376, rot:  12, delay: 35 },
  { x:   18, y: -385, rot:  -8, delay: 40 },
  { x:  238, y: -372, rot:  16, delay: 48 },
  { x:  458, y: -390, rot:  -3, delay: 33 },
  { x:  678, y: -378, rot:   9, delay: 42 },
  { x:  868, y: -386, rot: -11, delay: 52 },
  // Fila 2 (y ≈ −222)
  { x: -868, y: -228, rot:   8, delay: 48 },
  { x: -652, y: -212, rot: -18, delay: 55 },
  { x: -438, y: -222, rot:   5, delay: 62 },
  { x: -222, y: -218, rot: -12, delay: 58 },
  { x:   -8, y: -226, rot:  10, delay: 65 },
  { x:  212, y: -212, rot:  -6, delay: 52 },
  { x:  428, y: -222, rot:  14, delay: 70 },
  { x:  648, y: -214, rot:  -9, delay: 60 },
  { x:  862, y: -224, rot:   6, delay: 75 },
  // Fila 3 — zona texto + contador (y ≈ −48)
  { x: -872, y:  -52, rot: -10, delay: 65 },
  { x: -658, y:  -36, rot:  12, delay: 72 },
  { x: -442, y:  -48, rot:  -7, delay: 78 },
  { x: -225, y:  -42, rot:  15, delay: 85 },
  { x:   -8, y:  -52, rot:  -4, delay: 88 },
  { x:  212, y:  -38, rot:  11, delay: 80 },
  { x:  428, y:  -50, rot: -14, delay: 90 },
  { x:  648, y:  -38, rot:   7, delay: 82 },
  { x:  858, y:  -48, rot:  -9, delay: 95 },
  // Fila 4 (y ≈ 118)
  { x: -862, y:  115, rot:  14, delay: 80 },
  { x: -648, y:  125, rot:  -6, delay: 88 },
  { x: -432, y:  115, rot:  10, delay: 95 },
  { x: -215, y:  122, rot: -15, delay: 100 },
  { x:    5, y:  112, rot:   8, delay: 105 },
  { x:  225, y:  125, rot: -11, delay: 92 },
  { x:  445, y:  115, rot:  17, delay: 110 },
  { x:  662, y:  126, rot:  -8, delay: 98 },
  { x:  872, y:  112, rot:   5, delay: 115 },
  // Fila 5 (y ≈ 278)
  { x: -852, y:  282, rot:  -9, delay: 95 },
  { x: -638, y:  270, rot:  13, delay: 105 },
  { x: -422, y:  280, rot:  -5, delay: 112 },
  { x: -205, y:  274, rot:   9, delay: 118 },
  { x:   15, y:  282, rot: -16, delay: 108 },
  { x:  235, y:  270, rot:   7, delay: 120 },
  { x:  452, y:  280, rot: -12, delay: 115 },
  { x:  668, y:  272, rot:  10, delay: 128 },
  { x:  875, y:  282, rot:  -7, delay: 122 },
  // Fila 6 — parte inferior (y ≈ 415)
  { x: -838, y:  418, rot:  11, delay: 115 },
  { x: -625, y:  408, rot:  -8, delay: 125 },
  { x: -408, y:  416, rot:  14, delay: 132 },
  { x: -192, y:  410, rot:  -4, delay: 140 },
  { x:   22, y:  418, rot:   9, delay: 128 },
  { x:  242, y:  408, rot: -13, delay: 145 },
  { x:  460, y:  416, rot:   6, delay: 135 },
  { x:  678, y:  408, rot: -10, delay: 152 },
  { x:  875, y:  415, rot:  15, delay: 142 },
  // Extras — densifican zona central (contador)
  { x: -108, y:   25, rot:  -6, delay: 148 },
  { x:   85, y:  -18, rot:  18, delay: 155 },
  { x:  -48, y:   95, rot: -11, delay: 162 },
  { x:  145, y:   66, rot:   8, delay: 158 },
  { x:  -15, y:  -90, rot:  14, delay: 168 },
  { x: -182, y:   48, rot:  -9, delay: 172 },
];

const SWEEP_START = 230;
const SWEEP_DUR   = 52;

export const Scene1Problema = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 20], [0, 1], C);
  const sceneOut = interpolate(frame, [338, 360], [1, 0], C);
  const labelOp  = interpolate(frame, [8, 35], [0, 1], C);

  // Contador — z-index bajo para que los papeles lo tapen
  const counterVal = Math.floor(interpolate(frame, [20, 185], [0, 547], C));
  const counterOp  = Math.min(
    interpolate(frame, [20, 50], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );

  // Texto narrativo — z-index 20; los papeles (3+i) lo van cubriendo
  const t1Op = Math.min(
    interpolate(frame, [5, 30], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );
  const t2Op = Math.min(
    interpolate(frame, [18, 48], [0, 1], C),
    interpolate(frame, [228, 248], [1, 0], C)
  );

  // "Hay una mejor manera."
  const solOp  = interpolate(frame, [268, 308], [0, 1], C);
  const solScl = spring({ frame: frame - 268, fps, config: { damping: 30, stiffness: 195 }, from: 0.88, to: 1 });
  const solBlr = interpolate(frame, [268, 304], [16, 0], C);

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
      {/* Viñeta cenital */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 84% at 50% 50%, transparent 30%, rgba(0,0,0,0.22) 100%)",
      }} />

      {/* Etiqueta — siempre encima */}
      <div style={{
        position: "absolute", top: 60, left: 80, zIndex: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>
        01 · El Problema
      </div>

      {/* Contador en el centro — los papeles lo tapan */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -52%)",
        textAlign: "center", opacity: counterOp, zIndex: 8,
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: FONTS.sans, fontSize: 155, fontWeight: 900,
          color: "#E04040", letterSpacing: "-6px", lineHeight: 1,
          textShadow: "0 0 50px rgba(224,64,64,0.28)",
        }}>
          {counterVal}
        </div>
        <div style={{
          fontFamily: FONTS.mono, fontSize: 14, color: COLORS.ink45,
          letterSpacing: "1px", marginTop: 6,
        }}>
          formularios acumulados este semestre
        </div>
      </div>

      {/* Texto narrativo — aparece primero, los papeles lo tapan */}
      <div style={{
        position: "absolute", left: 80, top: "50%",
        transform: "translateY(-50%)", zIndex: 20,
      }}>
        <div style={{
          opacity: t1Op,
          fontFamily: FONTS.sans, fontSize: 72, fontWeight: 800,
          color: COLORS.ink, letterSpacing: "-2.5px", lineHeight: 1.1,
        }}>
          Cada semestre.
        </div>
        <div style={{
          opacity: t2Op, marginTop: 12,
          fontFamily: FONTS.sans, fontSize: 46, fontWeight: 300,
          color: COLORS.ink70, letterSpacing: "-1px", lineHeight: 1.3,
        }}>
          Miles de formularios.<br />
          <span style={{ color: COLORS.ink45, fontSize: 38 }}>En papel. Uno por uno.</span>
        </div>
      </div>

      {/* 60 papeles tamaño carta cayendo — vista cenital */}
      {PAPERS.map((p, i) => {
        // Caída con rebote al aterrizar
        const landY = spring({
          frame: frame - p.delay, fps,
          config: { damping: 16, stiffness: 112 },
          from: -950, to: p.y,
        });
        // Perspectiva de acercamiento (crece al caer)
        const landScale = spring({
          frame: frame - p.delay, fps,
          config: { damping: 24, stiffness: 185 },
          from: 0.2, to: 1,
        });
        const appearedOp = interpolate(frame, [p.delay, p.delay + 10], [0, 1], C);

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

        // Tamaño carta (ratio 8.5:11)
        const pw = 112 + Math.round(Math.sin(i * 2.1) * 7);
        const ph = Math.round(pw * 1.294);
        const hc = HEADER_COLORS[i % HEADER_COLORS.length];

        return (
          <div key={i} style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: pw, height: ph,
            marginLeft: -pw / 2,
            marginTop: -ph / 2,
            transform: `translate(${tx}px, ${ty}px) rotate(${p.rot}deg) scale(${sc})`,
            opacity: op,
            zIndex: 3 + i,
            backgroundColor: "#FEFEFE",
            borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "1px 3px 12px rgba(0,0,0,0.18), 0 1px 0 rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            {/* Banda de encabezado (color por depto/institución) */}
            <div style={{ height: 7, backgroundColor: hc, opacity: 0.82 }} />
            {/* Cuerpo del formulario */}
            <div style={{ padding: "5px 8px 4px", display: "flex", flexDirection: "column" }}>
              {/* Línea de título */}
              <div style={{ height: 3, borderRadius: 1, backgroundColor: "rgba(0,0,0,0.18)", width: "87%", marginBottom: 5 }} />
              {/* 7 campos: etiqueta + línea de escritura */}
              {[82, 68, 90, 55, 75, 88, 60].map((w, j) => (
                <div key={j} style={{ marginBottom: 4 }}>
                  <div style={{ height: 1.5, borderRadius: 0.5, backgroundColor: "rgba(0,0,0,0.07)", width: `${Math.round(w * 0.42)}%`, marginBottom: 1.5 }} />
                  <div style={{ height: 1.5, borderRadius: 0.5, backgroundColor: `rgba(0,0,0,${j % 2 === 0 ? 0.12 : 0.09})`, width: `${w}%` }} />
                </div>
              ))}
              {/* Área de firma */}
              <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                <div style={{ flex: 1, borderBottom: "1px solid rgba(0,0,0,0.10)", height: 9 }} />
                <div style={{ flex: 1, borderBottom: "1px solid rgba(0,0,0,0.10)", height: 9 }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* "Hay una mejor manera." — aparece sobre el suelo limpio */}
      {frame >= 258 && (
        <div style={{
          position: "absolute", width: "100%", textAlign: "center",
          zIndex: 70,
          opacity: solOp,
          transform: `scale(${solScl})`,
          filter: `blur(${solBlr}px)`,
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
    </div>
  );
};
