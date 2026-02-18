# 04 — Flujos de Usuario

## Flujo 1: Registro e Inicio de Sesión del Alumno

```
Alumno                          Frontend (Browser)              Backend (FastAPI)              DB
  │                                     │                               │                      │
  │── Llena formulario de registro ────►│                               │                      │
  │   (selecciona 1 o 2 eventos)        │                               │                      │
  │   [checkbox] ☑ Verano 2026          │                               │                      │
  │   [checkbox] ☑ Agosto-Dic 2026      │                               │                      │
  │                                     │── POST /api/v1/auth/registro ►│                      │
  │                                     │   {eventos_seleccionados:[2,3]}│                      │
  │                                     │                               │── Validar @tec.mx    │
  │                                     │                               │── Validar eventos    │
  │                                     │                               │── Hash password      │
  │                                     │                               │── Generar TOTP secret│
  │                                     │                               │── INSERT Usuarios ──►│
  │                                     │                               │── INSERT UsuarioEventos(2)►│
  │                                     │◄── 201 Created ───────────────│                      │
  │◄── "Registro exitoso, inicia sesión"│                               │                      │
  │                                     │                               │                      │
  │── Ingresa correo + password ────────►│                               │                      │
  │                                     │── POST /api/v1/auth/login ───►│                      │
  │                                     │                               │── Verificar bcrypt ──►│
  │                                     │                               │── Generar JWT (15min) │
  │                                     │                               │── Generar RefreshToken│
  │                                     │                               │── INSERT RefreshTokens►│
  │                                     │◄── 200 OK (JWT + Cookie) ─────│                      │
  │◄── Redirigir a /alumno/dashboard ───│                               │                      │
```

---

## Flujo 2: Generación y Uso del QR Dinámico (Alumno)

```
Alumno                  Browser (JS)                    Backend                    DB
  │                         │                               │                       │
  │── Abre dashboard ───────►│                               │                       │
  │                         │── GET /alumno/dashboard ──────►│                       │
  │                         │                               │── Verificar JWT        │
  │                         │                               │── Obtener UsuarioEventos►│
  │                         │                               │◄── [Evento 2, Evento 3]─│
  │                         │                               │── ¿Ya inscrito ev.2? ──►│
  │                         │                               │◄── No inscrito ─────────│
  │                         │                               │── ¿Ya inscrito ev.3? ──►│
  │                         │                               │◄── No inscrito ─────────│
  │                         │◄── HTML con 2 secciones QR ───│                       │
  │                         │                               │                       │
  │                         │ [JS: setInterval cada 30s, por cada evento]           │
  │                         │── GET /api/v1/alumno/qr-payload?id_evento=2 ──────────►│
  │                         │                               │── Obtener totp_secret ►│
  │                         │                               │── pyotp.TOTP.now()     │
  │                         │◄── {"qr_data": "...id_evento:2", "expira_en": 18} ────│
  │                         │── GET /api/v1/alumno/qr-payload?id_evento=3 ──────────►│
  │                         │◄── {"qr_data": "...id_evento:3", "expira_en": 18} ────│
  │                         │                               │                       │
  │                         │ [JS: qrcode.js renderiza 2 QRs, uno por evento]       │
  │◄── 2 QRs visibles en pantalla                           │                       │
  │   (Verano 2026 / Ago-Dic 2026)                          │                       │
```

---

## Flujo 3: Inscripción Exitosa (Happy Path)

```
Alumno          QR en Pantalla     Empresa (Escáner)        Backend              DB
  │                  │                    │                     │                  │
  │                  │                    │── Abre /empresa/escaner/7              │
  │                  │                    │── html5-qrcode activa cámara           │
  │                  │                    │                     │                  │
  │── Muestra QR ───►│                    │                     │                  │
  │   (id_evento: 2) │◄── Escanea QR ─────│                     │                  │
  │                  │                    │── POST /api/v1/inscripciones/validar ─►│
  │                  │                    │   {matricula, totp, id_proyecto: 7}    │
  │                  │                    │                     │── Verificar TOTP ►│
  │                  │                    │                     │◄── totp_secret ───│
  │                  │                    │                     │── pyotp.verify() ✓│
  │                  │                    │                     │── Obtener id_evento del proyecto►│
  │                  │                    │                     │◄── id_evento = 2 ──│
  │                  │                    │                     │── Verificar UsuarioEventos►│
  │                  │                    │                     │◄── Alumno tiene ev.2│
  │                  │                    │                     │── BEGIN TX        │
  │                  │                    │                     │── SELECT FOR UPDATE►│
  │                  │                    │                     │◄── cupo: 14/20 ───│
  │                  │                    │                     │── INSERT Inscripción(id_evento=2)►│
  │                  │                    │                     │── UPDATE cupo_actual►│
  │                  │                    │                     │── DELETE ListaEspera(ev.2)►│
  │                  │                    │                     │── COMMIT           │
  │                  │                    │                     │── Log INSCRIPCION_OK│
  │                  │                    │◄── 200 OK ──────────│                  │
  │                  │                    │── ✅ "Juan Pérez - App Móvil (Verano 2026)"   │
```

---

## Flujo 4: Proyecto Lleno → Lista de Espera

```
Alumno          QR en Pantalla     Empresa (Escáner)        Backend              DB
  │                  │                    │                     │                  │
  │── Muestra QR ───►│                    │                     │                  │
  │   (id_evento: 2) │◄── Escanea QR ─────│                     │                  │
  │                  │                    │── POST /validar ────►│                  │
  │                  │                    │                     │── SELECT FOR UPDATE►│
  │                  │                    │                     │◄── cupo: 20/20 ───│
  │                  │                    │                     │── ¿Hay espera? ───►│
  │                  │                    │                     │◄── espera: 2/5 ───│
  │                  │                    │                     │── INSERT ListaEspera(ev.2)►│
  │                  │                    │                     │── COMMIT           │
  │                  │                    │◄── 202 Accepted ────│                  │
  │                  │                    │── ⏳ "En lista de espera (posición 3)"  │
  │                  │                    │                     │                  │
  │   [Alumno va a otro proyecto con cupo del MISMO evento (ev.2)]       │
  │── Muestra QR ───►│                    │                     │                  │
  │   (id_evento: 2) │◄── Escanea QR ─────│ (Empresa proyecto 12)│                 │
  │                  │                    │── POST /validar ────►│                  │
  │                  │                    │                     │── Inscripción OK  │
  │                  │                    │                     │── DELETE ListaEspera│
  │                  │                    │                     │   WHERE ev=2 (solo ev.2)►│
  │                  │                    │◄── 200 OK ──────────│                  │
  │                  │                    │                     │                  │
  │   [QR de ev.3 (Ago-Dic) sigue activo e independiente]               │
```

---

## Flujo 5: Intento de Doble Inscripción (Seguridad)

```
Alumno A        Alumno B (intenta usar QR de A)    Backend              DB
  │                         │                          │                  │
  │── Comparte QR ─────────►│                          │                  │
  │                         │── POST /validar ─────────►│                  │
  │                         │   {matricula: A01234567,  │                  │
  │                         │    totp: 482931}          │                  │
  │                         │                          │── Verificar TOTP  │
  │                         │                          │   [Si han pasado  │
  │                         │                          │    más de 30s]    │
  │                         │                          │── pyotp.verify() ✗│
  │                         │◄── 400 "Código expirado" ─│                  │
  │                         │                          │── Log TOTP_INVALIDO│
  │                         │                          │                  │
  │   [Si Alumno A ya está inscrito y B usa QR válido] │                  │
  │                         │── POST /validar ─────────►│                  │
  │                         │                          │── Verificar TOTP ✓│
  │                         │                          │── ¿Ya inscrito? ──►│
  │                         │                          │◄── SÍ (A01234567)─│
  │                         │◄── 403 "Alumno ya inscrito"│                 │
```

---

## Flujo 6: Admin — Gestión del Evento

```
Admin                   Panel Admin (Browser)           Backend              DB
  │                            │                            │                  │
  │── Login como admin ────────►│                            │                  │
  │                            │── POST /api/v1/auth/login ►│                  │
  │                            │◄── JWT (rol: admin) ───────│                  │
  │                            │                            │                  │
  │── Crear evento ────────────►│                            │                  │
  │                            │── POST /api/v1/admin/eventos►│                 │
  │                            │◄── 201 Created ────────────│                  │
  │                            │                            │                  │
  │── Subir empresa ───────────►│                            │                  │
  │                            │── POST /api/v1/admin/empresas►│                │
  │                            │◄── 201 Created ────────────│                  │
  │                            │                            │                  │
  │── Subir proyecto ──────────►│                            │                  │
  │                            │── POST /api/v1/admin/proyectos►│               │
  │                            │◄── 201 Created ────────────│                  │
  │                            │                            │                  │
  │── Ver dashboard en vivo ───►│                            │                  │
  │                            │── GET /api/v1/admin/dashboard/stats►│          │
  │                            │◄── JSON con estadísticas ──│                  │
  │◄── Gráficas en tiempo real ─│ [JS polling cada 5s]       │                  │
```

---

## Flujo 7: Ampliación de Cupo al Final del Evento

```
Admin                   Panel Admin                    Backend              DB
  │                         │                              │                  │
  │── Ampliar cupo proyecto 7►│                             │                  │
  │   (de 20 a 25)          │                              │                  │
  │                         │── PATCH /admin/proyectos/7/capacidad►│           │
  │                         │   {"nueva_capacidad_max": 25} │                  │
  │                         │                              │── UPDATE Proyectos►│
  │                         │                              │── ¿Hay en espera?─►│
  │                         │                              │◄── 3 alumnos ─────│
  │                         │                              │── Mover 5 de espera│
  │                         │                              │   a Inscripciones  │
  │                         │                              │   (FIFO por timestamp)│
  │                         │◄── 200 OK ───────────────────│                  │
  │◄── "5 alumnos movidos de lista de espera a inscritos" ─│                  │
```
