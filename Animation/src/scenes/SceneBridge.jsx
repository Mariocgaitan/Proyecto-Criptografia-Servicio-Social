import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { DigitalGuideLine } from "../components/DigitalGuideLine.jsx";
import { QRAbstractGrid }   from "../components/QRAbstractGrid.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Marco QR centrado en (960, 540) — 320 × 320 px
const QR_SIZE = 320;
const QR_X    = (1920 - QR_SIZE) / 2; // 800
const QR_Y    = (1080 - QR_SIZE) / 2; // 380

// SVG path del marco rectangular (sentido horario desde esquina superior-izquierda)
const FRAME_PATH = `M ${QR_X} ${QR_Y} L ${QR_X + QR_SIZE} ${QR_Y} L ${QR_X + QR_SIZE} ${QR_Y + QR_SIZE} L ${QR_X} ${QR_Y + QR_SIZE} Z`;

/**
 * SceneBridge — "Nace la línea digital" (180 frames / 6 s)
 *
 * Vincula Scene1Problema con Scene2Estudiante.
 * La línea azul emerge del caos, revela el primer QR del stand y
 * anticipa visualmente la escena del estudiante que viene.
 *
 * Cronología:
 *   f 0–42    "Hay una mejor manera." eco de Scene1, se desvanece
 *   f 0–12    Subrayado bajo la frase (continúa desde Scene1)
 *   f 22–54   Línea horizontal principal atraviesa la pantalla
 *   f 50–118  Marco del QR se dibuja desde donde llega la línea
 *   f 105–138 Tarjeta blanca del stand aparece dentro del marco
 *   f 88–162  QRAbstractGrid construye el QR célula a célula
 *   f 135–162 Label "Feria Servicio Social / Escanea para registrarte"
 *   f 148–180 Zoom push sutil + fade out
 */
export const SceneBridge = () => {
  const frame = useCurrentFrame();

  const sceneIn  = interpolate(frame, [0, 18], [0, 1], C);
  const sceneOut = interpolate(frame, [162, 180], [1, 0], C);

  // Eco de "Hay una mejor manera." — enlaza visualmente con Scene1
  const phraseOp = Math.min(
    interpolate(frame, [0, 10], [0, 1], C),
    interpolate(frame, [22, 42], [1, 0], C)
  );

  // Subrayado — enlaza con el subrayado final de Scene1
  const underlineOp = Math.min(
    interpolate(frame, [0, 10], [0, 1], C),
    interpolate(frame, [28, 50], [1, 0], C)
  );

  // Línea horizontal — "el sistema se activa"
  const mainLineOp = Math.min(
    interpolate(frame, [20, 38], [0, 1], C),
    interpolate(frame, [100, 122], [1, 0], C)
  );

  // Tarjeta blanca del stand
  const cardOp = interpolate(frame, [105, 138], [0, 1], C);

  // Label del stand
  const labelOp = Math.min(
    interpolate(frame, [135, 158], [0, 1], C),
    interpolate(frame, [162, 178], [1, 0], C)
  );

  // Zoom push al cierre
  const zoom = interpolate(frame, [148, 180], [1, 1.06], C);

  // Corner reticles
  const reticleOp = Math.min(
    interpolate(frame, [110, 130], [0, 0.5], C),
    interpolate(frame, [162, 178], [0.5, 0], C)
  );

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: "#050D1A",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity: Math.min(sceneIn, sceneOut),
    }}>
      {/* Viñeta radial oscura */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 32%, rgba(0,0,0,0.62) 100%)",
      }} />

      {/* Punto de luz central tenue (acento) */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 55% 50% at 50% 50%, ${COLORS.accentDim} 0%, transparent 70%)`,
        opacity: Math.min(interpolate(frame, [50, 80], [0, 1], C), interpolate(frame, [155, 175], [1, 0], C)),
      }} />

      {/* "Hay una mejor manera." — eco visual de Scene1 */}
      <div style={{
        position: "absolute", width: "100%", textAlign: "center",
        zIndex: 20, opacity: phraseOp, pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: FONTS.sans, fontSize: 88, fontWeight: 800,
          color: COLORS.white, letterSpacing: "-3.5px", lineHeight: 1.05,
        }}>
          Hay una{" "}
          <span style={{ color: COLORS.accent }}>mejor manera.</span>
        </div>
      </div>

      {/* Subrayado bajo "mejor manera." — continúa desde Scene1 */}
      <DigitalGuideLine
        mode="underline"
        startFrame={0} duration={12}
        x1={835} x2={1478} y1={593}
        color={COLORS.accent}
        strokeWidth={5}
        glow={true} glowSize={14}
        opacity={underlineOp}
        style={{ zIndex: 21 }}
        viewBox="0 0 1920 1080"
      />

      {/* Línea horizontal principal — "el sistema digital existe" */}
      <DigitalGuideLine
        mode="draw"
        startFrame={22} duration={32}
        path="M 0 540 L 1920 540"
        viewBox="0 0 1920 1080"
        color={COLORS.accent}
        strokeWidth={3}
        glow={true} glowSize={18}
        opacity={mainLineOp}
        style={{ zIndex: 30 }}
      />

      {/* Marco del QR — la línea dibuja el rectángulo del stand */}
      <DigitalGuideLine
        mode="draw"
        startFrame={50} duration={68}
        path={FRAME_PATH}
        viewBox="0 0 1920 1080"
        color={COLORS.accent}
        strokeWidth={3}
        glow={true} glowSize={14}
        style={{ zIndex: 40 }}
      />

      {/* Tarjeta blanca del stand + QR */}
      <div style={{
        position: "absolute",
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
        zIndex: 50,
      }}>
        <div style={{
          width: 380,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 28,
          opacity: cardOp,
          boxShadow: cardOp > 0.05
            ? `0 0 80px rgba(0,85,255,${(cardOp * 0.35).toFixed(2)}), 0 24px 80px rgba(0,0,0,0.7)`
            : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}>
          {/* QR construyéndose célula a célula */}
          <div style={{ width: QR_SIZE, height: QR_SIZE, position: "relative" }}>
            {frame >= 85 && (
              <QRAbstractGrid
                size={QR_SIZE}
                startFrame={90}
                buildDuration={72}
                cellColor={COLORS.ink}
              />
            )}
          </div>

          {/* Label del stand */}
          <div style={{ textAlign: "center", opacity: labelOp }}>
            <div style={{
              fontFamily: FONTS.sans, fontSize: 18, fontWeight: 700,
              color: COLORS.ink, letterSpacing: "-0.3px",
            }}>
              Feria Servicio Social
            </div>
            <div style={{
              fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
              letterSpacing: "0.5px", marginTop: 5,
            }}>
              Escanea para registrarte
            </div>
          </div>
        </div>
      </div>

      {/* Corner reticles — estética de cámara/scanner */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: reticleOp }}
        viewBox="0 0 1920 1080"
      >
        <path d="M 64 64 L 130 64 M 64 64 L 64 130"
          stroke={COLORS.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 1856 64 L 1790 64 M 1856 64 L 1856 130"
          stroke={COLORS.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 64 1016 L 130 1016 M 64 1016 L 64 950"
          stroke={COLORS.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 1856 1016 L 1790 1016 M 1856 1016 L 1856 950"
          stroke={COLORS.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};
