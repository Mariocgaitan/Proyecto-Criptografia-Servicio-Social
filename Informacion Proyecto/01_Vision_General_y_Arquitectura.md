# 01 — Visión General y Arquitectura del SID

## 1. Descripción del Problema

En los eventos de vinculación universitaria del Tecnológico de Monterrey, los alumnos comparten códigos QR estáticos entre sí para inscribirse en proyectos de empresa sin estar presentes. Esto genera:
- **Suplantación de identidad**: Un alumno se inscribe en nombre de otro.
- **Datos de inscripción no confiables** para las empresas y la institución.
- **Cupos ocupados fraudulentamente**, perjudicando a alumnos que sí asisten.

## 2. Solución: Sistema de Inscripción Dinámica (SID)

El SID resuelve el problema mediante **tokens de un solo uso basados en tiempo (TOTP)**, generados en el dispositivo del alumno en tiempo real. Un QR que fue válido hace 30 segundos ya no lo es, haciendo imposible compartirlo con éxito.

**Regla de Negocio Crítica:** `1 Alumno = Máximo 1 Inscripción confirmada a 1 Proyecto por Evento.`

---

## 3. Contexto de Eventos

El sistema opera en **4 eventos anuales**, cada uno con sus propios proyectos y cupos:

| Clave de Evento | Nombre          | Período Aproximado |
|---|---|---|
| `INVIERNO`      | Invierno        | Diciembre          |
| `FEB_JUN`       | Febrero-Junio   | Mayo               |
| `VERANO`        | Verano          | Junio              |
| `AGO_DIC`       | Agosto-Diciembre| Agosto             |

> **Regla de Clasificación Inteligente de Eventos:**
> En un mismo mes puede haber un evento donde el alumno elige entre **dos períodos futuros** (ej. en Mayo, el evento permite inscribirse a proyectos de "Verano" o "Agosto-Diciembre"). El sistema debe asociar cada proyecto a un `id_evento` específico y validar que el alumno solo pueda inscribirse **una vez por evento**, sin importar el período que elija.

---

## 4. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│                                                              │
│  ┌─────────────────┐          ┌──────────────────────────┐  │
│  │  App Alumno     │          │  App Empresa (Escáner)   │  │
│  │  (Jinja2/JS)    │          │  (Jinja2/html5-qrcode)   │  │
│  │                 │          │                          │  │
│  │  - Login        │          │  - Escanear QR           │  │
│  │  - Dashboard    │          │  - Ver inscripciones     │  │
│  │  - QR Dinámico  │          │  - Gestionar lista espera│  │
│  └────────┬────────┘          └───────────┬──────────────┘  │
│           │ HTTPS                         │ HTTPS            │
└───────────┼───────────────────────────────┼─────────────────┘
            │                               │
┌───────────▼───────────────────────────────▼─────────────────┐
│                    SERVIDOR (FastAPI / ASGI)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Router:     │  │  Router:     │  │  Router:         │  │
│  │  /auth       │  │  /alumno     │  │  /empresa        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐ │
│  │              Capa de Servicios / CRUD                   │ │
│  │  (crud.py / services.py)                                │ │
│  │  - Lógica TOTP      - Lógica Transaccional              │ │
│  │  - Lógica JWT       - Lógica de Lista de Espera         │ │
│  └──────────────────────────┬──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │              SQLAlchemy ORM (Async)                      │ │
│  └──────────────────────────┬──────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                    PostgreSQL Database                        │
│  Usuarios | Empresas | Eventos | Proyectos | Inscripciones   │
│  ListaEspera | RefreshTokens | LogsAuditoria                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Backend** | Python 3.11+, FastAPI (ASGI) | Alto rendimiento async, ideal para operaciones concurrentes de inscripción |
| **Base de Datos** | PostgreSQL | Soporte nativo de transacciones ACID, bloqueos `FOR UPDATE`, arrays |
| **ORM** | SQLAlchemy (async) | Abstracción de DB con soporte para bloqueos a nivel de fila |
| **Criptografía TOTP** | `pyotp` (RFC 6238) | Estándar de la industria para OTP basado en tiempo |
| **Hashing de Contraseñas** | `passlib[bcrypt]` | Algoritmo de hashing seguro y lento por diseño |
| **Sesiones** | `PyJWT` (Access Token 15 min) + Refresh Token (8 hrs, DB) | Balance entre seguridad y usabilidad |
| **Frontend Alumno** | Jinja2 + Tailwind CSS CDN + `qrcode.js` | Renderizado de QR dinámico en el cliente |
| **Frontend Empresa** | Jinja2 + Tailwind CSS CDN + `html5-qrcode` | Acceso a cámara del dispositivo para escaneo |
| **Variables de Entorno** | `python-dotenv` + `.env` | Gestión segura de secretos (DB, JWT secret) |

---

## 6. Roles de Usuario

| Rol | Descripción | Acceso |
|---|---|---|
| **Alumno** | Usuario final del evento | Registro, login, ver dashboard, generar QR dinámico |
| **Empresa** | Representante en el evento | Escanear QRs, ver inscripciones de su proyecto, gestionar lista de espera |
| **Administrador** | Coordinador del evento (cliente) | Crear/gestionar eventos, subir empresas y proyectos, dashboard en tiempo real |

---

## 7. Módulos del Sistema

1. **Módulo de Autenticación** (`/auth`): Registro, login, logout, refresh de tokens.
2. **Módulo Alumno** (`/alumno`): Dashboard con QR dinámico, estado de inscripción.
3. **Módulo Empresa** (`/empresa`): Escáner QR, gestión de lista de espera.
4. **Módulo Admin** (`/admin`): CRUD de eventos/empresas/proyectos, dashboard en tiempo real.
5. **API Core** (`/api/v1`): Endpoints transaccionales de inscripción y validación.
