# Estrategia de Implementación — Motion Graphic "Feria Servicio Social"

## 1. Setup del Proyecto

### Ubicación
`Animation/` como proyecto Remotion **autónomo** con su propio `package.json`.
No comparte dependencias con el frontend.

### Dependencias clave
```json
{
  "remotion": "^4.0",
  "@remotion/cli": "^4.0",
  "@remotion/google-fonts": "^4.0",
  "react": "^18.3",
  "react-dom": "^18.3",
  "lucide-react": "latest",
  "react-icons": "latest"
}
```

### Scripts
```json
"studio": "remotion studio",
"render": "remotion render FeriaServicioSocial out/feria.mp4"
```

---

## 2. Configuración Técnica

| Parámetro       | Valor                     |
|-----------------|---------------------------|
| Duración        | 2700 frames               |
| FPS             | 30                        |
| Resolución      | 1920 × 1080               |
| Fondo base      | `#020617` (slate-950)     |
| Acento          | `#3b82f6` (blue-500)      |
| Font sans       | Inter (via `@remotion/google-fonts`) |
| Font mono       | JetBrains Mono (via `@remotion/google-fonts`) |
| Estilos         | Inline styles + CSS variables (sin Tailwind) |

### Reglas de animación
- **Siempre** `interpolate(frame, [...], [...], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`
- **Ningún elemento** debe estar 100% estático — usar breathing scale `1.0 → 1.02`
- **Springs** para entradas de elementos: `spring({ frame, fps, config: { damping: 14, stiffness: 120 } })`

---

## 3. Arquitectura de Archivos

```
Animation/
├── package.json
├── remotion.config.js
├── public/
│   └── voiceover.mp3          ← audio TTS (ver sección 6)
└── src/
    ├── index.jsx               ← registerRoot
    ├── Root.jsx                ← Composition principal (2700f)
    ├── constants.js            ← colores, tipografías, duraciones de escenas
    ├── scenes/
    │   ├── Scene1Problema.jsx       (f 0    – 450,   15s)
    │   ├── Scene2Estudiante.jsx     (f 450  – 900,   15s)
    │   ├── Scene2Empresa.jsx        (f 900  – 1350,  15s)
    │   ├── Scene2Admin.jsx          (f 1350 – 1800,  15s)
    │   ├── Scene3UnderHood.jsx      (f 1800 – 2400,  20s)
    │   └── Scene4Cierre.jsx         (f 2400 – 2700,  10s)
    └── components/
        ├── QRAbstractGrid.jsx       ← cuadrícula de píxeles que se construye frame a frame
        ├── AnimatedBars.jsx         ← barras del dashboard con spring staggered
        ├── TerminalTyper.jsx        ← texto que "tipea" carácter por carácter
        ├── CameraReticle.jsx        ← reticle de cámara animado (Escena 2b)
        ├── TechLogos.jsx            ← logos react-icons (AWS, Docker, etc.) + líneas
        └── GlassCard.jsx            ← contenedor glassmorphism reutilizable
```

---

## 4. Desglose de Escenas

### Escena 1 — El Problema (f 0–450, 15s)

**Concepto:** Pantalla negra minimalista. Texto enorme + zoom lento.

| Frames  | Acción |
|---------|--------|
| 0–60    | "El caos del papel..." fade-in + zoom in (scale 0.95 → 1.0) |
| 60–240  | Texto hold. Breathing scale sutil 1.0 → 1.02 |
| 240–330 | Fade out de "El caos..." |
| 330–450 | "Reimaginado." aparece con spring scale (0.8 → 1.0) + fade-in azul |

---

### Escena 2a — Estudiante (f 450–900, 15s)

**Concepto:** Glassmorphism card. Candado se desbloquea. QR pixel grid se construye.

| Frames      | Acción |
|-------------|--------|
| 450–480     | Slide-in de GlassCard desde abajo (y: 40 → 0) |
| 480–570     | Lock icon: escala + rotación (cerrado → abierto), color gris → azul |
| 570–750     | QRAbstractGrid: celdas aparecen en orden aleatorio determinístico |
| 750–870     | Label "QR · Cifrado · 30s" fade-in con spring |
| 870–900     | Transición: fade-out ligero para dar paso a Escena 2b |

---

### Escena 2b — Empresa (f 900–1350, 15s)

**Concepto:** Swipe desde la derecha. Reticle de cámara. Checkmark de confirmación.

| Frames      | Acción |
|-------------|--------|
| 900–960     | Swipe-in: escena desliza desde x: +200 → 0 |
| 960–1050    | CameraReticle: 4 esquinas se animan hacia el centro |
| 1050–1200   | QRAbstractGrid en el centro del reticle |
| 1200–1290   | CheckCircle (lucide-react) scale spring 0 → 1, color `#22c55e` (green) |
| 1290–1350   | "Inscripción confirmada" texto fade-in. Fade-out de escena. |

---

### Escena 2c — Admin (f 1350–1800, 15s)

**Concepto:** Dashboard minimalista. 3 barras de datos suben con spring staggered.

| Frames      | Acción |
|-------------|--------|
| 1350–1410   | Header "Dashboard en tiempo real" slide-in desde arriba |
| 1410–1560   | AnimatedBars: 3 columnas suben con spring (delay 0, 8, 16 frames cada una) |
| 1560–1680   | Counters numéricos cuentan de 0 al valor máximo via interpolate |
| 1680–1800   | Breathing scale sutil. Labels de datos aparecen. |

---

### Escena 3 — Under the Hood (f 1800–2400, 20s)

**Concepto:** Terminal oscuro. Pipeline de cifrado del QR. Logos tech al fondo.

| Frames      | Acción |
|-------------|--------|
| 1800–1860   | Fade a fondo terminal (`#0a0a0a`). Cursor parpadeante aparece. |
| 1860–2010   | TerminalTyper: escribe el JSON payload carácter a carácter |
| 2010–2100   | Flecha animada (`→`) aparece. Texto `Fernet.encrypt()` con highlight azul. |
| 2100–2220   | String encriptado aparece (Base64 truncado) con efecto glitch sutil |
| 2220–2400   | TechLogos: AWS, Docker, React, Python, Postgres aparecen como watermarks con líneas pulsantes. QR final aparece a la derecha. |

---

### Escena 4 — Cierre Heroico (f 2400–2700, 10s)

**Concepto:** Todo se apaga. Solo queda el branding.

| Frames      | Acción |
|-------------|--------|
| 2400–2460   | Fade to black desde Escena 3 |
| 2460–2550   | "Feria Servicio Social" aparece con glow azul (`#3b82f6` text-shadow) |
| 2550–2610   | "Tecnológico de Monterrey" en font-mono debajo, fade-in suave |
| 2610–2670   | "Seguridad y escala en producción." fade-in gris claro |
| 2670–2700   | Breathing 1.0 → 1.02 → fade out total a negro puro |

---

## 5. Componentes Clave — Lógica

### `QRAbstractGrid.jsx`
- Grid de 21×21 = 441 celdas (mismo que QR versión 1)
- Cada celda tiene un índice. Se usa `Math.sin(index)` para orden pseudoaleatorio pero **determinístico**
- `cell_appears_at_frame = base_frame + (shuffledIndex / totalCells) * buildDuration`
- Celda visible si `frame >= cell_appears_at_frame`

### `TerminalTyper.jsx`
- Recibe `text` (string) y `startFrame`
- `charsToShow = Math.floor(interpolate(frame, [startFrame, startFrame + duration], [0, text.length], {clamp}))`
- Renderiza `text.substring(0, charsToShow)` en font-mono

### `AnimatedBars.jsx`
- Recibe array de `{ label, value, maxValue, delay }`
- Altura de cada barra: `spring({ frame: frame - delay, fps })` * `maxHeight`
- Valor del counter: `interpolate(frame - delay, [0, duration], [0, value], {clamp})`

### `CameraReticle.jsx`
- 4 esquinas de `border` con `width` y `height` animados via interpolate
- Parte de ancho completo → colapsan al centro progresivamente

---

## 6. Audio / Voz — Opciones

Remotion soporta audio nativo via `<Audio src={staticFile("voiceover.mp3")} />`.

### Opción A — ElevenLabs (Recomendada)
- Genera TTS con voz natural en español en [elevenlabs.io](https://elevenlabs.io)
- Plan gratuito: ~10,000 caracteres/mes
- Descarga el `.mp3` → pega en `Animation/public/voiceover.mp3`
- Remotion lo sincroniza automáticamente con la línea: `<Audio src={staticFile("voiceover.mp3")} />`

### Opción B — Google TTS / Azure TTS
- APIs gratuitas con voz neural
- Misma integración con `staticFile()`

### Opción C — Sin voz (solo música de fondo)
- Buscar track libre de derechos en [pixabay.com/music](https://pixabay.com/music) (ambient/tech)
- `<Audio src={staticFile("background.mp3")} volume={0.4} />`

### Script sugerido para la voz (90s, ~220 palabras)
```
[0:00] El proceso de registro en la Feria de Servicio Social era caótico, lento, y dependía del papel.

[0:08] Lo reimaginamos desde cero.

[0:15] El alumno inicia sesión con autenticación de dos factores. 
El sistema genera un código QR dinámico, cifrado con Fernet, 
que cambia cada treinta segundos. Imposible de falsificar.

[0:30] En el stand de la empresa, el representante abre la app 
y apunta la cámara al QR. El sistema descifra, verifica el código 
de tiempo, y confirma la inscripción al instante.

[0:45] El administrador monitorea todo desde un dashboard en tiempo real: 
inscripciones, estadísticas por carrera, y reportes exportables.

[1:00] Por dentro, el payload viaja cifrado con AES-128-CBC y HMAC-SHA256. 
Cada QR lleva un código TOTP embebido que lo hace único por ventana de tiempo. 
Todo corre sobre una arquitectura cloud: FastAPI, PostgreSQL, Redis, Docker y AWS.

[1:20] Feria Servicio Social. Tecnológico de Monterrey.
Seguridad y escala en producción.
```

### Flujo de trabajo con audio
1. Generar el audio TTS con el script anterior
2. Verificar duración exacta (ajustar frames si difiere de 90s)
3. Colocar en `Animation/public/voiceover.mp3`
4. En `Root.jsx` agregar: `<Audio src={staticFile("voiceover.mp3")} />`
5. Usar `useAudioData()` de `@remotion/media-utils` si necesitas visualizar el audio

---

## 7. Flujo de Render

```bash
# 1. Instalar dependencias
cd Animation && npm install

# 2. Preview en Remotion Studio (http://localhost:3000)
npm run studio

# 3. Render final a MP4 (tarda ~2-5 min)
npm run render
# Output: Animation/out/feria.mp4
```

### Calidad de render recomendada
En `remotion.config.js`:
```js
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setConcurrency(4); // ajustar según CPU
```

---

## 8. Orden de Implementación

1. `package.json` + `remotion.config.js` + `src/index.jsx` + `src/Root.jsx` (skeleton)
2. `src/constants.js` (colores, duraciones, tipografías)
3. Componentes base: `QRAbstractGrid`, `TerminalTyper`, `AnimatedBars`, `CameraReticle`, `GlassCard`
4. Escenas en orden: 1 → 2a → 2b → 2c → 3 → 4
5. Ajuste de timing + breathing effects
6. Integrar audio (opcional, al final)
7. Render final
