# Análisis del video — Percepción actual

> Estado al 24 May 2026. Documento previo a rediseño.

---

## Estructura general

| # | Escena | Duración | Frames |
|---|--------|----------|--------|
| 1 | Problema — "El caos del papel" | 15 s | 0–450 |
| 2A | Rol Estudiante | 15 s | 450–900 |
| 2B | Rol Empresa | 15 s | 900–1350 |
| 2C | Rol Admin / Dashboard | 15 s | 1350–1800 |
| 3 | Bajo el capó (criptografía) | 20 s | 1800–2400 |
| 4 | Cierre / Hero | 10 s | 2400–2700 |

**Total: 90 segundos. Fondo base siempre `#020617` (azul-negro).**

---

## Descripción escena a escena

### Escena 1 — "El caos del papel"
- Fondo oscuro con `ParticleField` (partículas flotantes, muy sutiles).
- El texto **"El caos del papel"** cae desde arriba con spring (overshoot), tamaño 96px, color `white60` — *un gris apagado*.
- Subtítulo `REGISTROS · LISTAS · PAPEL` en monospace pequeño.
- Esos textos se desvanecen a mitad de la escena.
- Una línea blanca horizontal cruza la pantalla (light sweep).
- Aparece **"Reimaginado."** en 152px blanco con zoom-out Apple (scale 2.2 → 1).
- Una línea azul crece debajo. Glow radial azul muy suave.

**Percepción**: Párrafo de apertura dramático pero abstracto. El problema que se supone está narrando ("el caos del papel") no se *muestra* — solo se *nombra*. El fondo de partículas es casi invisible. La paleta es gris apagado → blanco; no hay color hasta que aparece el acento azul.

---

### Escena 2A — Estudiante
- `ParticleField` de fondo.
- Una tarjeta (`GlassCard`) entra con inclinación 3D `rotateY(-32° → 0°)` + spring Y.
- Dentro de la tarjeta:
  - Título **"Autenticación Multi-Factor"** en 22px.
  - Ícono `Lock` (88px, gris) → cambia a `Unlock` (88px, azul con glow) en frame 75.
  - Al desbloquear: 3 anillos azules se expanden desde el centro.
  - Rejilla QR abstracta (`QRAbstractGrid`) se construye celda por celda.
  - Barra de progreso TOTP (azul, se va vaciando).
  - 3 chips: **Google OAuth / AES-128-CBC / TOTP · 30s** aparecen con stagger.

**Percepción**: La tarjeta con 3D tilt es el único elemento con profundidad espacial real en todo el video. Lo demás es plano. El cambio Lock→Unlock es el momento más claro en términos narrativos, pero la tarjeta es pequeña (560px en 1920×1080). Mucho espacio negro vacío alrededor.

---

### Escena 2B — Empresa
- Un rectículo de cámara (`CameraReticle`, 380px) en centro.
- Título **"Escaneo de código QR"** en 32px arriba.
- Rejilla QR dentro del rectículo.
- En frame 200: flash verde en toda la pantalla (sutil, ~22% opacidad).
- En frame 225: `CheckCircle` (100px verde con glow) con spring bounce, sobre fondo verde muy translúcido.
- 2 anillos verdes se expanden.
- Sube texto: **"Inscripción confirmada"** + subtítulo en monospace.

**Percepción**: Narrativamente la más clara del video — la acción (escanear → confirmar) se entiende. Pero el rectículo está solo en el centro, sin contexto visual. El QR es abstracto (rectángulos, no un QR real).

---

### Escena 2C — Admin / Dashboard
- Fondo: cuadrícula de puntos a 2.5% opacidad (prácticamente invisible).
- Header **"Dashboard en tiempo real"** en 48px, entra desde arriba con blur.
- Top-left: `03 — ADMIN`. Top-right: punto verde pulsante + `LIVE`.
- 3 tarjetas KPI con contador animado:
  - **Inscripciones: 247** (azul)
  - **Empresas: 18** (púrpura)
  - **Ocupacion: 89%** (verde)
- Barras verticales (`AnimatedBars`) con 5 carreras (ITC, IIS, IMT, LAF, LDI).

**Percepción**: Es la escena más "plana" visualmente. Parece un dashboard de SaaS, no una pieza cinematográfica. Los números grandes se ven bien por el `textShadow` con glow, pero el layout (header + 3 cards + barras) es muy estático. El dot-grid de fondo es invisible.

---

### Escena 3 — Bajo el capó
- `MatrixRain` de fondo (22 columnas de caracteres hex, cabeza blanca / cola verde).
- Vignette oscuro cubre el 88% de la pantalla.
- Una ventana de terminal (920px, estilo macOS dark) sube con blur.
- Título de pestaña: **`feria_crypto.py — bash`**.
- Semáforo macOS (rojo/amarillo/verde) con glow.
- Prompt `❯ python feria_crypto.py`.
- `TerminalTyper` escribe el JSON payload (matricula, totp, id_evento).
- Flecha ↓ + `encrypt_qr_payload(payload)` + comentario `# AES-128-CBC + HMAC-SHA256 + TOTP`.
- `>>> ` + cadena encriptada larga (`gAAAAABl2X9p...`) con glow azul creciente.

**Percepción**: La Matrix Rain es el cliché más común para "hacking" y puede sentirse kitsch para una feria universitaria. La terminal es el elemento más detallado del video pero ocupa solo ~48% del ancho en pantalla. Los textos son pequeños (17px) en 1080p. La cadena encriptada es larga y abstracta — el espectador no sabe qué significa.

---

### Escena 4 — Cierre
- Fondo negro puro (`#000000`, a diferencia del resto que es `#020617`).
- `ParticleField` muy suave (28% opacidad).
- 3 anillos azules se expanden desde el centro (igual que en Escenas 2A y 2B).
- Glow radial azul pulsante.
- **"Feria Servicio Social"** en 104px, zoom-out Apple (scale 2.0 → 1), texto con gradiente `#fff → #e0e7ff → #3b82f6`.
- Línea divisora azul crece.
- **"Tecnologico de Monterrey"** en monospace, letter-spacing 8px.
- **"Seguridad y escala en produccion."**

**Percepción**: El gradiente en el título es el toque más "premium" del video. La escena dura solo 10 segundos y tiene fade-out en frame 255 (8.5s) — muy poco tiempo para leer todo. Los bloom rings ya aparecieron en escenas anteriores; para el cierre no sorprenden.

---

## Diagnóstico honesto

### 1. El video no cuenta una historia visual — solo describe

Las escenas son ilustraciones de texto, no narrativa visual. Apple/Samsung no muestran tarjetas con texto de características: muestran el *efecto* del producto en la vida del usuario. Aquí el usuario ve palabras como "Autenticación Multi-Factor" o "AES-128-CBC" que no significan nada visualmente.

### 2. La paleta es uniforme y apagada

Todo el video es `#020617` + azul + blanco translúcido. No hay variación de temperatura de color, no hay contraste entre escenas. El espectador no siente que avanza por secciones distintas.

### 3. Los bloom rings se repiten 3 veces (Escenas 2A, 2B y 4)

El mismo motivo visual (anillos expansivos desde el centro) aparece en tres momentos distintos sin variación. Pierde impacto con cada repetición.

### 4. Mucho espacio vacío

En escenas 2A, 2B, 2C y 4, el contenido ocupa un área pequeña (560px de tarjeta en 1920px de ancho). Las esquinas del canvas están siempre vacías.

### 5. La transición entre escenas no existe

Cada escena tiene su propio flash blanco de entrada e interpolate de opacidad de salida, pero no hay *cut* visual ni *wipe* ni continuidad entre ellas. El video se siente como 6 clips separados.

### 6. Scene3 (terminal) es la más técnica pero la menos legible

Los textos del terminal son de 17px en una pantalla de 1920×1080. En video comprimido, serán prácticamente ilegibles. Además, la Matrix Rain cubre el fondo pero el vignette la mata casi por completo.

### 7. La propuesta de valor no queda clara

Al terminar el video, ¿qué sabe el espectador que no sabía? ¿Qué *hace* el sistema? La narrativa es: "hay caos → reimaginado → login → qr → dashboard → criptografía → nombre". Falta la emoción del *beneficio*.

---

## Qué tienen Apple/Samsung que aquí falta

| Característica | Apple/Samsung | Este video |
|---|---|---|
| **Sujeto principal** | El producto físico en movimiento | Texto y tarjetas estáticas |
| **Profundidad de campo** | Bokeh, materiales, reflejos | Fondos planos |
| **Sound design** | Audio sincronizado a impactos | Sin audio (Remotion no lo incluye) |
| **Variedad de ritmo** | Cortes rápidos alternados con slow-motion | Todas las escenas al mismo ritmo |
| **Call to action** | Logo + tagline memorable | "Seguridad y escala en produccion." |
| **Identidad visual** | Colores de marca consistentes pero distintos | Todo azul-oscuro igual |
| **Texto mínimo** | Máximo 5-6 palabras en pantalla | Listas de términos técnicos |

---

## Propuestas de mejora (pendientes de implementar)

1. **Escena 1**: Mostrar una imagen caótica (grid de celdas desordenadas, o números/fechas cayendo) antes de "Reimaginado." — visualmente narrar el problema, no solo nombrarlo.
2. **Escenas 2A/2B/2C**: Cada rol debería tener su propio *color acento*. Estudiante = azul, Empresa = verde, Admin = púrpura. Actualmente todo es azul.
3. **Bloom rings**: Reservar para un solo momento climático (el unlock o el close). No repetir en 3 escenas.
4. **Scene 2C Admin**: Reemplazar el layout plano por un mockup de pantalla con efecto de perspectiva (como si vieras una tablet/laptop).
5. **Scene 3**: Eliminar Matrix Rain (cliché). En su lugar: diagrama de flujo animado del pipeline criptográfico (QR → encrypt → AES → response).
6. **Transiciones**: Añadir un motivo de transición entre escenas (e.g., una línea de luz que cruza toda la pantalla y limpia el canvas).
7. **Escala de texto**: Subir el body text a mínimo 28px. Los labels de escena (01-04) a 16px.
8. **Scene 4**: Extender a 600 frames (20s) para dar tiempo al espectador de leer y sentir el remate.
