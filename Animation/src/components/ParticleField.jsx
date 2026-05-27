import { useCurrentFrame } from "remotion";
import { COLORS } from "../constants.js";

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}

const COUNT = 60;
const r = seededRand(0xF3A9B2C1);
const PARTICLES = Array.from({ length: COUNT }, () => ({
  x:      r() * 1920,
  y:      r() * 1080,
  size:   0.8 + r() * 2.8,
  speedY: 0.12 + r() * 0.45,
  speedX: (r() - 0.5) * 0.12,
  phase:  r() * Math.PI * 2,
  baseOp: 0.06 + r() * 0.22,
}));

export const ParticleField = ({ color = COLORS.white, globalOpacity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {PARTICLES.map((p, i) => {
        const y = ((p.y - p.speedY * frame) % 1080 + 1080) % 1080;
        const x = (p.x + p.speedX * frame + Math.sin(frame * 0.018 + p.phase) * 14 + 1920) % 1920;
        const flicker = 0.65 + 0.35 * Math.sin(frame * 0.07 + p.phase * 2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: p.baseOp * flicker * globalOpacity,
            }}
          />
        );
      })}
    </div>
  );
};
