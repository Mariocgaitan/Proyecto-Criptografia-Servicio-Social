import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

/**
 * DigitalGuideLine — La línea azul inteligente del sistema.
 * Elemento visual recurrente que guía la narrativa del video.
 *
 * Modos:
 *   "draw"      — Revela cualquier SVG path progresivamente (strokeDashoffset).
 *                 Requiere: path, viewBox
 *   "underline" — Línea horizontal que crece de izquierda a derecha.
 *                 Requiere: x1, x2, y1 (y2 es opcional, igual a y1)
 *   "connect"   — Línea de punto A → B con círculo en cada extremo.
 *                 Requiere: x1, y1, x2, y2
 *   "scan"      — Beam horizontal que barre verticalmente (escaneo QR/laser).
 *                 Requiere: scanX1, scanX2, scanY1, scanY2
 *   "pulse"     — Puntos viajando continuamente a lo largo de un segmento.
 *                 Requiere: x1, y1, x2, y2
 *
 * Props universales:
 *   startFrame  — Frame de inicio de la animación (absoluto o local según contexto).
 *   duration    — Frames para completar el efecto.
 *   color       — Color de la línea (default: COLORS.accent).
 *   strokeWidth — Grosor en px.
 *   glow        — true/false activa el drop-shadow de neón.
 *   glowSize    — Intensidad del glow en px (default 14).
 *   opacity     — Opacidad del componente completo.
 *   style       — Estilos extra para el contenedor SVG.
 */
export const DigitalGuideLine = ({
  mode = "draw",
  startFrame = 0,
  duration = 30,

  // draw mode
  path = "M 0 540 L 1920 540",
  viewBox = "0 0 1920 1080",

  // underline / connect / pulse
  x1 = 0,
  y1 = 540,
  x2 = 1920,
  y2 = 540,

  // scan mode
  scanX1 = 0,
  scanX2 = 1920,
  scanY1 = 0,
  scanY2 = 1080,

  // style
  color = COLORS.accent,
  strokeWidth = 3,
  glow = true,
  glowSize = 14,
  opacity = 1,

  // pulse mode extras
  pulseCount = 3,
  pulseSpeed = 1,      // multiplicador de velocidad de los dots

  // extras
  style = {},
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const progress = interpolate(localFrame, [0, duration], [0, 1], C);

  if (progress <= 0) return null;

  const glowFilter = glow
    ? `drop-shadow(0 0 ${glowSize}px ${color}) drop-shadow(0 0 ${glowSize * 2}px ${color}55)`
    : "none";

  const base = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "visible",
    opacity,
    ...style,
  };

  // ── DRAW — revela path SVG con strokeDashoffset ─────────────────────────────
  if (mode === "draw") {
    const DASH = 9999;
    const offset = DASH * (1 - progress);
    return (
      <svg style={{ ...base, filter: glowFilter }} viewBox={viewBox}>
        <path
          d={path}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASH}
          strokeDashoffset={offset}
        />
      </svg>
    );
  }

  // ── UNDERLINE — crece de izquierda a derecha ────────────────────────────────
  if (mode === "underline") {
    const cx2 = x1 + (x2 - x1) * progress;
    return (
      <svg style={{ ...base, filter: glowFilter }} viewBox={viewBox}>
        <line
          x1={x1} y1={y1}
          x2={cx2} y2={y1}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // ── CONNECT — de A a B con dots en extremos ─────────────────────────────────
  if (mode === "connect") {
    const cx2 = x1 + (x2 - x1) * progress;
    const cy2 = y1 + (y2 - y1) * progress;
    const r   = strokeWidth * 2.5;
    return (
      <svg style={{ ...base, filter: glowFilter }} viewBox={viewBox}>
        {/* Dot de origen — aparece inmediatamente */}
        <circle cx={x1} cy={y1} r={r} fill={color} />
        {/* Línea que crece */}
        <line
          x1={x1} y1={y1}
          x2={cx2} y2={cy2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Dot de destino — aparece al llegar */}
        {progress >= 0.92 && (
          <circle
            cx={x2} cy={y2} r={r}
            fill={color}
            opacity={interpolate(progress, [0.92, 1], [0, 1], C)}
          />
        )}
      </svg>
    );
  }

  // ── SCAN — beam horizontal que barre verticalmente ──────────────────────────
  if (mode === "scan") {
    const scanY = scanY1 + (scanY2 - scanY1) * progress;
    // Trail: rectángulo semitransparente detrás del beam
    const trailH = 80;
    const trailTop = Math.max(scanY1, scanY - trailH);
    const gradId = `scanTrail_${startFrame}_${mode}`;
    return (
      <svg style={{ ...base, filter: glowFilter }} viewBox={viewBox}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse"
            x1_attr={scanX1} y1_attr={trailTop} x2_attr={scanX1} y2_attr={scanY}>
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="100%" stopColor={color} stopOpacity="0.18" />
          </linearGradient>
        </defs>
        {/* Trail semitransparente */}
        <rect
          x={scanX1} y={trailTop}
          width={scanX2 - scanX1} height={scanY - trailTop}
          fill={color} opacity={0.12}
        />
        {/* Beam principal */}
        <line
          x1={scanX1} y1={scanY}
          x2={scanX2} y2={scanY}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.95}
        />
        {/* Segunda línea más delgada y brillante encima */}
        <line
          x1={scanX1} y1={scanY}
          x2={scanX2} y2={scanY}
          stroke="#ffffff"
          strokeWidth={Math.max(1, strokeWidth * 0.35)}
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
    );
  }

  // ── PULSE — puntos viajando continuamente a lo largo de un segmento ─────────
  if (mode === "pulse") {
    const r = strokeWidth * 1.8;
    return (
      <svg style={{ ...base, filter: glowFilter }} viewBox={viewBox}>
        {/* Línea base tenue punteada */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.2}
          strokeDasharray="6 14"
          strokeLinecap="round"
        />
        {/* Dots viajando */}
        {Array.from({ length: pulseCount }).map((_, i) => {
          const offset = i / pulseCount;
          const t = ((progress * pulseSpeed + offset) % 1);
          const px = x1 + (x2 - x1) * t;
          const py = y1 + (y2 - y1) * t;
          // Fade in/out en los extremos del recorrido
          const dotOp = t < 0.08
            ? t / 0.08
            : t > 0.92
            ? (1 - t) / 0.08
            : 1;
          return (
            <g key={i}>
              {/* Halo del dot */}
              <circle cx={px} cy={py} r={r * 2.5} fill={color} opacity={dotOp * 0.15} />
              {/* Dot principal */}
              <circle cx={px} cy={py} r={r} fill={color} opacity={dotOp} />
            </g>
          );
        })}
      </svg>
    );
  }

  return null;
};
