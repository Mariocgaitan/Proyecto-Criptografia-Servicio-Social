import { useCurrentFrame, Sequence, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, FONTS, SCENE_FRAMES } from "./constants.js";
import { Scene1Problema }    from "./scenes/Scene1Problema.jsx";
import { Scene2Estudiante }  from "./scenes/Scene2Estudiante.jsx";
import { Scene2Empresa }     from "./scenes/Scene2Empresa.jsx";
import { Scene2Admin }       from "./scenes/Scene2Admin.jsx";
import { Scene3UnderHood }   from "./scenes/Scene3UnderHood.jsx";
import { Scene4Cierre }      from "./scenes/Scene4Cierre.jsx";
import { SceneBridge }       from "./scenes/SceneBridge.jsx";
import { SceneEventoVivo }   from "./scenes/SceneEventoVivo.jsx";

const C = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLUEPRINT: Linea azul + camara cinematica
//
// Cada transicion tiene 3 fases:
//   ZO (zoom-out)  — fin de la escena saliente, camara fija, se aleja
//   TR (travel)    — inicio de la escena entrante, camara viaja de nodo a nodo
//   ZI (zoom-in)   — tras el viaje, camara se acerca al nuevo nodo
//
// La linea se DIBUJA durante la fase TR (travel), sincronizada con el viaje.
// ═══════════════════════════════════════════════════════════════════════════════

// Duracion de cada fase de transicion (en frames @ 30fps)
const ZO       = 24;    // 0.8 s — zoom-out al final de escena saliente
const TR       = 42;    // 1.4 s — viaje a escala minima entre nodos
const ZI       = 24;    // 0.8 s — zoom-in al llegar al nuevo nodo
const MIN_ZOOM = 0.38;  // escala al ver el mapa

// Easing suave para el viaje (ease-in-out cuadratico)
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Posiciones en el canvas virtual 7680x4320
const NODES = [
  { id: "S1",      x: 0,    y: 0    },   // El Problema
  { id: "SBRIDGE", x: 2200, y: 500  },   // Nace la linea
  { id: "S2A",     x: 4200, y: 0    },   // Estudiante
  { id: "S2B",     x: 5760, y: 700  },   // Empresa
  { id: "SLIVE",   x: 4100, y: 1900 },   // Evento vivo
  { id: "S2C",     x: 2100, y: 2300 },   // Admin
  { id: "S3",      x: 300,  y: 1700 },   // Confianza tecnica
  { id: "S4",      x: 1300, y: 3300 },   // Cierre
];

const nodeCenter = (n) => ({ cx: n.x + 960, cy: n.y + 540 });

const SF = SCENE_FRAMES;
const SCENE_LIST = [
  { key: "S1",      sf: SF.S1,      Comp: Scene1Problema   },
  { key: "SBRIDGE", sf: SF.SBRIDGE, Comp: SceneBridge      },
  { key: "S2A",     sf: SF.S2A,     Comp: Scene2Estudiante },
  { key: "S2B",     sf: SF.S2B,     Comp: Scene2Empresa    },
  { key: "SLIVE",   sf: SF.SLIVE,   Comp: SceneEventoVivo  },
  { key: "S2C",     sf: SF.S2C,     Comp: Scene2Admin      },
  { key: "S3",      sf: SF.S3,      Comp: Scene3UnderHood  },
  { key: "S4",      sf: SF.S4,      Comp: Scene4Cierre     },
];

// SVG path — curvas cubicas entre centros de nodos
function buildLinePath() {
  const pts = NODES.map(nodeCenter);
  let d = `M ${pts[0].cx} ${pts[0].cy}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    // Control points: el primero se queda en la altura del origen,
    // el segundo en la altura del destino
    const cp1x = p.cx + (c.cx - p.cx) * 0.5;
    const cp1y = p.cy;
    const cp2x = p.cx + (c.cx - p.cx) * 0.5;
    const cp2y = c.cy;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${c.cx} ${c.cy}`;
  }
  return d;
}
const LINE_PATH = buildLinePath();
// Longitud segura mayor que el path real (para strokeDasharray)
const APPROX_LENGTH = 20000;

// ── Calculo de estado de camara por frame ─────────────────────────────────────
// Fases por escena i (scStart, scEnd):
//
//   [scStart .. scStart+TR)      TRAVEL  — viene del nodo anterior
//   [scStart+TR .. scStart+TR+ZI) ZOOM-IN — llego al nodo, hace zoom
//   [scStart+TR+ZI .. scEnd-ZO)  BODY    — escena completa, escala 1
//   [scEnd-ZO .. scEnd)          ZOOM-OUT — se aleja antes de salir
//
// Excepcion: escena 0 (sin travel ni zoom-in) y escena N-1 (sin zoom-out)

function getCameraState(frame) {
  const N = SCENE_LIST.length;

  for (let i = 0; i < N; i++) {
    const scStart = SCENE_LIST[i].sf.from;
    const scEnd   = scStart + SCENE_LIST[i].sf.duration;

    if (frame < scStart || frame >= scEnd) continue;

    const isFirst = i === 0;
    const isLast  = i === N - 1;
    const thisC   = nodeCenter(NODES[i]);
    const prevC   = !isFirst ? nodeCenter(NODES[i - 1]) : thisC;

    // ── TRAVEL: camara se mueve de prevC a thisC a escala minima ─────────────
    if (!isFirst && frame < scStart + TR) {
      const t = interpolate(frame, [scStart, scStart + TR], [0, 1], C);
      const e = easeInOut(t);
      return {
        cx: prevC.cx + (thisC.cx - prevC.cx) * e,
        cy: prevC.cy + (thisC.cy - prevC.cy) * e,
        scale: MIN_ZOOM,
        // La linea avanza durante el travel, dibujando el segmento i-1 -> i
        lineProgress: ((i - 1) + e) / (N - 1),
      };
    }

    // ── ZOOM-IN: escala MIN_ZOOM -> 1, camara fija en thisC ──────────────────
    const ziStart = scStart + (isFirst ? 0 : TR);
    const ziEnd   = ziStart + (isFirst ? 0 : ZI);
    if (!isFirst && frame < ziEnd) {
      const t = interpolate(frame, [ziStart, ziEnd], [0, 1], C);
      return {
        cx: thisC.cx, cy: thisC.cy,
        scale: interpolate(t, [0, 1], [MIN_ZOOM, 1], C),
        lineProgress: i / (N - 1),
      };
    }

    // ── ZOOM-OUT: escala 1 -> MIN_ZOOM, camara fija en thisC ─────────────────
    if (!isLast && frame >= scEnd - ZO) {
      const t = interpolate(frame, [scEnd - ZO, scEnd], [0, 1], C);
      return {
        cx: thisC.cx, cy: thisC.cy,
        scale: interpolate(t, [0, 1], [1, MIN_ZOOM], C),
        lineProgress: i / (N - 1),
      };
    }

    // ── BODY: escena completa, escala 1 ──────────────────────────────────────
    return {
      cx: thisC.cx, cy: thisC.cy,
      scale: 1,
      lineProgress: i / (N - 1),
    };
  }

  // Fallback (ultimo frame)
  const c = nodeCenter(NODES[N - 1]);
  return { cx: c.cx, cy: c.cy, scale: 1, lineProgress: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
export const FeriaServicioSocial = () => {
  const frame = useCurrentFrame();
  const cam   = getCameraState(frame);

  // Transformacion: centrar (cam.cx, cam.cy) en (960, 540) del viewport
  const tx = 960 - cam.cx * cam.scale;
  const ty = 540 - cam.cy * cam.scale;

  // Progreso de dibujo de la linea (0 = sin dibujar, 1 = completa)
  const dashOffset = APPROX_LENGTH * (1 - cam.lineProgress);

  // Opacidad de los elementos del mapa (solo visibles en zoom-out)
  const mapOpacity = interpolate(cam.scale, [0.55, 0.80], [1, 0], C);
  const lineOpacity = interpolate(cam.scale, [0.80, 0.98], [1, 0], C);

  return (
    <div style={{
      width: 1920, height: 1080,
      backgroundColor: "#F0F2F8",
      overflow: "hidden",
      position: "relative",
      fontFamily,
    }}>

      {/* ── Canvas virtual ── */}
      <div style={{
        position: "absolute",
        width: 7680, height: 4320,
        transform: `translate(${tx}px, ${ty}px) scale(${cam.scale})`,
        transformOrigin: "0 0",
        willChange: "transform",
      }}>

        {/* Fondo del mapa: grid de puntos */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(8,8,26,0.07) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          opacity: mapOpacity,
        }} />

        {/* Gradiente de ambiente central */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(0,85,255,0.04) 0%, transparent 70%)",
          opacity: mapOpacity,
        }} />

        {/* ── SVG: linea azul + nodos ── */}
        <svg style={{
          position: "absolute", inset: 0,
          width: 7680, height: 4320,
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 50,
        }}>
          {/* Silueta del recorrido completo (punteado tenue) */}
          <path
            d={LINE_PATH}
            stroke={COLORS.ink20}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="16 32"
            opacity={mapOpacity}
          />

          {/* Linea activa dibujada — avanza con el viaje */}
          <path
            d={LINE_PATH}
            stroke={COLORS.accent}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={APPROX_LENGTH}
            strokeDashoffset={dashOffset}
            opacity={lineOpacity}
            style={{
              filter: `drop-shadow(0 0 8px ${COLORS.accentGlow}) drop-shadow(0 0 18px rgba(0,85,255,0.18))`,
            }}
          />

          {/* Nodos: circulo por cada escena */}
          {NODES.map((n, i) => {
            const c = nodeCenter(n);
            const reached = cam.lineProgress >= i / (NODES.length - 1) - 0.02;
            return (
              <g key={i} opacity={mapOpacity}>
                {/* Halo exterior */}
                <circle cx={c.cx} cy={c.cy} r={52}
                  fill={reached ? COLORS.accent : "transparent"}
                  opacity={reached ? 0.08 : 0}
                />
                {/* Circulo principal */}
                <circle cx={c.cx} cy={c.cy} r={28}
                  fill={reached ? COLORS.accent : "#F0F2F8"}
                  stroke={reached ? COLORS.accent : COLORS.ink20}
                  strokeWidth={4}
                />
                {/* Punto central */}
                <circle cx={c.cx} cy={c.cy} r={10}
                  fill={reached ? "#fff" : COLORS.ink20}
                />
              </g>
            );
          })}

          {/* Dot viajero: cabeza de la linea durante el travel */}
          {cam.scale <= MIN_ZOOM + 0.04 && (() => {
            const pts = NODES.map(nodeCenter);
            const totalSegs = pts.length - 1;
            const raw = cam.lineProgress * totalSegs;
            const si  = Math.min(Math.floor(raw), totalSegs - 1);
            const st  = raw - si;
            const px  = pts[si].cx + (pts[si + 1].cx - pts[si].cx) * st;
            const py  = pts[si].cy + (pts[si + 1].cy - pts[si].cy) * st;
            return (
              <g opacity={mapOpacity}>
                <circle cx={px} cy={py} r={44} fill={COLORS.accent} opacity={0.12} />
                <circle cx={px} cy={py} r={22} fill={COLORS.accent} />
                <circle cx={px} cy={py} r={10} fill="#fff" />
              </g>
            );
          })()}
        </svg>

        {/* Labels de nodos — solo en zoom-out */}
        {NODES.map((n, i) => {
          const c = nodeCenter(n);
          const labels = [
            "El Problema", "Solucion",  "Estudiante", "Empresa",
            "Evento vivo", "Admin",     "Confianza",  "Cierre",
          ];
          const reached = cam.lineProgress >= i / (NODES.length - 1) - 0.02;
          return (
            <div key={`lbl${i}`} style={{
              position: "absolute",
              left: c.cx - 120, top: c.cy + 60,
              width: 240, textAlign: "center",
              fontFamily: FONTS.mono, fontSize: 22,
              fontWeight: 700,
              color: reached ? COLORS.accent : COLORS.ink20,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              pointerEvents: "none",
              opacity: mapOpacity * (reached ? 1 : 0.5),
            }}>
              {labels[i]}
            </div>
          );
        })}

        {/* ── Escenas posicionadas en sus nodos ── */}
        {SCENE_LIST.map(({ key, sf, Comp }, i) => (
          <Sequence key={key} from={sf.from} durationInFrames={sf.duration}>
            <div style={{
              position: "absolute",
              left: NODES[i].x,
              top:  NODES[i].y,
              width: 1920,
              height: 1080,
              overflow: "hidden",
              // Borde redondeado y sombra solo cuando se ve como tarjeta del mapa
              borderRadius: cam.scale < 0.88 ? 20 : 0,
              boxShadow: cam.scale < 0.88
                ? `0 16px 72px rgba(0,0,0,0.28), 0 0 0 2px rgba(0,85,255,0.12)`
                : "none",
            }}>
              <Comp />
            </div>
          </Sequence>
        ))}

      </div>
    </div>
  );
};
