import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "../constants.js";

// ── Tokenizador JSON simple ────────────────────────────────────────────────────
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    // String
    if (text[i] === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') {
        if (text[j] === "\\") j++;
        j++;
      }
      j++; // closing quote
      tokens.push({ type: "string", value: text.slice(i, j) });
      i = j;
      continue;
    }
    // Número
    const numMatch = text.slice(i).match(/^-?\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ type: "number", value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }
    // Resto (punctuation, whitespace, newlines)
    tokens.push({ type: "other", value: text[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLORS = {
  string: "#a3e635",  // green para strings
  number: "#f59e0b",  // amber para números
  other:  COLORS.white60,
};

// ── Componente ─────────────────────────────────────────────────────────────────
export const TerminalTyper = ({
  text,
  startFrame   = 0,
  duration     = 60,
  highlightKeys = [],    // claves JSON a resaltar en acento azul
}) => {
  const frame = useCurrentFrame();

  const charsToShow = Math.floor(
    interpolate(frame, [startFrame, startFrame + duration], [0, text.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const visible  = text.slice(0, charsToShow);
  const tokens   = tokenize(visible);

  return (
    <pre
      style={{
        fontFamily: FONTS.mono,
        fontSize: "inherit",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {tokens.map((tok, idx) => {
        let color = TOKEN_COLORS[tok.type] ?? COLORS.white60;

        // Claves especiales en azul acento
        if (tok.type === "string") {
          const inner = tok.value.slice(1, -1);
          if (highlightKeys.includes(inner)) color = COLORS.accent;
        }

        return (
          <span key={idx} style={{ color }}>
            {tok.value}
          </span>
        );
      })}
    </pre>
  );
};
