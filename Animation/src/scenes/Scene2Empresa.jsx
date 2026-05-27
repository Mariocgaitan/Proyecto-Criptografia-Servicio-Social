import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { QRAbstractGrid } from "../components/QRAbstractGrid.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

const DARK_BG   = "#050D1A";
const DARK_CARD = "#0F1E35";
const BLUE_MID  = "#1E3A8A";
const BLUE_PALE = "#93B4E0";
const LIGHT_BG  = "#EEF4FF";

// ─────────────────────────────────────────────────────────────────────
// TIMINGS GENERALES
// Intro: f0-180 (pantalla completa, texto manifiesto)
// Split aparece: f180-215
// QR side: teléfono f215+, scan f260+, done f330+
// Paper viñetas: aparecen f215+ (zoom-in then settle)
// Banner: f460-530
// sceneOut: f512-540
// ─────────────────────────────────────────────────────────────────────

// Viñetas del lado manual — cada una hace zoom-in grande, luego encoge a su lugar
const VIÑETAS = [
  { icon: "🔍", title: "Buscar en lista",        sub: "¿Está preregistrado?",    heroF: 215, settleF: 250 },
  { icon: "🪪", title: "Pedir credencial",        sub: "Verificación visual",     heroF: 268, settleF: 303 },
  { icon: "📋", title: "Verificar datos",          sub: "Nombre, carrera, matrícula", heroF: 318, settleF: 353 },
  { icon: "✍",  title: "Anotar en planilla",      sub: "A mano, en papel",        heroF: 368, settleF: 403 },
  { icon: "⏳", title: "Esperar supervisor",       sub: "Firma y validación",      heroF: 418, settleF: 453 },
];

export const Scene2Empresa = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneOut = interpolate(frame, [512, 540], [1, 0], C);

  // ═══════════════════════════════════════════════════════════════════
  // FASE 1: INTRO (f0-180) — pantalla completa oscura
  // ═══════════════════════════════════════════════════════════════════
  const introOp = interpolate(frame, [165, 195], [1, 0], C);
  const splitOp = interpolate(frame, [180, 215], [0, 1], C);

  // Palabras intro — aparecen escalonadas, cinéticas
  const introWords = [
    { text: "Cada alumno.",         f: 12,  size: 96,  weight: 900, color: "#fff"    },
    { text: "Un formulario.",       f: 42,  size: 72,  weight: 300, color: BLUE_PALE },
    { text: "Una lista.",           f: 70,  size: 72,  weight: 300, color: BLUE_PALE },
    { text: "Una firma.",           f: 96,  size: 72,  weight: 300, color: BLUE_PALE },
    { text: "3 minutos perdidos.",  f: 124, size: 88,  weight: 700, color: COLORS.accent },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // LADO QR — timings ajustados a split (f180+)
  // ═══════════════════════════════════════════════════════════════════
  const qrDone = frame >= 330;

  const phoneY  = spring({ frame: frame - 200, fps, config: { damping: 22, stiffness: 130 }, from: 500, to: 0 });
  const phoneOp = interpolate(frame, [200, 235], [0, 1], C);

  const qrSecs     = Math.min(2.3, Math.max(0, (frame - 255) / 30));
  const qrTimerStr = qrDone ? "2.3s" : qrSecs.toFixed(1) + "s";

  const laserY  = interpolate(frame, [260, 330], [-110, 110], C);
  const laserOp = frame >= 260 && frame < 330 ? 0.88 : 0;

  const cornersOp = interpolate(frame, [188, 210], [0, 1], C);
  const cornerClr = qrDone ? COLORS.accent : "rgba(255,255,255,0.7)";

  const flashOp = qrDone ? interpolate(frame, [330, 355], [0.32, 0], C) : 0;

  const cardY  = spring({ frame: frame - 348, fps, config: { damping: 22, stiffness: 140 }, from: 160, to: 0 });
  const cardOp = interpolate(frame, [348, 385], [0, 1], C);

  const inscritoOp  = interpolate(frame, [388, 420], [0, 1], C);
  const inscritoScl = spring({ frame: frame - 388, fps, config: { damping: 26, stiffness: 200 }, from: 0.55, to: 1 });

  // ═══════════════════════════════════════════════════════════════════
  // LADO PAPEL — timer corriendo
  // ═══════════════════════════════════════════════════════════════════
  const paperTotalSecs = Math.max(0, (frame - 215) / 30);
  const paperMin = Math.floor(paperTotalSecs / 60);
  const paperSec = Math.floor(paperTotalSecs % 60);
  const paperTimerStr = paperMin + ":" + String(paperSec).padStart(2, "0");

  // ═══════════════════════════════════════════════════════════════════
  // BANNER (f460+)
  // ═══════════════════════════════════════════════════════════════════
  const bannerOp = Math.min(
    interpolate(frame, [460, 490], [0, 1], C),
    interpolate(frame, [505, 525], [1, 0], C)
  );
  const bannerY = spring({ frame: frame - 460, fps, config: { damping: 24, stiffness: 160 }, from: 100, to: 0 });
  const qrCount    = Math.floor(interpolate(Math.min(frame, 505), [462, 505], [0, 260], C));
  const paperCount = Math.floor(interpolate(Math.min(frame, 505), [462, 505], [0, 18],  C));

  return (
    <div style={{ width: 1920, height: 1080, position: "relative", overflow: "hidden", opacity: sceneOut, backgroundColor: DARK_BG }}>

      {/* ══════════════════════════════════════════════════
          FASE 1: INTRO pantalla completa
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 30,
        display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
        paddingLeft: 160, paddingRight: 160,
        opacity: introOp, pointerEvents: "none",
        background: `radial-gradient(ellipse at 30% 50%, rgba(0,85,255,0.08) 0%, transparent 65%)`,
      }}>
        {introWords.map((w, i) => {
          const wOp  = interpolate(frame, [w.f, w.f + 22], [0, 1], C);
          const wY   = interpolate(frame, [w.f, w.f + 22], [28, 0], C);
          return (
            <div key={i} style={{
              fontFamily: FONTS.sans, fontSize: w.size, fontWeight: w.weight,
              color: w.color, lineHeight: 1.15, letterSpacing: "-2px",
              opacity: wOp, transform: `translateY(${wY}px)`,
              marginBottom: i === 3 ? 32 : 0,
            }}>
              {w.text}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          FASE 2: SPLIT SCREEN
      ══════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        opacity: splitOp, pointerEvents: frame < 180 ? "none" : "auto",
      }}>

        {/* Banda top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4, zIndex: 20,
          background: `linear-gradient(90deg, ${COLORS.accent} 50%, rgba(30,58,138,0.18) 50%)`,
        }} />

        {/* ─── IZQUIERDA: QR ─────────────────────────────── */}
        <div style={{ width: 960, height: 1080, backgroundColor: DARK_BG, position: "relative", overflow: "hidden", flexShrink: 0 }}>

          {/* Viñeta radial */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.62) 100%)", pointerEvents: "none" }} />

          {/* Flash */}
          <div style={{ position: "absolute", inset: 0, backgroundColor: COLORS.accent, opacity: flashOp, pointerEvents: "none" }} />

          {/* Esquinas cámara */}
          <div style={{ position: "absolute", inset: 55, zIndex: 3, opacity: cornersOp }}>
            {[
              { top: 0,        left: 0,        rot: 0   },
              { top: 0,        right: 0,        rot: 90  },
              { bottom: 0,     left: 0,         rot: 270 },
              { bottom: 0,     right: 0,        rot: 180 },
            ].map((p, i) => (
              <div key={i} style={{ position: "absolute", top: p.top, left: p.left, bottom: p.bottom, right: p.right }}>
                <svg width="44" height="44" style={{ transform: `rotate(${p.rot}deg)`, display: "block" }}>
                  <line x1="0" y1="2" x2="44" y2="2" stroke={cornerClr} strokeWidth="4" strokeLinecap="round" />
                  <line x1="2" y1="0" x2="2" y2="44" stroke={cornerClr} strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            ))}
          </div>

          {/* Label sutil top-left integrado */}
          <div style={{
            position: "absolute", top: 28, left: 38, zIndex: 6,
            opacity: cornersOp, fontFamily: FONTS.mono, fontSize: 10,
            color: "rgba(0,85,255,0.55)", letterSpacing: "3px", textTransform: "uppercase",
          }}>
            QR · Cámara
          </div>

          {/* REC */}
          <div style={{
            position: "absolute", top: 26, right: 38, zIndex: 6,
            display: "flex", alignItems: "center", gap: 7, opacity: cornersOp,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: COLORS.accent, opacity: 0.6 + 0.4 * Math.sin(frame / 9 * Math.PI) }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>REC 9:03</span>
          </div>

          {/* Teléfono */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: `translate(-50%, calc(-50% + ${phoneY}px))`,
            opacity: phoneOp, zIndex: 4,
          }}>
            <div style={{
              width: 190, height: 350, borderRadius: 22,
              backgroundColor: "#0A1628",
              border: "1.5px solid rgba(255,255,255,0.10)",
              boxShadow: "0 0 60px rgba(0,0,0,0.75), 0 0 80px rgba(0,85,255,0.12)",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28, backgroundColor: "#050D1A", display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 12 }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 8, color: "rgba(255,255,255,0.35)" }}>9:03</span>
                <span style={{ fontFamily: FONTS.sans, fontSize: 8, fontWeight: 700, color: COLORS.accent }}>FSS</span>
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 7, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8, marginTop: 6 }}>
                Mi QR
              </div>
              <QRAbstractGrid size={108} startFrame={230} buildDuration={30} cellColor={COLORS.white} />
              <div style={{ position: "absolute", bottom: 28, fontFamily: FONTS.mono, fontSize: 7, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>
                Carlos Silva · A01234567
              </div>
              <div style={{ position: "absolute", bottom: 10, width: 28, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.10)" }} />
            </div>
          </div>

          {/* Láser */}
          {laserOp > 0 && (
            <div style={{
              position: "absolute", zIndex: 5,
              width: 152, height: 2, borderRadius: 2,
              left: "50%", marginLeft: -76,
              top: "50%", marginTop: laserY,
              backgroundColor: COLORS.accent,
              boxShadow: `0 0 10px ${COLORS.accent}, 0 0 28px rgba(0,85,255,0.5)`,
              opacity: laserOp,
            }} />
          )}

          {/* Timer QR */}
          <div style={{
            position: "absolute", bottom: 215, left: 0, right: 0, zIndex: 5,
            textAlign: "center", opacity: interpolate(frame, [255, 275], [0, 1], C),
          }}>
            <div style={{
              fontFamily: FONTS.sans, fontWeight: 900, letterSpacing: "-2px",
              fontSize: qrDone ? 72 : 52,
              color: qrDone ? COLORS.accent : "rgba(255,255,255,0.7)",
              textShadow: qrDone ? "0 0 50px rgba(0,85,255,0.6)" : "none",
              transition: "font-size 0.1s",
            }}>
              {qrTimerStr}
            </div>
          </div>

          {/* Info card alumno */}
          {frame >= 346 && (
            <div style={{
              position: "absolute", bottom: 72, left: 32, right: 32, zIndex: 6,
              opacity: cardOp, transform: `translateY(${cardY}px)`,
              backgroundColor: DARK_CARD, border: "1px solid rgba(0,85,255,0.28)",
              borderRadius: 14, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 0 28px rgba(0,85,255,0.12)",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(0,85,255,0.18)", border: "1.5px solid rgba(0,85,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                👤
              </div>
              <div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: "#fff" }}>Carlos Silva</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: BLUE_PALE, marginTop: 2 }}>ITC · A01234567</div>
              </div>
              <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, backgroundColor: "rgba(0,85,255,0.16)", border: "1px solid rgba(0,85,255,0.35)", fontFamily: FONTS.mono, fontSize: 10, color: COLORS.accent }}>
                Cemex
              </div>
            </div>
          )}

          {/* ✓ Inscrito */}
          {frame >= 388 && (
            <div style={{
              position: "absolute", top: 145, left: 0, right: 0, zIndex: 6,
              textAlign: "center", opacity: inscritoOp, transform: `scale(${inscritoScl})`,
            }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 58, fontWeight: 800, color: COLORS.accent, letterSpacing: "-1.5px", textShadow: "0 0 50px rgba(0,85,255,0.5)" }}>
                ✓ Inscrito
              </div>
            </div>
          )}
        </div>

        {/* ─── DIVISOR ─────────────────────────────── */}
        <div style={{ width: 2, height: 1080, backgroundColor: "rgba(0,85,255,0.15)", flexShrink: 0, zIndex: 10 }} />

        {/* ─── DERECHA: Sin sistema ─────────────────── */}
        <div style={{ flex: 1, height: 1080, backgroundColor: LIGHT_BG, position: "relative", overflow: "hidden" }}>

          {/* Timer manual top-right integrado en el diseño */}
          <div style={{
            position: "absolute", top: 24, right: 38, zIndex: 5,
            opacity: interpolate(frame, [216, 240], [0, 1], C),
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: BLUE_MID, opacity: 0.5 + 0.5 * Math.sin(frame / 10 * Math.PI) }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: BLUE_MID, fontWeight: 600, letterSpacing: "1px" }}>
              {paperTimerStr}
            </span>
          </div>

          {/* Label cámara-style top-left */}
          <div style={{
            position: "absolute", top: 28, left: 38, zIndex: 5,
            opacity: interpolate(frame, [216, 240], [0, 1], C),
            fontFamily: FONTS.mono, fontSize: 10,
            color: "rgba(30,58,138,0.45)", letterSpacing: "3px", textTransform: "uppercase",
          }}>
            Proceso · Manual
          </div>

          {/* VIÑETAS: zoom-in hero → settle en lista */}
          {VIÑETAS.map((v, i) => {
            if (frame < v.heroF) return null;

            // Hero: entra gigante al centro (v.heroF a v.settleF)
            const heroProgress = interpolate(frame, [v.heroF, v.settleF], [0, 1], C);
            const isHero = frame < v.settleF;

            // Posición final en la lista
            const listTop = 95 + i * 152;

            // Durante hero: centrado verticalmente, grande
            const heroTop    = 1080 / 2 - 80;
            const heroLeft   = 50;
            const heroRight  = 50;
            const heroFontSz = 22;
            const heroIconSz = 52;

            // Durante settle: pos en lista
            const settledFontSz = 15;
            const settledIconSz = 32;

            const topPos    = isHero ? heroTop    : interpolate(frame, [v.settleF, v.settleF + 18], [heroTop,    listTop],    C);
            const fontSz    = isHero ? heroFontSz : interpolate(frame, [v.settleF, v.settleF + 18], [heroFontSz, settledFontSz], C);
            const iconSz    = isHero ? heroIconSz : interpolate(frame, [v.settleF, v.settleF + 18], [heroIconSz, settledIconSz], C);
            const itemOp    = interpolate(frame, [v.heroF, v.heroF + 18], [0, 1], C);

            // Escala del icono: grande en hero
            const heroScale = isHero
              ? spring({ frame: frame - v.heroF, fps, config: { damping: 28, stiffness: 220 }, from: 0.4, to: 1 })
              : 1;

            // bg durante hero: tarjeta con sombra
            const heroBg = isHero
              ? "rgba(30,58,138,0.07)"
              : "transparent";
            const heroBorder = isHero
              ? "1px solid rgba(30,58,138,0.18)"
              : "none";
            const heroPad = isHero ? "18px 28px" : "0";
            const heroBr  = isHero ? "16px" : "0";
            const heroShadow = isHero ? "0 12px 48px rgba(30,58,138,0.12)" : "none";

            return (
              <div key={i} style={{
                position: "absolute",
                top: topPos,
                left: heroLeft, right: heroRight,
                opacity: itemOp, zIndex: isHero ? 8 : 4,
                display: "flex", alignItems: "center", gap: 16,
                backgroundColor: heroBg, border: heroBorder,
                padding: heroPad, borderRadius: heroBr,
                boxShadow: heroShadow,
                transform: `scale(${heroScale})`,
                transformOrigin: "left center",
              }}>
                <div style={{ fontSize: iconSz, flexShrink: 0, lineHeight: 1 }}>{v.icon}</div>
                <div>
                  <div style={{ fontFamily: FONTS.sans, fontSize: fontSz, fontWeight: isHero ? 700 : 500, color: BLUE_MID, lineHeight: 1.2 }}>
                    {v.title}
                  </div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: isHero ? 13 : 10, color: "rgba(30,58,138,0.45)", marginTop: isHero ? 5 : 2 }}>
                    {v.sub}
                  </div>
                </div>
              </div>
            );
          })}

          {/* "~3 min" aparece después de la última viñeta */}
          {frame >= 455 && (
            <div style={{
              position: "absolute", bottom: 155, left: 50, right: 50, zIndex: 5,
              opacity: interpolate(frame, [455, 480], [0, 1], C),
              display: "flex", alignItems: "baseline", gap: 14,
            }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 44, fontWeight: 900, color: BLUE_MID, letterSpacing: "-1.5px" }}>
                ~3 min
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: "rgba(30,58,138,0.45)" }}>
                por alumno
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          BANNER COMPARATIVO — 10 minutos
      ══════════════════════════════════════════════════ */}
      {frame >= 460 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 152, zIndex: 25,
          opacity: bannerOp, transform: `translateY(${bannerY}px)`,
          backgroundColor: "#06101F",
          borderTop: "1px solid rgba(0,85,255,0.18)",
          display: "flex", alignItems: "center",
        }}>
          {/* Lado QR */}
          <div style={{ width: 960, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: FONTS.sans, fontSize: 62, fontWeight: 900, color: COLORS.accent, letterSpacing: "-3px", lineHeight: 1 }}>
                {qrCount}
              </span>
              <span style={{ fontFamily: FONTS.sans, fontSize: 18, fontWeight: 400, color: BLUE_PALE }}>
                inscritos en 10 min
              </span>
            </div>
          </div>

          {/* Separador vertical */}
          <div style={{ width: 1, height: 80, backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {/* Lado papel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span style={{ fontFamily: FONTS.sans, fontSize: 62, fontWeight: 900, color: "rgba(147,180,224,0.38)", letterSpacing: "-3px", lineHeight: 1 }}>
                {paperCount}
              </span>
              <span style={{ fontFamily: FONTS.sans, fontSize: 18, fontWeight: 400, color: "rgba(147,180,224,0.30)" }}>
                inscritos en 10 min
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
