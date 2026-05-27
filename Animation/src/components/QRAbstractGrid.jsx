import { useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants.js";

const GRID_SIZE = 21;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 441

// ── Generador pseudo-aleatorio determinístico (LCG) ──────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    s = s >>> 0;
    return s / 0xffffffff;
  };
}

// Orden de revelado: cada celda tiene una fracción [0,1] que indica
// cuándo aparece dentro del buildDuration. Calculado una sola vez.
const _revealRng = makePRNG(0x1a2b3c4d);
const REVEAL_FRACTIONS = Array.from({ length: TOTAL_CELLS }, () => _revealRng());

// ── Patrón visual tipo QR ─────────────────────────────────────────────────────
const _darkRng = makePRNG(0x9f8e7d6c);
const CELL_IS_DARK = Array.from({ length: TOTAL_CELLS }, (_, idx) => {
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;

  // Finder pattern: esquina superior-izquierda (7×7)
  if (row < 7 && col < 7) {
    if (row === 0 || row === 6 || col === 0 || col === 6) return true;
    if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
    return false;
  }
  // Finder pattern: esquina superior-derecha (cols 14-20)
  if (row < 7 && col > 13) {
    const c = col - 14;
    if (row === 0 || row === 6 || c === 0 || c === 6) return true;
    if (row >= 2 && row <= 4 && c >= 2 && c <= 4) return true;
    return false;
  }
  // Finder pattern: esquina inferior-izquierda (rows 14-20)
  if (row > 13 && col < 7) {
    const r = row - 14;
    if (r === 0 || r === 6 || col === 0 || col === 6) return true;
    if (r >= 2 && r <= 4 && col >= 2 && col <= 4) return true;
    return false;
  }
  // Timing patterns
  if (row === 6 && col >= 8 && col <= 12) return col % 2 === 0;
  if (col === 6 && row >= 8 && row <= 12) return row % 2 === 0;
  // Alignment pattern central
  if (row >= 8 && row <= 12 && col >= 8 && col <= 12) {
    if (row === 8 || row === 12 || col === 8 || col === 12) return true;
    if (row === 10 && col === 10) return true;
    return false;
  }
  // Interior pseudo-aleatorio (determinístico)
  return _darkRng() > 0.42;
});

// ── Componente ────────────────────────────────────────────────────────────────
export const QRAbstractGrid = ({
  size         = 280,
  startFrame   = 0,
  buildDuration = 180,
  cellColor    = COLORS.white,
}) => {
  const frame   = useCurrentFrame();
  const progress = interpolate(
    frame,
    [startFrame, startFrame + buildDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cellSize = size / GRID_SIZE;

  return (
    <svg
      width={size}
      height={size}
      style={{ display: "block", borderRadius: 4 }}
    >
      {/* Fondo oscuro */}
      <rect width={size} height={size} fill="rgba(0,0,0,0.6)" rx={4} />

      {Array.from({ length: TOTAL_CELLS }, (_, i) => {
        if (!CELL_IS_DARK[i]) return null;
        if (progress < REVEAL_FRACTIONS[i]) return null;

        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;

        return (
          <rect
            key={i}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize - 0.5}
            height={cellSize - 0.5}
            fill={cellColor}
            rx={1}
          />
        );
      })}
    </svg>
  );
};
