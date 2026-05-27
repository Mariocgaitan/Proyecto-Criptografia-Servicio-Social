import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";
import { QRAbstractGrid } from "../components/QRAbstractGrid.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const DARK_BG = "#050D1A";

// ─────────────────────────────────────────────────────────────────────
// ESCENA A  f0   → f128  Dark — teléfono escanea QR del stand
// ESCENA B  f120 → f278  Blanco — tarjeta Google: email se escribe solo
// ESCENA C  f268 → f600  Blanco — formulario + QR generado
// ─────────────────────────────────────────────────────────────────────

const FIELDS = [
  { label: "Carrera",              value: "ITC — Ing. en Tecnologías Comp.",   startF: 292 },
  { label: "Semestre",             value: "5° Semestre",                        startF: 315 },
  { label: "Celular",              value: "5512 345 678",                        startF: 335, typed: true, endF: 365 },
  { label: "Descripción personal", value: "Dev web · interés en ciberseguridad",startF: 378, typed: true, endF: 418 },
];

const TECH_CHIPS = [
  { label: "Google OAuth", color: COLORS.accent },
  { label: "TOTP · 2FA",   color: COLORS.violet },
  { label: "AES-Fernet",   color: COLORS.green  },
];

const STEPS = [
  { label: "Escanear QR del stand", sub: "Acceso al sistema", activeF: 0,   doneF: 122 },
  { label: "Iniciar sesión",         sub: "Solo @tec.mx",     activeF: 122, doneF: 278 },
  { label: "Completar perfil",       sub: "4 campos",          activeF: 272, doneF: 455 },
  { label: "QR de acceso listo",     sub: "Regen. cada 30s",  activeF: 450, doneF: 590 },
];

export const Scene2Estudiante = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 18], [0, 1], C);
  const sceneOut = interpolate(frame, [574, 600], [1, 0], C);

  // ── Opacidades por escena ─────────────────────────────────────────
  const sceneAOp = Math.min(
    interpolate(frame, [0, 20], [0, 1], C),
    interpolate(frame, [118, 145], [1, 0], C)
  );
  const sceneBOp = Math.min(
    interpolate(frame, [120, 148], [0, 1], C),
    interpolate(frame, [260, 282], [1, 0], C)
  );
  const sceneCOp = interpolate(frame, [265, 290], [0, 1], C);

  // ═══════════════════════════════════════════════════════════════════
  // ESCENA A — Valores del escaneo
  // ═══════════════════════════════════════════════════════════════════
  const scanDone  = frame >= 112;
  const cornerClr = scanDone ? COLORS.accent : "rgba(255,255,255,0.72)";
  // Laser recorre los 320px del QR (f45 → f112)
  const laserPct = interpolate(frame, [45, 112], [0, 1], C);
  const laserOp  = frame >= 45 && frame < 112 ? 0.9 : 0;
  const scanFlash = scanDone ? interpolate(frame, [112, 134], [0.42, 0], C) : 0;
  const scanPulse = 0.4 + 0.4 * Math.sin(frame / 7 * Math.PI);
  const urlOp = frame >= 112 ? Math.min(
    interpolate(frame, [114, 128], [0, 1], C),
    interpolate(frame, [138, 152], [1, 0], C)
  ) : 0;
  // Esquinas cámara — frames
  const cornersOp = interpolate(frame, [12, 35], [0, 1], C);
  // REC blink
  const recOp = 0.5 + 0.5 * Math.sin(frame / 8 * Math.PI);

  // ═══════════════════════════════════════════════════════════════════
  // ESCENA B — Valores tarjeta Google login
  // ═══════════════════════════════════════════════════════════════════
  const cardScale = spring({ frame: frame - 120, fps, config: { damping: 32, stiffness: 200 }, from: 0.90, to: 1 });
  // "A01659057" escribe f155-212 (9 chars / 57f)
  const localChars  = Math.floor(interpolate(frame, [155, 212], [0, 9], C));
  const localStr    = "A01659057".slice(0, localChars);
  // "@tec.mx" escribe f212-252 (7 chars / 40f) — en azul
  const domainChars = frame >= 212 ? Math.floor(interpolate(frame, [212, 252], [0, 7], C)) : 0;
  const domainStr   = "@tec.mx".slice(0, domainChars);
  const showCursor  = frame >= 155 && frame < 258;
  const domainDone  = domainChars >= 7;
  const siguienteOp = interpolate(frame, [248, 262], [0, 1], C);

  // ═══════════════════════════════════════════════════════════════════
  // ESCENA C — Valores formulario + QR
  // ═══════════════════════════════════════════════════════════════════
  const stepsOp = interpolate(frame, [268, 292], [0, 1], C);

  const formOp = Math.min(
    interpolate(frame, [278, 300], [0, 1], C),
    interpolate(frame, [438, 456], [1, 0], C)
  );
  const progressW  = interpolate(frame, [278, 428], [0, 100], C);
  const saveActive = frame >= 428;
  const saveScale  = frame >= 438 && frame < 456
    ? interpolate(frame, [438, 446, 454], [1, 0.93, 1], C)
    : 1;

  const qrPhaseOp = Math.min(
    interpolate(frame, [452, 478], [0, 1], C),
    interpolate(frame, [574, 600], [1, 0], C)
  );
  const qrScale = spring({ frame: frame - 452, fps, config: { damping: 28, stiffness: 200 }, from: 0.75, to: 1 });
  const qrBlur  = interpolate(frame, [452, 476], [10, 0], C);
  const countdownVal = Math.max(0, Math.ceil(interpolate(frame, [515, 572], [30, 0], C)));
  const countdownW   = interpolate(frame, [515, 572], [100, 0], C);
  const countdownClr = frame >= 558 ? "#FF5555" : COLORS.accent;
  const regenOp = frame >= 572 ? interpolate(frame, [572, 590], [0.5, 0], C) : 0;
  const qr1Op   = frame < 572 ? 1 : 0;
  const qr2Op   = frame >= 572 ? interpolate(frame, [574, 592], [0, 1], C) : 0;

  // ═══════════════════════════════════════════════════════════════════
  // Textos narración (RIGHT) — comunes a todas las escenas
  // ═══════════════════════════════════════════════════════════════════
  const rightNarrations = [
    { lines: ["Escanea el QR",  "del stand."],   from: 8,   to: 112, large: true,  dark: true },
    { lines: ["Solo cuentas",   "@tec.mx."],      from: 128, to: 272, large: true,  dark: false, accentLine: 1 },
    { lines: ["Completa",       "tu perfil."],    from: 280, to: 448, large: true,  dark: false },
    { lines: ["Tu acceso",      "queda listo."],  from: 458, to: 545, large: true,  dark: false },
    { lines: ["Se regenera",    "cada 30s."],     from: 548, to: 580, large: false, dark: false },
  ];

  return (
    <div style={{
      width: 1920, height: 1080, position: "relative", overflow: "hidden",
      opacity: Math.min(sceneIn, sceneOut),
    }}>

      {/* ── Etiqueta escena (global) ── */}
      <div style={{
        position: "absolute", top: 55, left: 80, zIndex: 80,
        fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "3px", textTransform: "uppercase",
        color: frame < 130 ? "rgba(255,255,255,0.32)" : COLORS.ink45,
        opacity: interpolate(frame, [8, 28], [0, 1], C),
      }}>
        02-A · Estudiante
      </div>

      {/* ── Narración derecha (global, z-top) ── */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 480, height: 1080, zIndex: 70, display: "flex", alignItems: "center", pointerEvents: "none" }}>
        {rightNarrations.map((rt, i) => {
          const op = Math.min(
            interpolate(frame, [rt.from, rt.from + 22], [0, 1], C),
            interpolate(frame, [rt.to - 16, rt.to], [1, 0], C)
          );
          const yShift = interpolate(frame, [rt.from, rt.from + 22], [20, 0], C);
          return (
            <div key={i} style={{ position: "absolute", left: 0, top: rt.large ? 340 : 380, opacity: op, transform: `translateY(${yShift}px)` }}>
              {rt.lines.map((line, j) => (
                <div key={j} style={{
                  fontFamily: FONTS.sans,
                  fontSize: rt.large ? 68 : 50,
                  fontWeight: j === 0 ? 800 : 300,
                  color: rt.accentLine === j
                    ? COLORS.accent
                    : (rt.dark
                      ? (j === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)")
                      : (j === 0 ? COLORS.ink : COLORS.ink70)),
                  letterSpacing: "-2px", lineHeight: 1.15,
                }}>
                  {line}
                </div>
              ))}
            </div>
          );
        })}
        {/* Tech chips */}
        <div style={{
          position: "absolute", left: 0, bottom: 212,
          display: "flex", flexWrap: "wrap", gap: 10,
          opacity: interpolate(frame, [548, 570], [0, 1], C),
        }}>
          {TECH_CHIPS.map((ch, i) => (
            <div key={i} style={{
              padding: "5px 14px", borderRadius: 20,
              border: `1px solid ${ch.color}`, backgroundColor: `${ch.color}12`,
              fontFamily: FONTS.mono, fontSize: 11, color: ch.color,
              opacity: interpolate(frame, [548 + i * 12, 565 + i * 12], [0, 1], C),
            }}>
              {ch.label}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ESCENA A — TELÉFONO ESCANEANDO QR DEL STAND
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        backgroundColor: DARK_BG, opacity: sceneAOp,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Viñeta radial de fondo */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />

        {/* Esquinas cámara del ESCENARIO (toda la pantalla) */}
        <div style={{ position: "absolute", inset: 55, zIndex: 5, opacity: cornersOp }}>
          {[
            { top: 0, left: 0, rot: 0 }, { top: 0, right: 0, rot: 90 },
            { bottom: 0, left: 0, rot: 270 }, { bottom: 0, right: 0, rot: 180 },
          ].map((p, i) => (
            <div key={i} style={{ position: "absolute", top: p.top, left: p.left, bottom: p.bottom, right: p.right }}>
              <svg width="52" height="52" style={{ transform: `rotate(${p.rot}deg)`, display: "block" }}>
                <line x1="0" y1="2" x2="52" y2="2" stroke={cornerClr} strokeWidth="4" strokeLinecap="round" />
                <line x1="2" y1="0" x2="2" y2="52" stroke={cornerClr} strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          ))}
        </div>

        {/* REC */}
        <div style={{ position: "absolute", top: 26, right: 80, zIndex: 6, display: "flex", alignItems: "center", gap: 7, opacity: cornersOp }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3333", opacity: recOp }} />
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.42)" }}>REC 9:03</span>
        </div>

        {/* Contenido central: QR + Teléfono en línea */}
        <div style={{ display: "flex", alignItems: "center", gap: 80 }}>

          {/* ── QR POSTER DEL STAND ── */}
          <div style={{ position: "relative", flexShrink: 0, opacity: interpolate(frame, [5, 28], [0, 1], C) }}>
            <div style={{
              padding: 28, borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.96)",
              boxShadow: scanDone
                ? `0 0 70px rgba(0,85,255,0.45), 0 0 120px rgba(0,85,255,0.18)`
                : "0 0 50px rgba(0,0,0,0.5)",
              position: "relative", overflow: "hidden",
            }}>
              <QRAbstractGrid size={320} startFrame={5} buildDuration={40} cellColor={COLORS.ink} />

              {/* Laser sobre el QR (posicionado relativamente al card) */}
              {laserOp > 0 && (
                <div style={{
                  position: "absolute", zIndex: 4,
                  left: 28, right: 28, height: 2, borderRadius: 1,
                  top: 28 + laserPct * 320,
                  backgroundColor: COLORS.accent,
                  boxShadow: `0 0 14px ${COLORS.accent}, 0 0 36px rgba(0,85,255,0.65)`,
                }} />
              )}

              {/* Overlay ✓ al reconocer */}
              {scanDone && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 22, zIndex: 5,
                  backgroundColor: "rgba(0,85,255,0.07)",
                  border: "3px solid rgba(0,85,255,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: interpolate(frame, [112, 128], [0, 1], C),
                }}>
                  <div style={{
                    fontFamily: FONTS.sans, fontSize: 100, fontWeight: 900,
                    color: COLORS.accent, textShadow: "0 0 50px rgba(0,85,255,0.55)",
                  }}>
                    ✓
                  </div>
                </div>
              )}
            </div>

            {/* Labels bajo el QR */}
            <div style={{ textAlign: "center", marginTop: 16, opacity: cornersOp }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>
                Feria Servicio Social
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, letterSpacing: "1.5px" }}>
                Escanea para registrarte
              </div>
            </div>
          </div>

          {/* ── TELÉFONO CON CÁMARA ── */}
          <div style={{ flexShrink: 0, opacity: interpolate(frame, [10, 32], [0, 1], C) }}>
            <div style={{
              width: 265, height: 510, borderRadius: 34,
              backgroundColor: "#09162A",
              border: "1.5px solid rgba(255,255,255,0.10)",
              boxShadow: `0 0 90px ${scanDone ? "rgba(0,85,255,0.42)" : "rgba(0,85,255,0.18)"}`,
              overflow: "hidden", position: "relative",
            }}>
              {/* Status bar */}
              <div style={{
                height: 30, display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingInline: 16, flexShrink: 0,
              }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>9:03</span>
                <div style={{ width: 42, height: 8, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>●●●</span>
              </div>

              {/* Cámara view */}
              <div style={{
                position: "absolute", top: 30, bottom: 0, left: 0, right: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}>
                {/* Flash */}
                <div style={{ position: "absolute", inset: 0, backgroundColor: COLORS.accent, opacity: scanFlash, zIndex: 8 }} />
                {/* Viñeta */}
                <div style={{ position: "absolute", inset: 0, zIndex: 2, background: "radial-gradient(ellipse at center, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.68) 100%)" }} />
                {/* QR en cámara */}
                <div style={{ zIndex: 1, opacity: scanDone ? 0.92 : 0.52 }}>
                  <QRAbstractGrid size={108} startFrame={18} buildDuration={30} cellColor={COLORS.white} />
                </div>
                {/* Reticule corners en la cámara */}
                <div style={{ position: "absolute", inset: 12, zIndex: 3 }}>
                  {[
                    { top: 0, left: 0, rot: 0 }, { top: 0, right: 0, rot: 90 },
                    { bottom: 0, left: 0, rot: 270 }, { bottom: 0, right: 0, rot: 180 },
                  ].map((p, i) => (
                    <div key={i} style={{ position: "absolute", top: p.top, left: p.left, bottom: p.bottom, right: p.right }}>
                      <svg width="22" height="22" style={{ transform: `rotate(${p.rot}deg)`, display: "block" }}>
                        <line x1="0" y1="2" x2="22" y2="2" stroke={cornerClr} strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="2" y1="0" x2="2" y2="22" stroke={cornerClr} strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  ))}
                </div>
                {/* Laser en cámara (sincronizado con el del QR) */}
                {laserOp > 0 && (
                  <div style={{
                    position: "absolute", zIndex: 4,
                    width: 108, height: 1.5, borderRadius: 1,
                    left: "50%", marginLeft: -54,
                    top: 30 + laserPct * (510 - 30 - 2 * 12) + 12,
                    backgroundColor: COLORS.accent,
                    boxShadow: `0 0 8px ${COLORS.accent}, 0 0 20px rgba(0,85,255,0.5)`,
                  }} />
                )}
                {/* Glow area while scanning */}
                {!scanDone && laserOp > 0 && (
                  <div style={{
                    position: "absolute", zIndex: 3,
                    width: 108, height: 108,
                    left: "50%", marginLeft: -54, top: "50%", marginTop: -54,
                    border: `1px solid rgba(0,85,255,${0.12 + 0.22 * scanPulse})`,
                    borderRadius: 5,
                    boxShadow: `inset 0 0 16px rgba(0,85,255,${0.06 + 0.10 * scanPulse})`,
                  }} />
                )}
                {/* Status en cámara */}
                <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, zIndex: 5, textAlign: "center" }}>
                  {!scanDone ? (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 8, color: `rgba(255,255,255,${scanPulse})`, letterSpacing: "2.5px" }}>
                      ESCANEANDO...
                    </span>
                  ) : (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.accent, letterSpacing: "2.5px", opacity: interpolate(frame, [112, 125], [0, 1], C) }}>
                      ✓ ACCESO VÁLIDO
                    </span>
                  )}
                </div>
                {/* URL bar */}
                <div style={{
                  position: "absolute", top: 10, left: 10, right: 10, zIndex: 5,
                  opacity: urlOp, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 7,
                  padding: "4px 9px", display: "flex", alignItems: "center", gap: 5,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.green, flexShrink: 0 }} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: "rgba(255,255,255,0.82)" }}>fss.tec.mx</span>
                </div>
              </div>
            </div>

            {/* Label bajo el tel */}
            <div style={{ textAlign: "center", marginTop: 16, opacity: cornersOp }}>
              <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.72)" }}>Carlos Silva</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 4, letterSpacing: "1px" }}>ITC · A01659057</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ESCENA B — TARJETA GOOGLE: EMAIL SE ESCRIBE SOLO
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 20,
        backgroundColor: COLORS.bg, opacity: sceneBOp, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.035,
          backgroundImage: `radial-gradient(circle, ${COLORS.ink} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }} />

        {/* Tarjeta Google Sign-In */}
        <div style={{
          width: 560, padding: "48px 52px",
          backgroundColor: "#fff",
          border: `1px solid ${COLORS.ink08}`,
          borderRadius: 24,
          boxShadow: "0 8px 72px rgba(8,8,26,0.09)",
          transform: `scale(${cardScale})`,
          marginRight: 120,
        }}>
          {/* Google logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 400, color: "#444" }}>Google</span>
          </div>

          <div style={{ fontFamily: FONTS.sans, fontSize: 30, fontWeight: 600, color: COLORS.ink, marginBottom: 6 }}>
            Acceder
          </div>
          <div style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink45, marginBottom: 30 }}>
            Continúa en Feria Servicio Social
          </div>

          {/* Campo email con escritura animada */}
          <div style={{
            border: `2px solid ${domainChars > 0 ? COLORS.accent : (localChars > 0 ? COLORS.ink20 : "#ddd")}`,
            borderRadius: 8, padding: "14px 16px", marginBottom: 16,
            backgroundColor: domainChars > 0 ? COLORS.accentDim : "#fff",
          }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.ink45, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 5 }}>
              Correo electrónico
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 20, letterSpacing: "-0.5px", minHeight: 28 }}>
              <span style={{ color: COLORS.ink }}>{localStr}</span>
              <span style={{ color: COLORS.accent, fontWeight: domainDone ? 700 : 400 }}>{domainStr}</span>
              {showCursor && (
                <span style={{
                  color: COLORS.ink, fontWeight: 300,
                  opacity: Math.sin(frame / 4 * Math.PI) > 0 ? 1 : 0,
                }}>|</span>
              )}
            </div>
          </div>

          {/* Botón Siguiente */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 8,
            backgroundColor: domainDone ? COLORS.accent : COLORS.ink08,
            opacity: siguienteOp,
          }}>
            <span style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: domainDone ? "#fff" : COLORS.ink45 }}>
              Siguiente
            </span>
            <span style={{ color: domainDone ? "#fff" : COLORS.ink45, fontSize: 16 }}>→</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ESCENA C — FORMULARIO + QR
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 15,
        backgroundColor: COLORS.bg, opacity: sceneCOp,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
          backgroundImage: `radial-gradient(circle, ${COLORS.ink} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 80 }}>

          {/* STEPS panel */}
          <div style={{ width: 252, height: 420, position: "relative", flexShrink: 0, opacity: stepsOp }}>
            {STEPS.map((s, i) => {
              const isDone   = frame >= s.doneF;
              const isActive = frame >= s.activeF && frame < s.doneF;
              const dotClr   = isDone ? COLORS.green : isActive ? COLORS.accent : COLORS.ink20;
              const lblOp    = interpolate(frame, [s.activeF, s.activeF + 20], [0.3, 1], C);
              const dotScl   = spring({ frame: frame - s.activeF, fps, config: { damping: 26, stiffness: 210 }, from: 0.7, to: 1 });
              return (
                <div key={i} style={{ position: "absolute", top: 14 + i * 96, left: 0, display: "flex", alignItems: "flex-start", gap: 16, opacity: lblOp }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: isDone ? COLORS.green : isActive ? COLORS.accent : COLORS.ink08,
                      border: `2px solid ${dotClr}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transform: `scale(${isActive ? dotScl : 1})`,
                      boxShadow: isActive ? `0 0 14px ${COLORS.accentGlow}` : isDone ? `0 0 10px ${COLORS.greenGlow}` : "none",
                    }}>
                      {isDone
                        ? <span style={{ fontSize: 15, color: "#fff" }}>✓</span>
                        : <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? "#fff" : COLORS.ink45 }}>{i + 1}</span>
                      }
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ width: 2, height: 62, borderRadius: 1, marginTop: 4, backgroundColor: isDone ? COLORS.green : COLORS.ink08 }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 5 }}>
                    <div style={{ fontFamily: FONTS.sans, fontSize: 14, fontWeight: 700, color: isDone ? COLORS.green : isActive ? COLORS.ink : COLORS.ink45, lineHeight: 1.2 }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.ink45, marginTop: 3 }}>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PHONE */}
          <div>
            <div style={{
              width: 285, height: 545, borderRadius: 34,
              backgroundColor: COLORS.surface,
              border: "1.5px solid rgba(255,255,255,0.10)",
              boxShadow: `0 0 90px ${frame >= 452 ? COLORS.accentGlow : "rgba(0,85,255,0.18)"}`,
              overflow: "hidden", position: "relative",
            }}>
              <div style={{ height: 32, display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 18 }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.white60 }}>9:03</span>
                <div style={{ width: 50, height: 9, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" }} />
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.white60 }}>●●●</span>
              </div>

              {/* FORM */}
              <div style={{ position: "absolute", top: 32, bottom: 0, left: 0, right: 0, opacity: formOp, padding: "8px 20px", display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ fontFamily: FONTS.sans, fontSize: 13, fontWeight: 700, color: COLORS.white, marginBottom: 2 }}>Completa tu perfil</div>
                <div style={{ height: 3, borderRadius: 2, backgroundColor: COLORS.white10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressW}%`, backgroundColor: COLORS.accent, borderRadius: 2 }} />
                </div>
                {FIELDS.map((f, i) => {
                  const appeared = frame >= f.startF;
                  const fieldOp  = interpolate(frame, [f.startF, f.startF + 14], [0, 1], C);
                  let displayVal = f.value;
                  if (f.typed && f.endF) {
                    const chars = Math.floor(interpolate(frame, [f.startF, f.endF], [0, f.value.length], C));
                    displayVal = f.value.slice(0, chars) + (chars < f.value.length ? "|" : "");
                  }
                  return (
                    <div key={i} style={{ opacity: appeared ? fieldOp : 0, flexShrink: 0 }}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.white60, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                      <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "5px 8px", fontFamily: FONTS.sans, fontSize: 11, color: COLORS.white, minHeight: 26 }}>
                        {displayVal}
                      </div>
                    </div>
                  );
                })}
                <div style={{
                  marginTop: 4, padding: "8px 0", borderRadius: 8, textAlign: "center",
                  fontFamily: FONTS.sans, fontSize: 12, fontWeight: 700,
                  backgroundColor: saveActive ? COLORS.accent : "rgba(255,255,255,0.08)",
                  color: saveActive ? "#fff" : COLORS.white30,
                  transform: `scale(${saveScale})`,
                  opacity: Math.min(interpolate(frame, [418, 432], [0, 1], C), 1),
                }}>
                  Guardar →
                </div>
              </div>

              {/* QR */}
              <div style={{ position: "absolute", top: 32, bottom: 0, left: 0, right: 0, opacity: qrPhaseOp, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9 }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, fontWeight: 600, color: COLORS.white60, letterSpacing: "2px", textTransform: "uppercase" }}>Mi QR de acceso</div>
                <div style={{ position: "relative", transform: `scale(${qrScale})`, filter: `blur(${qrBlur}px)` }}>
                  {regenOp > 0 && <div style={{ position: "absolute", inset: 0, borderRadius: 8, zIndex: 10, backgroundColor: COLORS.accent, opacity: regenOp * 0.7 }} />}
                  <div style={{ opacity: qr1Op, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QRAbstractGrid size={138} startFrame={452} buildDuration={40} cellColor={COLORS.white} />
                  </div>
                  <div style={{ opacity: qr2Op }}>
                    <QRAbstractGrid size={138} startFrame={572} buildDuration={18} cellColor={COLORS.white} />
                  </div>
                </div>
                <div style={{ width: "80%", marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.white60 }}>Expira en</span>
                    <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: countdownClr, fontWeight: 700 }}>{countdownVal}s</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, backgroundColor: COLORS.white10 }}>
                    <div style={{ height: "100%", width: `${countdownW}%`, backgroundColor: countdownClr, borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.white30, textAlign: "center" }}>A01659057 · Carlos Silva</div>
              </div>
            </div>
          </div>

          {/* Spacer para texto narración (viene del panel global) */}
          <div style={{ width: 440 }} />
        </div>
      </div>

    </div>
  );
};
