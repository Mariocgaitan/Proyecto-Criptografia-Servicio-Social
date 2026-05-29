import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

const URL_TEXT = "feriaserviciosocial.com";

// Pill bar centered on the page
const BAR = { w: 1180, h: 110, x: (1920 - 1180) / 2, y: (1080 - 110) / 2 - 20 };
const BAR_CENTER = { x: BAR.x + BAR.w / 2, y: BAR.y + BAR.h / 2 };

const PHASES = {
  cursorMove:  { start: 0,   end: 28  },
  cursorClick: { start: 28,  end: 44  },
  typing:      { start: 44,  end: 124 },   // ~3.5 frames/char — fast
  cameraFlat:  { start: 10,  end: 140 },   // camera dolly-in throughout typing
  enterPress:  { start: 130, end: 152 },
  pageLoad:    { start: 152, end: 184 },
  zoomLogin:   { start: 184, end: 300 },
};

function HandCursor({ x, y, clicking }) {
  return (
    <svg
      width={64}
      height={72}
      viewBox="0 0 32 36"
      style={{
        position: "absolute",
        left: x - 18,
        top: y - 4,
        transform: `scale(${clicking ? 0.88 : 1})`,
        transformOrigin: "18px 4px",
        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))",
        zIndex: 100,
      }}
    >
      <path
        d="M14 4 C14 2.9 14.9 2 16 2 C17.1 2 18 2.9 18 4 L18 16
           L20 16 C21.1 16 22 16.9 22 18 L22 19
           L24 19 C25.1 19 26 19.9 26 21 L26 22
           L27 22 C28.1 22 29 22.9 29 24 L29 30
           C29 32.2 27.2 34 25 34 L17 34 C15.5 34 14.1 33.3 13.2 32.1
           L7 24 C6.3 23 6.5 21.7 7.4 21 C8.4 20.3 9.7 20.5 10.4 21.4 L13 24.5
           L13 4 C13 2.9 13.9 2 15 2 Z"
        fill="#FFFFFF"
        stroke="#08081A"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SceneBrowserSearch = () => {
  const frame = useCurrentFrame();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Bar entrance
  const barOpacity = interpolate(frame, [0, 18], [0, 1], C);

  // Camera move — starts wide showing lots of white background, settles on bar
  const tiltT = interpolate(
    frame,
    [PHASES.cameraFlat.start, PHASES.cameraFlat.end],
    [0, 1],
    C,
  );
  const tiltEase = easeInOut(tiltT);
  const rotateX = interpolate(tiltEase, [0, 1], [18, 0]);
  const rotateY = interpolate(tiltEase, [0, 1], [-12, 0]);
  const camScale = interpolate(tiltEase, [0, 1], [0.48, 1]);
  const camTx = interpolate(tiltEase, [0, 1], [-360, 0]);
  const camTy = interpolate(tiltEase, [0, 1], [240, 0]);

  // Cursor path: enters from bottom-right, arcs up to hover under bar
  const cursorStart = { x: 1100, y: 1180 };
  const cursorHover = { x: BAR_CENTER.x - 10, y: BAR_CENTER.y + 30 };
  const cursorT = interpolate(frame, [PHASES.cursorMove.start, PHASES.cursorMove.end], [0, 1], C);
  const ce = ease(cursorT);
  const cursorX = cursorStart.x + (cursorHover.x - cursorStart.x) * ce;
  const cursorY = cursorStart.y + (cursorHover.y - cursorStart.y) * ce;

  // Click ring
  const inClickPhase = frame >= PHASES.cursorClick.start && frame < PHASES.cursorClick.end;
  const clickRingT = interpolate(frame, [PHASES.cursorClick.start, PHASES.cursorClick.start + 16], [0, 1], C);
  const clickRingScale = interpolate(clickRingT, [0, 1], [0.3, 2.8]);
  const clickRingOpacity = interpolate(clickRingT, [0, 1], [0.6, 0]);

  // Bar focus state
  const barFocused = frame >= PHASES.cursorClick.start + 6;
  const focusGlow = interpolate(
    frame,
    [PHASES.cursorClick.start + 4, PHASES.cursorClick.start + 14],
    [0, 1],
    C,
  );

  // Typing
  const typingProgress = interpolate(frame, [PHASES.typing.start, PHASES.typing.end], [0, 1], C);
  const visibleChars = Math.floor(typingProgress * URL_TEXT.length);
  const urlText = URL_TEXT.slice(0, visibleChars);
  const showCaret = frame >= PHASES.cursorClick.start + 6 && frame < PHASES.pageLoad.start;
  const caretVisible = showCaret && Math.floor(frame / 8) % 2 === 0;

  // Enter indicator
  const enterT = interpolate(frame, [PHASES.enterPress.start, PHASES.enterPress.end], [0, 1], C);
  const enterScale = interpolate(enterT, [0, 0.4, 1], [0.85, 1, 1]);
  const enterOpacity = interpolate(enterT, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  // Page transition
  const loadT = interpolate(frame, [PHASES.pageLoad.start, PHASES.pageLoad.end], [0, 1], C);
  const barExitOpacity = interpolate(loadT, [0, 0.6], [1, 0], C);
  const barExitScale = interpolate(loadT, [0, 1], [1, 1.18], C);

  const loginAppear = interpolate(
    frame,
    [PHASES.pageLoad.start + 10, PHASES.zoomLogin.start + 8],
    [0, 1],
    C,
  );
  const loginZoom = interpolate(
    frame,
    [PHASES.zoomLogin.start, PHASES.zoomLogin.end],
    [1.04, 1.0],
    C,
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: 1920,
        height: 1080,
        background: "#FFFFFF",
        overflow: "hidden",
        fontFamily: FONTS.sans,
        perspective: "1800px",
        perspectiveOrigin: "50% 50%",
      }}
    >
      {/* Login screenshot underneath */}
      {loginAppear > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: loginAppear,
            transform: `scale(${loginZoom})`,
            transformOrigin: "center center",
          }}
        >
          <Img
            src={staticFile("screenshots/login_page.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* 3D-tilted layer holding the URL bar */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${camTx}px, ${camTy}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${camScale})`,
          transformOrigin: "50% 50%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* URL bar */}
        <div
          style={{
            position: "absolute",
            left: BAR.x,
            top: BAR.y,
            width: BAR.w,
            height: BAR.h,
            opacity: barOpacity * barExitOpacity,
            transform: `scale(${barExitScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Outer focus glow */}
          {focusGlow > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: BAR.h / 2 + 8,
                boxShadow: `0 0 0 4px rgba(0,85,255,${0.18 * focusGlow}), 0 0 48px rgba(0,85,255,${0.25 * focusGlow})`,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Bar surface */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#FFFFFF",
              borderRadius: BAR.h / 2,
              boxShadow: barFocused
                ? "0 14px 42px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06), inset 0 0 0 2px rgba(0,85,255,0.55)"
                : "0 12px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              padding: "0 44px",
              gap: 24,
            }}
          >
            {/* Lock icon */}
            <svg width={28} height={28} viewBox="0 0 24 24" fill="rgba(8,8,26,0.4)">
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
            </svg>

            {/* URL text */}
            <div
              style={{
                flex: 1,
                fontFamily: FONTS.sans,
                fontSize: 44,
                fontWeight: 400,
                color: COLORS.ink,
                letterSpacing: "-0.5px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span>{urlText}</span>
              {caretVisible && (
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: 48,
                    background: COLORS.accent,
                    marginLeft: 2,
                  }}
                />
              )}
            </div>

            {/* Right micro dot */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: "rgba(8,8,26,0.15)",
              }}
            />
          </div>
        </div>

        {/* Click ring (inside tilt layer so it follows perspective) */}
        {inClickPhase && (
          <div
            style={{
              position: "absolute",
              left: cursorHover.x - 16,
              top: cursorHover.y - 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              border: `3px solid ${COLORS.accent}`,
              transform: `scale(${clickRingScale})`,
              opacity: clickRingOpacity * barExitOpacity,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Hand cursor */}
        {frame < PHASES.pageLoad.start && (
          <HandCursor x={cursorX} y={cursorY} clicking={inClickPhase} />
        )}
      </div>

      {/* Enter indicator (outside tilt — stays flat for legibility) */}
      {enterOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: 960 - 90,
            top: 880,
            width: 180,
            padding: "16px 0",
            textAlign: "center",
            background: "#FFFFFF",
            border: `2px solid ${COLORS.accent}`,
            borderRadius: 14,
            color: COLORS.ink,
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1.5,
            opacity: enterOpacity,
            transform: `scale(${enterScale})`,
            boxShadow: `0 10px 32px rgba(0,85,255,0.25)`,
          }}
        >
          Enter
        </div>
      )}
    </div>
  );
};
