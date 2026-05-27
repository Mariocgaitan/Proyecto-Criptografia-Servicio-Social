import { useCurrentFrame } from "remotion";
import { FONTS, COLORS } from "../constants.js";

function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 4294967296;
  };
}

const COLS = 22;
const r = seededRand(0xABCD1234);
const CHAR_H = 22;
const HEX = "0123456789ABCDEF";

const COL_DATA = Array.from({ length: COLS }, (_, i) => ({
  x:      Math.round((i / COLS) * 1880 + 20),
  speed:  0.55 + r() * 1.2,
  offset: r() * 900,
  trailLen: Math.floor(12 + r() * 20),
  chars: Array.from({ length: 42 }, () => HEX[Math.floor(r() * 16)]),
}));

export const MatrixRain = ({ opacity = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {COL_DATA.map((col, ci) =>
        col.chars.map((char, ri) => {
          const total = col.chars.length;
          const headIdx = Math.floor((col.offset + frame * col.speed) / CHAR_H) % total;
          const dist = (headIdx - ri + total) % total;
          if (dist > col.trailLen) return null;
          const isHead = dist === 0;
          const alpha = isHead
            ? 0.18 * opacity
            : (1 - dist / col.trailLen) * 0.065 * opacity;
          return (
            <div
              key={`${ci}-${ri}`}
              style={{
                position: "absolute",
                left: col.x,
                top: ri * CHAR_H,
                fontFamily: FONTS.mono,
                fontSize: 13,
                color: isHead ? "#ffffff" : COLORS.green,
                opacity: alpha,
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {char}
            </div>
          );
        })
      )}
    </div>
  );
};
