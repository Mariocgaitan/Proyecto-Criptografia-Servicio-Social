import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

/**
 * CameraMove — virtual 2D camera wrapper
 *
 * Aplica un movimiento global sutil al contenido de una escena,
 * creando la ilusión de cámara aunque todo sea 2D.
 *
 * Coloca este componente DENTRO del div outer (overflow:hidden)
 * de cada escena, envolviendo todo el contenido.
 *
 * Props:
 *   type       — "pushIn" | "zoomOut" | "panLeft" | "panRight" | "breathe"
 *   intensity  — 0–1 (default 0.5) — qué tan pronunciado es el movimiento
 *   startFrame — frame en que comienza la animación (default 0)
 *   endFrame   — frame en que termina (default: durationInFrames de la escena)
 *   children   — contenido de la escena
 */
export const CameraMove = ({
  children,
  type = "pushIn",
  intensity = 0.5,
  startFrame = 0,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const end = endFrame ?? durationInFrames;
  const t = interpolate(frame, [startFrame, end], [0, 1], C);

  // Rango máximo de movimiento según tipo
  const MAX_SCALE = 0.04 * intensity;   // up to 4% scale
  const MAX_PAN   = 32 * intensity;     // up to 32px pan

  let scale = 1;
  let tx = 0;
  let ty = 0;

  switch (type) {
    case "pushIn":
      // Cámara se acerca lentamente — la acción crece
      scale = 1 + MAX_SCALE * t;
      break;
    case "zoomOut":
      // Inicia cercano, se aleja para revelar el contexto
      scale = 1 + MAX_SCALE * (1 - t);
      break;
    case "panLeft":
      // Desplazamiento lateral izquierdo — sigue el flujo
      tx = -MAX_PAN * t;
      scale = 1 + MAX_SCALE * 0.35;
      break;
    case "panRight":
      // Desplazamiento lateral derecho
      tx = MAX_PAN * t;
      scale = 1 + MAX_SCALE * 0.35;
      break;
    case "breathe":
      // Respiración sutil — mantiene vida en escenas estáticas
      scale = 1 + 0.005 * intensity * Math.sin(frame * 0.07);
      break;
    default:
      break;
  }

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      transformOrigin: "center center",
      transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
    }}>
      {children}
    </div>
  );
};
