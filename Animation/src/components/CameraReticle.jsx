import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants.js";

export const CameraReticle = ({
  size      = 340,
  startFrame = 0,
  duration   = 60,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Las esquinas parten separadas (offset) y convergen al centro
  const maxOffset = size * 0.08;
  const offset    = interpolate(progress, [0, 1], [maxOffset, 0]);
  const cornerW   = size * 0.18;
  const bw        = 3;

  // Línea de escaneo: sube y baja entre startFrame+duration y startFrame+duration+90
  const scanY = interpolate(
    frame,
    [startFrame + duration, startFrame + duration + 90],
    [4, size - 4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const base = (extraBorder) => ({
    position: "absolute",
    width:  cornerW,
    height: cornerW,
    borderColor: COLORS.accent,
    borderStyle: "solid",
    opacity: progress,
    ...extraBorder,
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {/* Esquina superior-izquierda */}
      <div style={base({
        top: offset, left: offset,
        borderWidth: `${bw}px 0 0 ${bw}px`,
        borderTopLeftRadius: 6,
      })} />
      {/* Esquina superior-derecha */}
      <div style={base({
        top: offset, right: offset,
        borderWidth: `${bw}px ${bw}px 0 0`,
        borderTopRightRadius: 6,
      })} />
      {/* Esquina inferior-izquierda */}
      <div style={base({
        bottom: offset, left: offset,
        borderWidth: `0 0 ${bw}px ${bw}px`,
        borderBottomLeftRadius: 6,
      })} />
      {/* Esquina inferior-derecha */}
      <div style={base({
        bottom: offset, right: offset,
        borderWidth: `0 ${bw}px ${bw}px 0`,
        borderBottomRightRadius: 6,
      })} />

      {/* Crosshair central */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 1, height: size * 0.25,
        backgroundColor: `${COLORS.accent}50`,
        opacity: progress,
      }} />
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: size * 0.25, height: 1,
        backgroundColor: `${COLORS.accent}50`,
        opacity: progress,
      }} />

      {/* Línea de escaneo */}
      <div style={{
        position: "absolute",
        left:  offset + 8,
        right: offset + 8,
        top:   scanY,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
        opacity: progress * 0.85,
        boxShadow: `0 0 10px ${COLORS.accent}`,
      }} />
    </div>
  );
};
