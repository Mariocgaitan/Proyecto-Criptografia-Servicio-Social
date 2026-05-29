# Animation / public

Coloca aquí los archivos de audio antes de renderizar.

---

## Archivos requeridos

| Archivo | Duración | Descripción |
|---|---|---|
| `music.mp3` | >= 90 s | Música de fondo ambient/tech (se hace loop automático) |
| `voice-01-s1.mp3` | ~11 s | Narración Escena 1 — El Problema |
| `voice-02-bridge.mp3` | ~5 s | Narración Escena Bridge |
| `voice-03-s2a.mp3` | ~16 s | Narración Escena Estudiante |
| `voice-04-s2b.mp3` | ~12 s | Narración Escena Empresa |
| `voice-05-slive.mp3` | ~13 s | Narración Escena Evento en vivo |
| `voice-06-s2c.mp3` | ~11 s | Narración Escena Admin |
| `voice-07-s3.mp3` | ~7 s | Narración Escena Confianza técnica |
| `voice-08-s4.mp3` | ~3.5 s | Narración Escena Cierre |

Los clips de voz deben ser más cortos que la duración de la escena para dejar silencio al final.
Graba o genera con TTS y exporta como MP3 44.1 kHz, mono o estéreo.

---

## Guion de narración (ElevenLabs / TTS)

Estilo recomendado: narrador profesional, tono documental, español neutro, pausado.

### voice-01-s1.mp3 — El Problema (escena 12 s)
"Cada semestre, cientos de estudiantes del Tec buscan su lugar en el servicio social. El proceso: formularios en papel, filas, datos perdidos y horas desperdiciadas."

### voice-02-bridge.mp3 — Transición (escena 6 s)
"Hasta que un equipo del Tec construyó una solución diferente."

### voice-03-s2a.mp3 — Estudiante (escena 18 s)
"Ahora el estudiante llega a la feria, escanea un código QR con su celular, inicia sesión con su cuenta institucional — y en segundos queda registrado. Sin formularios. Sin filas. Con su pase digital en mano."

### voice-04-s2b.mp3 — Empresa (escena 14 s)
"Las empresas socioformadoras publican sus proyectos y cupos desde el panel web. Reciben solicitudes en tiempo real, revisan perfiles y confirman candidatos con un solo clic."

### voice-05-slive.mp3 — Evento en vivo (escena 15 s)
"El día del evento, el sistema procesa cientos de registros de forma simultánea. Sin papel, sin errores. Cada estudiante registrado en menos de diez segundos. Todo, en tiempo real."

### voice-06-s2c.mp3 — Admin (escena 13 s)
"El administrador tiene visibilidad total: asignaciones por empresa, estadísticas en vivo y control de acceso — todo desde un solo panel, en cualquier momento."

### voice-07-s3.mp3 — Confianza técnica (escena 8 s)
"Cada dato cifrado de extremo a extremo. El sistema garantiza seguridad, velocidad y escala para miles de registros."

### voice-08-s4.mp3 — Cierre (escena 4 s)
"Del papel al control total del evento."

---

## Música de fondo recomendada (licencia libre)

Estilo: ambient, corporate tech, minimal electronic. BPM ideal: 90-110.

| Fuente | URL | Licencia |
|---|---|---|
| Pixabay Music | https://pixabay.com/music/search/corporate%20technology/ | CC0 — sin atribución |
| Mixkit | https://mixkit.co/free-stock-music/tech/ | Libre para video |
| Incompetech (Kevin MacLeod) | https://incompetech.com/music/royalty-free/ | CC BY 4.0 |

Busca en Pixabay: "technology ambient", "corporate minimal" o "innovation tech".

---

## Niveles de audio (ya configurados en FeriaServicioSocial.jsx)

music.mp3    -> volume 0.18  (fade in f0-60, fade out f2640-2700)
voice-XX.mp3 -> volume 1.0   (cada clip dentro de su Sequence)
