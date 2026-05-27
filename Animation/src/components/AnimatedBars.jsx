import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS, SPRING } from "../constants.js";

const BAR_COLORS = ["#3b82f6", "#60a5fa", "#a78bfa", "#34d399", "#f59e0b"];

export const AnimatedBars = ({ bars, maxBarHeight = 260, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", gap: 28, alignItems: "flex-end", height: maxBarHeight + 60 }}>
      {bars.map((bar, i) => {
        const delay = bar.delay ?? startFrame + i * 8;
        const color = BAR_COLORS[i % BAR_COLORS.length];

        const s = spring({
          frame: frame - delay,
          fps,
          config: SPRING.standard,
          from: 0,
          to: 1,
        });

        const barHeightPx = s * (bar.value / (bar.max ?? 100)) * maxBarHeight;

        const displayValue = Math.floor(
          interpolate(frame, [delay, delay + 50], [0, bar.value], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        );

        return (
          <div
            key={bar.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              width: 110,
            }}
          >
            {/* Valor numérico */}
            <div
              style={{
                fontFamily: FONTS.sans,
                fontSize: 22,
                fontWeight: 700,
                color,
                minHeight: 30,
                textAlign: "center",
              }}
            >
              {displayValue}
              {bar.suffix ?? ""}
            </div>

            {/* Barra */}
            <div
              style={{
                width: "100%",
                height: maxBarHeight,
                backgroundColor: COLORS.white05,
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${barHeightPx}px`,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
                  borderRadius: 8,
                  boxShadow: `0 0 24px ${color}50`,
                  transition: "none",
                }}
              />
            </div>

            {/* Label */}
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                color: COLORS.white30,
                textAlign: "center",
              }}
            >
              {bar.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
