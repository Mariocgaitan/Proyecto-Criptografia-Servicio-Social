import { FaAws }         from "react-icons/fa";
import { SiDocker }      from "react-icons/si";
import { SiReact }       from "react-icons/si";
import { SiPython }      from "react-icons/si";
import { SiPostgresql }  from "react-icons/si";
import { SiFastapi }     from "react-icons/si";
import { SiRedis }       from "react-icons/si";
import { SiNginx }       from "react-icons/si";

const LOGOS = [
  { Icon: FaAws,        label: "AWS",        x:  80,  y: 140,  size: 90 },
  { Icon: SiDocker,     label: "Docker",     x: 320,  y: 820,  size: 80 },
  { Icon: SiReact,      label: "React",      x: 1100, y:  90,  size: 80 },
  { Icon: SiPython,     label: "Python",     x: 1420, y: 820,  size: 80 },
  { Icon: SiPostgresql, label: "PostgreSQL", x: 780,  y: 880,  size: 75 },
  { Icon: SiFastapi,    label: "FastAPI",    x: 1680, y: 180,  size: 80 },
  { Icon: SiRedis,      label: "Redis",      x: 1780, y: 600,  size: 70 },
  { Icon: SiNginx,      label: "Nginx",      x:  60,  y: 700,  size: 70 },
];

export const TechLogos = () => (
  <div style={{ position: "absolute", inset: 0 }}>
    {LOGOS.map(({ Icon, label, x, y, size }) => (
      <div
        key={label}
        style={{
          position: "absolute",
          left: x,
          top:  y,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          color: "#ffffff",
        }}
      >
        <Icon size={size} />
      </div>
    ))}
  </div>
);
