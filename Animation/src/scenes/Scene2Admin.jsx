import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONTS } from "../constants.js";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Cada tarjeta entra desde la derecha, se detiene, sale a la izquierda
const CARD_SEQUENCE = [
  {
    id: "preregistro",
    icon: "🔒",
    title: "Pre-registro",
    desc: "Controla exactamente cuándo los alumnos pueden inscribirse al evento",
    tag: "cerrar-preregistro",
    enterF: 22, exitF: 92,
  },
  {
    id: "evento",
    icon: "▶",
    title: "Iniciar Evento · Habilitar QR",
    desc: "Un clic activa el acceso QR para todos los participantes registrados",
    tag: "iniciar-evento",
    enterF: 80, exitF: 158,
  },
  {
    id: "proyectos",
    icon: "📁",
    title: "Gestión de Proyectos",
    desc: "Cupos, capacidades y disponibilidad de cada empresa en tiempo real",
    tag: "proyectos",
    enterF: 146, exitF: 225,
  },
  {
    id: "empresas",
    icon: "🏢",
    title: "Empresas + Carga CSV",
    desc: "Registro masivo de empresas y proyectos con un solo archivo",
    tag: "upload-csv",
    enterF: 213, exitF: 292,
  },
  {
    id: "inscripciones",
    icon: "👥",
    title: "Inscripciones en Vivo",
    desc: "Feed en tiempo real — cada escaneo aparece al instante en el panel",
    tag: "inscripciones",
    enterF: 280, exitF: 368,
  },
  {
    id: "credenciales",
    icon: "🔑",
    title: "Credenciales de Empresa",
    desc: "Gestión de usuarios y reset de contraseñas para acceso al scanner",
    tag: "credenciales",
    enterF: 356, exitF: 428,
  },
];

const CAPACITY_BARS = [
  { label: "Cemex",   used: 3, max: 5, color: COLORS.accent  },
  { label: "Femsa",   used: 1, max: 3, color: COLORS.violet  },
  { label: "OXXO",    used: 4, max: 5, color: COLORS.green   },
  { label: "Bimbo",   used: 2, max: 4, color: "#FF9900"      },
];

const COMPANIES = ["Cemex", "Femsa", "OXXO", "Bimbo", "Banorte"];

const LIVE_ROWS = [
  { name: "Carlos Silva",   code: "A01234567", empresa: "Cemex"   },
  { name: "Sofía Ramírez",  code: "A01098765", empresa: "Femsa"   },
  { name: "Diego Torres",   code: "A01182345", empresa: "Bimbo"   },
];

const CRED_USERS = [
  { name: "cemex_admin",  email: "admin@cemex.com" },
  { name: "femsa_ops",    email: "ops@femsa.com"   },
  { name: "oxxo_scanner", email: "scan@oxxo.com"   },
];

function CardVisual({ id, localF, fps }) {
  if (id === "preregistro") {
    const isOpen   = localF < 32;
    const toggleX  = isOpen ? 24 : 2;
    const toggleBg = isOpen ? COLORS.green : "rgba(255,255,255,0.18)";
    const flashOp  = interpolate(localF, [28, 38], [0, 1], { ...C, extrapolateRight: "clamp" });
    const countOp  = interpolate(localF, [35, 55], [0, 1], C);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 18, fontWeight: 600, color: COLORS.white }}>
              Estado actual
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 13, marginTop: 5, color: isOpen ? COLORS.green : "#FF6B6B" }}>
              {isOpen ? "● Abierto para inscripciones" : "● Cerrado · ventana expirada"}
            </div>
          </div>
          <div style={{
            width: 62, height: 32, borderRadius: 16, position: "relative",
            backgroundColor: toggleBg,
            boxShadow: isOpen ? `0 0 12px ${COLORS.greenGlow}` : "none",
          }}>
            <div style={{
              position: "absolute", top: 5, left: toggleX, width: 22, height: 22,
              borderRadius: "50%", backgroundColor: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </div>
        </div>
        <div style={{
          padding: "18px 22px", borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(255,255,255,${0.08 + (isOpen ? 0 : flashOp * 0.1)})`,
          opacity: countOp,
        }}>
          <div style={{ fontFamily: FONTS.sans, fontSize: 46, fontWeight: 900, color: COLORS.white, letterSpacing: "-2px", lineHeight: 1 }}>
            247
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.white30, marginTop: 6 }}>
            solicitudes de preregistro recibidas
          </div>
        </div>
      </div>
    );
  }

  if (id === "evento") {
    const btnClicked = localF >= 22;
    const btnScl     = localF >= 22 && localF < 38 ? interpolate(localF, [22, 30, 38], [1, 0.92, 1], C) : 1;
    const count      = Math.floor(interpolate(Math.min(localF, 75), [28, 75], [0, 158], C));
    const counterOp  = interpolate(localF, [28, 48], [0, 1], C);
    const dotPulse   = 0.6 + 0.4 * Math.sin(localF / 5 * Math.PI);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
        <div style={{
          width: "100%", padding: "20px 0", borderRadius: 14, textAlign: "center",
          backgroundColor: COLORS.accent, transform: `scale(${btnScl})`,
          fontFamily: FONTS.sans, fontSize: 20, fontWeight: 700, color: "#fff",
          boxShadow: `0 6px 28px ${COLORS.accentGlow}`,
        }}>
          ▶  Iniciar evento
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: counterOp }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.green,
            boxShadow: `0 0 10px ${COLORS.green}`, opacity: dotPulse,
          }} />
          <span style={{ fontFamily: FONTS.sans, fontSize: 34, fontWeight: 800, color: COLORS.white, letterSpacing: "-1px" }}>
            {count}
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.white60 }}>
            participantes habilitados
          </span>
        </div>
      </div>
    );
  }

  if (id === "proyectos") {
    const barProg = interpolate(localF, [14, 70], [0, 1], C);
    const totalOp  = interpolate(localF, [55, 74], [0, 1], C);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {CAPACITY_BARS.map((b, i) => {
          const filled = Math.min(b.used, Math.round(b.max * barProg));
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80, width: 60, flexShrink: 0 }}>
                {b.label}
              </span>
              <div style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(filled / b.max) * 100}%`, backgroundColor: b.color, borderRadius: 5 }} />
              </div>
              <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: b.color, width: 42, textAlign: "right" }}>
                {filled}/{b.max}
              </span>
            </div>
          );
        })}
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.white30, marginTop: 4, opacity: totalOp }}>
          24 proyectos activos · 5 empresas participantes
        </div>
      </div>
    );
  }

  if (id === "empresas") {
    const tagsVisible = Math.floor(interpolate(localF, [12, 60], [0, COMPANIES.length], C));
    const csvOp = interpolate(localF, [58, 78], [0, 1], C);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {COMPANIES.slice(0, tagsVisible).map((c, i) => {
            const tagOp = interpolate(localF, [12 + i * 9, 22 + i * 9], [0, 1], C);
            const tagScl = spring({ frame: localF - (12 + i * 9), fps, config: { damping: 24, stiffness: 200 }, from: 0.7, to: 1 });
            return (
              <div key={i} style={{
                padding: "6px 16px", borderRadius: 22,
                backgroundColor: "rgba(0,85,255,0.12)", border: "1px solid rgba(0,85,255,0.30)",
                fontFamily: FONTS.sans, fontSize: 14, color: COLORS.accent,
                opacity: tagOp, transform: `scale(${tagScl})`,
              }}>
                {c}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: csvOp,
          padding: "12px 16px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.18)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80 }}>Carga masiva vía CSV</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, marginTop: 2 }}>
              POST /api/v1/admin/upload-csv
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === "inscripciones") {
    const count  = Math.floor(interpolate(Math.min(localF, 65), [8, 65], [240, 247], C));
    const rowsVisible = Math.floor(interpolate(localF, [45, 72], [0, 3], C));
    const dotPulse = 0.55 + 0.45 * Math.sin(localF / 6 * Math.PI);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: FONTS.sans, fontSize: 56, fontWeight: 900, color: COLORS.white, letterSpacing: "-2px", lineHeight: 1 }}>
            {count}
          </span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.white30 }}>inscritos</span>
        </div>
        {LIVE_ROWS.slice(0, rowsVisible).map((r, i) => {
          const rowOp = interpolate(localF, [45 + i * 9, 60 + i * 9], [0, 1], C);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
              borderTop: "1px solid rgba(255,255,255,0.07)", opacity: rowOp,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.green, opacity: dotPulse, flexShrink: 0 }} />
              <span style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white80, flex: 1 }}>{r.name}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30 }}>{r.code}</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent }}>{r.empresa}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (id === "credenciales") {
    const resetHighlight = interpolate(localF, [30, 48], [0, 1], { ...C, extrapolateRight: "clamp" });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CRED_USERS.map((u, i) => {
          const rowOp = interpolate(localF, [10 + i * 10, 25 + i * 10], [0, 1], C);
          const isTarget = i === 0;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)",
              backgroundColor: "rgba(255,255,255,0.03)",
              opacity: rowOp,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                backgroundColor: `rgba(0,85,255,0.15)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>🏢</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.white }}>{u.name}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.white30, marginTop: 2 }}>{u.email}</div>
              </div>
              <div style={{
                padding: "5px 14px", borderRadius: 7, cursor: "pointer",
                backgroundColor: isTarget
                  ? `rgba(0,85,255,${0.12 + resetHighlight * 0.22})`
                  : "rgba(0,85,255,0.08)",
                border: `1px solid rgba(0,85,255,${isTarget ? 0.4 + resetHighlight * 0.5 : 0.2})`,
                fontFamily: FONTS.mono, fontSize: 12, color: COLORS.accent,
              }}>
                ↺ Reset
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export const Scene2Admin = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneIn  = interpolate(frame, [0, 22], [0, 1], C);
  const sceneOut = interpolate(frame, [422, 450], [1, 0], C);
  const labelOp  = interpolate(frame, [10, 38], [0, 1], C);

  // Puntos de paginación — cuál está más centrado en el frame actual
  const activeIdx = CARD_SEQUENCE.reduce((best, card, i) => {
    const mid = (card.enterF + card.exitF) / 2;
    const bestMid = (CARD_SEQUENCE[best].enterF + CARD_SEQUENCE[best].exitF) / 2;
    return Math.abs(frame - mid) < Math.abs(frame - bestMid) ? i : best;
  }, 0);

  return (
    <div style={{
      width: 1920, height: 1080, backgroundColor: COLORS.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      opacity: Math.min(sceneIn, sceneOut),
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `radial-gradient(circle, ${COLORS.ink} 1px, transparent 1px)`,
        backgroundSize: "56px 56px",
      }} />

      {/* Etiqueta */}
      <div style={{
        position: "absolute", top: 60, left: 80,
        fontFamily: FONTS.mono, fontSize: 13, color: COLORS.ink45,
        letterSpacing: "3px", textTransform: "uppercase", opacity: labelOp,
      }}>
        02-C · Admin
      </div>

      {/* Paginación */}
      <div style={{
        position: "absolute", top: 68, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 8, alignItems: "center",
        opacity: interpolate(frame, [22, 48], [0, 1], C),
      }}>
        {CARD_SEQUENCE.map((c, i) => (
          <div key={i} style={{
            width: i === activeIdx ? 24 : 8, height: 8, borderRadius: 4,
            backgroundColor: i === activeIdx ? COLORS.accent : COLORS.ink20,
            transition: "none",
          }} />
        ))}
      </div>

      {/* TARJETAS — una a la vez */}
      <div style={{ position: "relative", width: 920, height: 430 }}>
        {CARD_SEQUENCE.map((card) => {
          const isVisible = frame >= card.enterF && frame <= card.exitF;
          if (!isVisible) return null;
          const localF = frame - card.enterF;
          const xPos   = interpolate(frame,
            [card.enterF, card.enterF + 14, card.exitF - 14, card.exitF],
            [1400, 0, 0, -1400], C
          );
          const op = interpolate(frame,
            [card.enterF, card.enterF + 10, card.exitF - 10, card.exitF],
            [0, 1, 1, 0], C
          );
          return (
            <div key={card.id} style={{
              position: "absolute", inset: 0,
              backgroundColor: COLORS.surfaceCard,
              border: `1px solid ${COLORS.surfaceBorder}`,
              borderRadius: 22, padding: "38px 44px",
              display: "flex", gap: 44,
              transform: `translateX(${xPos}px)`,
              opacity: op,
              boxShadow: "0 10px 50px rgba(0,0,0,0.24)",
            }}>
              {/* LEFT: info */}
              <div style={{ width: 295, display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
                <div style={{ fontSize: 46 }}>{card.icon}</div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 800, color: COLORS.white, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                  {card.title}
                </div>
                <div style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.white60, lineHeight: 1.6, flex: 1 }}>
                  {card.desc}
                </div>
                <div style={{
                  padding: "6px 14px", borderRadius: 7, alignSelf: "flex-start",
                  backgroundColor: "rgba(0,85,255,0.10)", border: "1px solid rgba(0,85,255,0.25)",
                  fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accent,
                }}>
                  /{card.tag}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, backgroundColor: COLORS.surfaceBorder, flexShrink: 0 }} />

              {/* RIGHT: visual interactivo */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <CardVisual id={card.id} localF={localF} fps={fps} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
