import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Duración total de la transición: 30 frames (1 s a 30 fps)
// Se usa dentro de un <Sequence durationInFrames={30} from={sceneStart - 12}>
// para que la línea esté cruzando justo cuando cambia la escena.

export const SceneTransition = () => {
  const frame = useCurrentFrame();

  // Línea de acento — la más rápida, abre el paso
  const leadX  = interpolate(frame, [0,  26], [-80,  2060], C);
  // Banda oscura principal — sigue a la línea líder
  const bandX  = interpolate(frame, [3,  29], [-240, 2300], C);
  // Línea blanca de cierre — cierra la banda por detrás
  const trailX = interpolate(frame, [6,  32], [-80,  2060], C);
  // Segunda línea de acento tenue — acompaña la banda
  const accentX = interpolate(frame, [1, 27], [-80,  2060], C);

  const SKEW = "skewX(-7deg)";

  return (
    <div style={{
      position: "absolute", inset: 0,
      zIndex: 100, pointerEvents: "none", overflow: "hidden",
    }}>
      {/* Línea de acento líder */}
      <div style={{
        position: "absolute", top: 0, height: "100%",
        left: leadX, width: 4,
        backgroundColor: COLORS.accent,
        boxShadow: `0 0 18px ${COLORS.accent}, 0 0 36px rgba(0,85,255,0.45)`,
        transform: SKEW,
      }} />

      {/* Segunda línea de acento (un poco más gruesa, ligeramente detrás) */}
      <div style={{
        position: "absolute", top: 0, height: "100%",
        left: accentX - 14, width: 2,
        backgroundColor: `rgba(0,85,255,0.55)`,
        transform: SKEW,
      }} />

      {/* Banda oscura principal */}
      <div style={{
        position: "absolute", top: 0, height: "100%",
        left: bandX - 180, width: 180,
        background: "linear-gradient(90deg, transparent 0%, rgba(5,13,26,0.97) 18%, #050D1A 52%, rgba(5,13,26,0.97) 84%, transparent 100%)",
        transform: SKEW,
      }} />

      {/* Línea blanca de cierre */}
      <div style={{
        position: "absolute", top: 0, height: "100%",
        left: trailX + 6, width: 2,
        backgroundColor: "rgba(255,255,255,0.62)",
        transform: SKEW,
      }} />
    </div>
  );
};
