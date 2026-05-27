# Descripción Completa del Video: Feria Servicio Social

> Documento de referencia para IA — describe el video animado en su totalidad sin necesidad de ver el código ni el video. Incluye narrativa, flujo visual, escenas, componentes y transiciones.

---

## 1. Propósito y Audiencia

El video es un **explainer animado de 90 segundos** (2 700 frames a 30 fps, 1920 × 1080 px) que presenta el sistema digital **"Feria Servicio Social"** del Tecnológico de Monterrey.

**Audiencia objetivo:** profesores, coordinadores de servicio social y directivos que actualmente gestionan la feria de forma manual (formularios en papel, listas físicas, filas).

**Objetivo del video:** demostrar en 90 segundos que el sistema digital reemplaza todo el proceso en papel con una experiencia rápida, segura y moderna, y motivar su adopción.

---

## 2. Especificaciones Técnicas

| Propiedad        | Valor                              |
|------------------|------------------------------------|
| Resolución       | 1920 × 1080 px (Full HD)           |
| Frame rate       | 30 fps                             |
| Duración total   | 2 700 frames (90 segundos)         |
| Motor            | Remotion 4.0 (React + Node.js)     |
| Tipografía sans  | Inter (Google Fonts, pesos 300–800)|
| Tipografía mono  | Fira Code / Courier New            |

---

## 3. Paleta de Colores

Todos los elementos visuales usan exclusivamente esta paleta.

| Nombre          | Valor                        | Uso principal                          |
|-----------------|------------------------------|----------------------------------------|
| `bg`            | `#FFFFFF`                    | Fondo de escenas claras                |
| `bgSoft`        | `#EEF2FF`                    | Fondos tenues azulados                 |
| `ink`           | `#08081A`                    | Texto principal sobre blanco           |
| `ink70`         | `rgba(8,8,26,0.70)`          | Texto secundario                       |
| `ink45`         | `rgba(8,8,26,0.45)`          | Subtítulos, labels                     |
| `ink20/08`      | versiones más tenues          | Líneas, bordes, separadores            |
| **`accent`**    | **`#0055FF`**                | **Acento principal — azul eléctrico**  |
| `accentGlow`    | `rgba(0,85,255,0.25)`        | Halos del acento                       |
| `accentDim`     | `rgba(0,85,255,0.10)`        | Fondos tenues del acento               |
| `green`         | `#00C853`                    | Confirmaciones, éxito, empresa         |
| `greenGlow`     | `rgba(0,200,83,0.25)`        | Halo verde                             |
| `violet`        | `#7C3AED`                    | Panel de administración                |
| `surface`       | `#0A0A1E`                    | Fondos oscuros premium (teléfonos)     |
| `surfaceCard`   | `#111127`                    | Tarjetas sobre superficies oscuras     |
| `white/60/30/10`| variantes de blanco          | Texto e íconos sobre oscuro            |

### Colores extra usados en escenas específicas

| Nombre          | Valor      | Dónde                                  |
|-----------------|------------|----------------------------------------|
| `DARK_BG`       | `#050D1A`  | Escena de escaneo QR (cinematográfico) |
| `FLOOR_BG`      | `#EDE8DF`  | Suelo cenital de la escena 1           |
| `PAPER_WHITE`   | `#FEFEFE`  | Hojas de formulario en papel           |
| Header azul     | `#1E3A8A`  | Banda de encabezado de papeles         |
| Rojo contador   | `#E04040`  | Número 547 en la escena problema       |

---

## 4. Estructura Global — SCENE_FRAMES

Las 6 escenas se encadenan sin solape; cada una ocupa un rango de frames absolutos del video.

| ID     | Escena                       | Frame inicio | Duración | Segundos |
|--------|------------------------------|:------------:|:--------:|:--------:|
| S1     | El Problema                  | 0            | 360      | 12 s     |
| S2A    | Estudiante — Flujo de acceso | 360          | 600      | 20 s     |
| S2B    | Empresa — Inscripción QR     | 960          | 540      | 18 s     |
| S2C    | Admin — Panel de control     | 1 500        | 450      | 15 s     |
| S3     | Bajo el capó — Tech stack    | 1 950        | 450      | 15 s     |
| S4     | Cierre — Call to action      | 2 400        | 300      | 10 s     |

---

## 5. Transiciones entre Escenas

**Componente:** `SceneTransition` — usado en los 5 puntos de corte.

**Mecánica:** Un conjunto de líneas y una banda oscura barren la pantalla de **izquierda a derecha** en **30 frames (1 segundo)** con un ángulo de `skewX(-7deg)`. La transición comienza 12 frames antes del corte para que la línea ya esté entrando cuando cambia la escena.

**Elementos visuales (en orden de aparición):**
1. **Línea de acento líder** — 4 px, azul eléctrico (`#0055FF`) con glow, la más rápida.
2. **Segunda línea de acento** — 2 px, azul al 55% de opacidad, levemente detrás.
3. **Banda oscura principal** — 180 px de ancho, gradiente `transparent → #050D1A → transparent`, barre el fotograma enmascarando ambas escenas.
4. **Línea blanca de cierre** — 2 px blanca al 62%, marca el borde posterior de la banda.

**Efecto narrativo:** La banda oscura con las líneas de acento crea la sensación de que el sistema "avanza" de una historia al siguiente capítulo. Es coherente con la estética tech del proyecto.

**Puntos de transición:**
- Frame 348 → 377: S1 → S2A
- Frame 948 → 977: S2A → S2B
- Frame 1488 → 1517: S2B → S2C
- Frame 1938 → 1967: S2C → S3
- Frame 2388 → 2417: S3 → S4

---

## 6. Escena 1 — "El Problema" (frames 0–359, 12 s)

### Propósito narrativo
Establecer el dolor del proceso actual: miles de formularios en papel, tiempo perdido, caos acumulado semestre a semestre.

### Fondo y atmósfera
Fondo crema `#EDE8DF` (evoca el color del papel / madera de un escritorio). Hay una cuadrícula de 88 × 88 px muy tenue (5% de opacidad) que refuerza la perspectiva de escritorio visto desde arriba. Una viñeta radial oscurece los bordes para enfocar el centro.

### Flujo visual (cronología)

| Frames      | Qué ocurre                                                                        |
|-------------|-----------------------------------------------------------------------------------|
| f 0–20      | Fade-in de la escena desde negro                                                  |
| f 5–30      | Aparece en la izquierda: **"Cada semestre."** (72 px, negrita 800, tinta oscura)  |
| f 18–48     | Aparece debajo: **"Miles de formularios. / En papel. Uno por uno."** (46 px, peso 300, ink70) |
| f 20–185    | En el centro del suelo, el contador sube de **0 → 547** en rojo `#E04040`, 155 px, peso 900 — representa los formularios acumulados en el semestre |
| f 30–172    | **60 hojas de papel tamaño carta caen desde arriba**, una a una, cubriendo todo el suelo |
| f 65–105    | Los papeles que caen en la zona izquierda empiezan a **tapar el texto narrativo** |
| f 88–130    | Los papeles que caen en el centro empiezan a **tapar el contador**                |
| ~f 185      | Todo el suelo está cubierto de papeles; el texto y el contador quedan enterrados  |
| f 230–282   | **Sweep de barrido**: todos los papeles vuelan hacia afuera radialmente desde el centro (efecto de explosión suave) |
| f 268–308   | **"Hay una mejor manera."** aparece en el centro, 104 px, negrita 800, con `ink` y `accent` — zoom-spring desde 88% + desenfoque de entrada |
| f 338–360   | Fade-out de la escena                                                             |

### Las 60 hojas de papel
- **Vista cenital** (desde arriba) — el espectador ve el suelo de una oficina
- **Proporción real tamaño carta**: ratio 8.5:11 ≈ 1:1.294 (~112 × 145 px con variación mínima)
- **Apariencia**: blancas (`#FEFEFE`), con banda de color en el encabezado (5 colores: azul acento, violeta, verde, azul marino `#1E3A8A`, rojo `#E04040`), línea de título, 7 campos de formulario (etiqueta + línea de escritura) y área de firma al pie
- **Animación de caída**: cada papel tiene un `delay` propio (frames 30–172). Usa dos springs: uno para la posición Y (`damping:16, stiffness:112`, desde y=−950) y otro para la escala (`damping:24, stiffness:185`, desde 0.2 → 1) — simula perspectiva de acercamiento al caer desde arriba
- **Distribución**: 6 filas × 9 columnas (54 papeles) + 6 extras en zona central. Cada paper tiene una rotación suave (−18° a +18°) y desplazamiento orgánico
- **Sweep de salida**: cada paper vuela en la dirección del vector radial desde el centro a su posición `(x/dist × 2200, y/dist × 1300)`, encogiendo a 30% y desvaneciéndose

### Componente etiqueta
En la esquina superior izquierda: `01 · EL PROBLEMA` en `FONTS.mono`, 13 px, `ink45`, `letterSpacing: 3px`.

---

## 7. Escena 2A — "Estudiante — Flujo de Acceso" (frames 360–959, 20 s)

### Propósito narrativo
Mostrar los 4 pasos que sigue un estudiante para inscribirse en la Feria: escanear el QR del stand, iniciar sesión con Google, completar su perfil, y recibir su propio QR de acceso.

### Sub-escenas internas (3 ambientes distintos)

#### Sub-escena A: "Escanea el QR del stand" (frames locales 0–128)
- **Fondo**: `#050D1A` (negro cinematográfico con viñeta radial oscura)
- **Composición**: vista de cámara de seguridad/cinematográfica
  - **Izquierda**: tarjeta física del stand — fondo blanco, QR (320 × 320 px) que se construye célula a célula, etiqueta "Feria Servicio Social / Escanea para registrarte"
  - **Derecha**: teléfono (265 × 510 px, bordes redondeados 34 px, fondo `#09162A`) con cámara activa que apunta al QR
- **Laser sincronizado**: una línea azul con glow (`#0055FF`) recorre verticalmente el QR del stand Y el visor del teléfono al mismo tiempo (f 45–112) — conecta visualmente ambos elementos
- **Reconocimiento (frame 112)**: flash azul, borde del QR se ilumina en azul, ✓ gigante aparece sobre el QR; en el teléfono: "✓ ACCESO VÁLIDO" en azul, chip URL `fss.tec.mx` con punto verde
- **Corners de reticule**: 4 esquinas estilo cámara en toda la pantalla Y dentro del teléfono (SVG `<line>` en forma de L), cambian de blanco a azul al reconocer. Indicador `REC 9:03` parpadeante en esquina superior derecha
- **Narración derecha**: "Escanea el QR / del stand." — texto blanco sobre oscuro

#### Sub-escena B: "Iniciar sesión — Solo cuentas @tec.mx" (frames locales 120–278)
- **Fondo**: blanco `#FFFFFF` con dot-grid sutil
- **Centro**: tarjeta realista de **Google Sign-In** (560 px ancho, centrada ligeramente a la izquierda del panel de narración)
  - Logo Google (SVG con los 4 colores reales), título "Acceder", subtítulo "Continúa en Feria Servicio Social"
  - Campo email con **escritura animada frame a frame**:
    - f 155–212: se escribe `A01659057` carácter a carácter en `ink` (negro)
    - f 212–252: se escribe `@tec.mx` carácter a carácter en **`accent` (azul)**, peso 400→700 al terminar
    - Cursor parpadeante frame-based: `Math.sin(frame/4 * π) > 0 ? 1 : 0`
    - El borde del campo cambia a azul cuando aparece `@tec.mx`; el fondo del campo se torna `accentDim`
  - Botón "Siguiente →" se activa (azul) cuando el email está completo
- **Narración derecha**: "Solo cuentas / @tec.mx." — la segunda línea en azul acento

#### Sub-escena C: "Completa tu perfil + QR listo" (frames locales 268–600)
- **Fondo**: blanco
- **Layout de 3 columnas**:
  1. **Panel de pasos** (izquierda, 252 px): 4 pasos del proceso con indicadores de círculo (número → azul activo → ✓ verde completado) y líneas de conexión que se colorean en verde al terminar
  2. **Teléfono** (centro, 285 × 545 px, fondo `surface` oscuro): muestra dos fases
     - **Fase formulario** (f 278–456): titulo "Completa tu perfil", barra de progreso azul, 4 campos que aparecen uno a uno (Carrera, Semestre, Celular con typing animado, Descripción con typing animado), botón "Guardar →" que se activa en azul
     - **Fase QR** (f 452–600): "Mi QR de acceso" aparece con zoom-spring + desenfoque de entrada, barra de cuenta regresiva 30s → 0s (cambia a rojo al llegar a los últimos segundos), regeneración del QR al expirar
  3. **Narración global** (derecha, 480 px desde el borde)
- **4 pasos del proceso** (visible en panel izquierdo):
  1. "Escanear QR del stand" (activo desde f 0, completado f 122)
  2. "Iniciar sesión" (activo f 122, completado f 278)
  3. "Completar perfil" (activo f 272, completado f 455)
  4. "QR de acceso listo" (activo f 450, completado f 590)

### Narración progresiva (panel derecho global, z-index 70)
El panel derecho de 480 px muestra textos que aparecen/desaparecen según la fase:
1. **"Escanea el QR / del stand."** — f 8–112, texto blanco sobre oscuro
2. **"Solo cuentas / @tec.mx."** — f 128–272, segunda línea en azul
3. **"Completa / tu perfil."** — f 280–448
4. **"Tu acceso / queda listo."** — f 458–545
5. **"Se regenera / cada 30s."** — f 548–580, tamaño menor
6. **Tech chips** (Google OAuth · TOTP · 2FA · AES-Fernet) — f 548+

---

## 8. Escena 2B — "Empresa — Inscripción QR" (frames 960–1499, 18 s)

### Propósito narrativo
Comparar el proceso manual (papel + firma) contra el proceso digital QR, y mostrar que el sistema es **14× más rápido**: 260 vs 18 inscritos en 10 minutos.

### Fase 1 — Manifiesto introductorio (frames locales 0–180)
Fondo oscuro `#050D1A`. Cinco frases aparecen en stagger sobre fondo negro, una por una, con tipografía grande:

| Frame local | Frase                   | Tamaño | Peso | Color                           |
|-------------|-------------------------|--------|------|---------------------------------|
| f 12        | "Cada alumno."          | 96 px  | 900  | Blanco                          |
| f 42        | "Un formulario."        | 72 px  | 300  | `#93B4E0` (azul pálido)         |
| f 70        | "Una lista."            | 72 px  | 300  | `#93B4E0`                       |
| f 96        | "Una firma."            | 72 px  | 300  | `#93B4E0`                       |
| f 124       | "3 minutos perdidos."   | 88 px  | 700  | `#0055FF` (acento)              |

### Fase 2 — Pantalla dividida (frames locales 180–540)
La pantalla se divide en **dos mitades de 960 px**:

**Lado izquierdo — QR Digital:**
- Teléfono empresarial entra en frame desde la izquierda
- QR del estudiante aparece en el visor
- Laser de escaneo barre el QR (f 260–330)
- Cronómetro sube: 0 → 2.3 s
- Flash de confirmación (f 330–355)
- ✓ "Inscrito" aparece en verde (f 388+)
- Tarjeta del estudiante: foto, nombre, carrera
- Label sutil: `QR · Cámara` en fuente mono, 10 px, azul tenue

**Lado derecho — Manual / Papel:**
- 5 viñetas (íconos + texto) aparecen con animación **"hero → settle"**:
  - Cada viñeta aparece grande en el centro de su mitad (escala ~2×), luego hace spring hacia su posición final en la lista
  - Contenido: 📋 Lista de asistencia, ✍️ Firma física, 🔍 Verificación manual, 📁 Archivado papel, ⏱ 3 min por alumno
- Label sutil: `Proceso · Manual` en fuente mono, 10 px, azul medio tenue

### Banner de comparación (frames locales 460–530)
Un banner aparece en la parte inferior con la comparación final:

| Lado QR (azul)              | Lado Manual (azul pálido)   |
|-----------------------------|-----------------------------|
| **260** inscritos en 10 min | **18** inscritos en 10 min  |

---

## 9. Escena 2C — "Admin — Panel de Control" (frames 1500–1949, 15 s)

### Propósito narrativo
Mostrar las 6 funciones clave del panel de administración que tiene el coordinador del evento.

### Diseño visual
Fondo blanco con dot-grid. Una tarjeta grande (card) entra desde la derecha, permanece en pantalla y sale a la izquierda para dar paso a la siguiente. Solo una tarjeta es visible a la vez.

### Las 6 tarjetas del carrusel

| # | Ícono | Título                        | Descripción                                                            | Tag                  |
|---|-------|-------------------------------|------------------------------------------------------------------------|----------------------|
| 1 | 🔒    | Pre-registro                  | Controla exactamente cuándo los alumnos pueden inscribirse             | `cerrar-preregistro` |
| 2 | ▶     | Iniciar Evento · Habilitar QR | Un clic activa el acceso QR para todos los participantes registrados   | `iniciar-evento`     |
| 3 | 📁    | Gestión de Proyectos          | Cupos, capacidades y disponibilidad de cada empresa en tiempo real     | `proyectos`          |
| 4 | 🏢    | Empresas + Carga CSV          | Registro masivo de empresas y proyectos con un solo archivo            | `upload-csv`         |
| 5 | 👥    | Inscripciones en Vivo         | Feed en tiempo real — cada escaneo aparece al instante en el panel     | `inscripciones`      |
| 6 | 🔑    | Credenciales de Empresa       | Gestión de usuarios y reset de contraseñas para acceso al scanner      | `credenciales`       |

El layout de cada tarjeta incluye: ícono grande, título, descripción, tag de función, y barras de capacidad animadas (Cemex 3/5, Femsa 1/3, etc.). Los puntos de paginación en la parte inferior indican en cuál tarjeta se está.

---

## 10. Escena 3 — "Bajo el Capó" (frames 1950–2399, 15 s)

### Propósito narrativo
Para la audiencia técnica: mostrar qué tecnologías hacen funcionar el sistema y los impactos cuantitativos reales.

### Fase 1 — Comparación problema vs. solución (f 18–188)
3 pares de "antes/después" que aparecen uno a uno:

| Antes (tachado)        | Después (verde/acento)          |
|------------------------|---------------------------------|
| Formularios en papel   | QR digital instantáneo          |
| Filas de espera        | Inscripción en 2.3s             |
| Sin historial          | Dashboard en tiempo real        |

### Fase 2 — Tech stack (f 188–330)
8 chips de tecnología aparecen en stagger, cada uno con nombre, rol y color propio:

| Tecnología   | Rol                   | Color      |
|--------------|-----------------------|------------|
| FastAPI      | API REST + async      | `#0055FF`  |
| React        | SPA frontend          | `#61DAFB`  |
| PostgreSQL   | Base de datos         | `#336791`  |
| Redis        | Cache · QR tokens     | `#DC382D`  |
| Docker       | Contenedores prod     | `#2496ED`  |
| AWS EC2      | Infraestructura cloud | `#FF9900`  |
| TOTP RFC6238 | 2FA autenticación     | `#7C3AED`  |
| OAuth 2.0    | SSO Google            | `#4285F4`  |

### Fase 3 — Estadísticas de impacto (f 330–450)
3 estadísticas clave aparecen grandes, una a una:

| Valor  | Unidad         | Descripción                 | Color    |
|--------|----------------|-----------------------------|----------|
| 0      | papel          | Proceso 100% digital        | Verde    |
| 2.3s   | —              | por inscripción              | Azul     |
| +500   | insc / feria   | escala sin problema          | Violeta  |

---

## 11. Escena 4 — "Cierre" (frames 2400–2699, 10 s)

### Propósito narrativo
Call to action. Dejar grabado el nombre del proyecto, la institución, y la URL donde se puede acceder al sistema.

### Flujo visual

| Frames    | Elemento                                                                   |
|-----------|----------------------------------------------------------------------------|
| f 30–75   | **"Feria Servicio Social"** zoom-spring desde 190% → 100% + desenfoque de entrada (112 px, negrita 800) |
| f 90–175  | Línea divisora con gradiente azul crece de 0 → 560 px                     |
| f 130–175 | **"TECNOLOGICO DE MONTERREY"** fade + rise (20 px mono, espaciado 6px)    |
| f 165–210 | Tagline: **"Digitaliza la experiencia de tu evento."** (22 px, peso 300)  |
| f 165–210 | Stat: **+500 inscripciones · 0 papeles** (azul + verde)                   |
| f 195–240 | **"feriaserviciosocial.com"** — URL prominente (42 px, mono, azul acento) |
| f 235–275 | 6 chips tech mini: FastAPI · React · PostgreSQL · Redis · Docker · AWS EC2 |
| f 262–300 | Fade-out final                                                             |

El fondo tiene un punto de luz tenue centrado (`accent` al 3% de opacidad, gradiente elíptico). Todo el contenido respira ligeramente con `scale(1 + 0.004 × sin(frame × 0.05))`.

---

## 12. Componentes Reutilizables

### `QRAbstractGrid`
Genera un grid de células que se construye celda a celda. Parámetros: `size`, `startFrame`, `buildDuration`, `cellColor`. Usado en 3 contextos:
- QR del stand (320 px, tinta oscura)
- QR en visor del teléfono (108 px, blanco)
- QR del estudiante en fase C (138 px, blanco)

### `SceneTransition`
Transición de 30 frames entre escenas (descrita en sección 5).

### `ParticleField`, `MatrixRain`, `CameraReticle`, `TerminalTyper`, `AnimatedBars`, `GlassCard`, `TechLogos`
Componentes decorativos y técnicos usados en escenas S2C y S3. Contribuyen a la estética tech premium.

---

## 13. Arco Narrativo General

```
┌──────────────────────────────────────────────────────────────────┐
│  ACT 1 — EL PROBLEMA (12s)                                       │
│  Vista cenital de un escritorio. Papeles caen y lo cubren todo.  │
│  "547 formularios acumulados." → "Hay una mejor manera."         │
├──────────────────────────────────────────────────────────────────┤
│  ACT 2 — LA SOLUCIÓN (53s = S2A + S2B + S2C)                    │
│                                                                  │
│  S2A · Estudiante (20s)                                          │
│    Escanea QR → Login Google (@tec.mx) → Formulario →           │
│    QR personal con regeneración cada 30s                         │
│                                                                  │
│  S2B · Empresa (18s)                                             │
│    "Cada alumno. Un formulario. 3 minutos perdidos." →           │
│    QR digital: inscripción en 2.3s                               │
│    260 vs 18 inscritos en 10 minutos                             │
│                                                                  │
│  S2C · Admin (15s)                                               │
│    Pre-registro → Evento → Proyectos → CSV → Live feed → Creds  │
├──────────────────────────────────────────────────────────────────┤
│  ACT 3 — CREDIBILIDAD TÉCNICA (15s)                              │
│  Stack completo. 0 papel. 2.3s/inscripción. +500 inscritos.      │
├──────────────────────────────────────────────────────────────────┤
│  ACT 4 — LLAMADA A LA ACCIÓN (10s)                               │
│  "Feria Servicio Social" → feriaserviciosocial.com               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 14. Principios de Diseño Visual

1. **Blanco como base** — las escenas claras usan `#FFFFFF` con dot-grid muy tenue para dar profundidad sin ruido
2. **Azul eléctrico como acento único** — `#0055FF` aparece siempre que hay una acción positiva, una confirmación o un elemento del sistema digital
3. **Superficies oscuras para dispositivos** — los teléfonos y elementos "digitales" tienen fondo `#050D1A` o `#0A0A1E`, creando contraste intencional
4. **Tipografía editorial** — Inter peso 800-900 para titulares, peso 300 para subtítulos; siempre con `letterSpacing` negativo en títulos grandes
5. **Animaciones tipo spring** — todos los elementos entran con `spring(damping, stiffness)` de Remotion para movimiento orgánico (nunca `ease-in-out` puro)
6. **Coherencia cinematográfica** — la escena de escaneo usa corners de reticule, indicador REC, viñeta radial y glow para evocar tecnología de cámara/scanner profesional

---

## 15. Datos Clave del Sistema (mencionados en el video)

| Dato                     | Valor                          |
|--------------------------|--------------------------------|
| Formularios acumulados   | 547 por semestre               |
| Tiempo por inscripción   | 2.3 segundos (sistema digital) |
| Tiempo por inscripción   | ~3 minutos (proceso en papel)  |
| Inscritos en 10 min (QR) | 260 estudiantes                |
| Inscritos en 10 min (manual) | 18 estudiantes             |
| Factor de mejora         | ~14×                           |
| Capacidad                | +500 inscritos por feria       |
| Regeneración QR          | cada 30 segundos (TOTP)        |
| Dominio                  | feriaserviciosocial.com        |
| Institución              | Tecnológico de Monterrey       |
| Email de acceso          | A01659057@tec.mx (ejemplo)     |
