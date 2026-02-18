# Technical Specification Document: Sistema de Inscripción Dinámica (SID)

## 1. Visión General del Sistema
El SID es un sistema de control de acceso e inscripción para eventos de vinculación universitaria. Resuelve el problema de suplantación de identidad (alumnos pasando QRs estáticos) mediante la implementación de tokens de un solo uso basados en tiempo (TOTP) generados en el dispositivo del alumno y validados por el dispositivo de la empresa.

**Regla de Negocio Crítica:** 1 Alumno = Máximo 1 Inscripción a 1 Proyecto en todo el evento.

## 2. Stack Tecnológico Requerido
La IA debe utilizar estrictamente las siguientes tecnologías para la generación de código:
* **Backend:** Python 3.11+, FastAPI (ASGI asíncrono).
* **Base de Datos:** PostgreSQL (Uso de SQLAlchemy ORM, requiriendo bloqueos a nivel de fila `FOR UPDATE`).
* **Criptografía/Auth:** `pyotp` (RFC 6238 para TOTP), `passlib[bcrypt]` (Hashing de contraseñas), `PyJWT` (Sesiones de usuario).
* **Frontend (Entregables Esperados):** Plantillas HTML/Jinja2 servidas por FastAPI, Tailwind CSS via CDN, `qrcode.js` (para renderizar QR), `html5-qrcode` (para el escáner web de la empresa).

## 3. Esquema de Base de Datos (PostgreSQL)

La IA debe generar los modelos de SQLAlchemy basados en este esquema estricto:

* **Tabla `Usuarios`:**
    * `id_matricula` (String, PK, ej. 'A01234567')
    * `nombre` (String)
    * `correo` (String, Unique, Indexado) -> *Debe validarse que termine en `@tec.mx`*
    * `carrera` (String)
    * `semestre` (Integer)
    * `periodos` (ARRAY de Strings) -> *Soporta selección múltiple*
    * `password_hash` (String)
    * `totp_secret` (String, 32 chars) -> *Generado vía `pyotp.random_base32()` al registrarse.*

* **Tabla `Empresas`:**
    * `id_empresa` (Integer, PK, Autoincrement)
    * `nombre_empresa` (String)

* **Tabla `Proyectos`:**
    * `id_proyecto` (Integer, PK, Autoincrement)
    * `id_empresa` (Integer, FK -> Empresas.id_empresa)
    * `nombre_proyecto` (String)
    * `capacidad_max` (Integer)
    * `cupo_actual` (Integer, Default 0)

* **Tabla `Inscripciones`:**
    * `id_inscripcion` (UUID, PK)
    * `id_matricula` (String, FK -> Usuarios.id_matricula) -> *Constraint UNIQUE requerido a nivel SQL para garantizar 1 sola inscripción por alumno.*
    * `id_proyecto` (Integer, FK -> Proyectos.id_proyecto)
    * `timestamp` (DateTime, Default UTC NOW)

## 4. Contratos de API (Endpoints a Desarrollar)

### A. Pre-registro y Autenticación
* **`POST /api/v1/registro`**
    * *Payload Esperado:* JSON con `nombre`, `correo`, `matricula`, `carrera`, `semestre` (int), `periodos` (list[str]), `password`.
    * *Lógica:* Validar dominio `@tec.mx`. Hashear password. Generar `totp_secret`. Insertar en DB. Manejar error si matrícula/correo ya existe (HTTP 400).
* **`POST /api/v1/login`**
    * *Payload Esperado:* `correo` y `password`.
    * *Respuesta:* Retorna JWT o cookie de sesión, y el `totp_secret` para que el cliente genere los QRs en memoria local.

### B. Módulo Alumno (Frontend)
* **`GET /alumno/dashboard`**
    * *Lógica:* Vista protegida por auth. Muestra contador de cupos disponibles (1 o 0). Si es 1, ejecuta JS cliente (`qrcode.js`) para generar un QR dinámico que contiene el payload `{"matricula": "A0...", "totp": "<codigo_6_digitos>"}`. El QR debe regenerarse (JS `setInterval`) cada 30 segundos usando el `totp_secret`.

### C. Módulo Empresa (Transaccional Core)
* **`GET /empresa/escaner/{id_proyecto}`**
    * *Lógica:* Vista web que activa la cámara del dispositivo usando `html5-qrcode`. Al leer un QR válido, extrae el JSON y dispara el POST a `/validar`.
* **`POST /api/v1/inscripciones/validar`**
    * *Payload Esperado:* `{"matricula": str, "totp_leido": str, "id_proyecto": int}`
    * *Lógica Transaccional Estricta (Requisito Crítico):*
        1.  Verificar que `totp_leido` sea válido para el `totp_secret` de esa matrícula usando `pyotp.verify()`. (Error 400 si expira).
        2.  Iniciar Transacción DB (`BEGIN`).
        3.  Hacer `SELECT ... FOR UPDATE` sobre la tabla `Proyectos` filtrando por `id_proyecto`.         4.  Verificar `cupo_actual < capacidad_max`. (Error 409 si lleno).
        5.  Insertar registro en `Inscripciones`. (El constraint UNIQUE de `id_matricula` evitará dobles inscripciones, devolver Error 403 si falla).
        6.  Ejecutar `UPDATE Proyectos SET cupo_actual = cupo_actual + 1`.
        7.  `COMMIT`. Retornar HTTP 200 OK.

## 5. Directivas de Código para la IA
* Priorizar la modularidad: Separar rutas (`routers`), modelos de base de datos (`models.py`), esquemas de Pydantic (`schemas.py`) y lógica de negocio/seguridad (`crud.py` o `services.py`).
* Manejar excepciones HTTP adecuadamente (`HTTPException` de FastAPI) para dar feedback claro al frontend (Ej. "Cupo Lleno", "Código Expirado", "El alumno ya está inscrito en otro proyecto").
* Implementar variables de entorno (`.env`) para la cadena de conexión de PostgreSQL y secretos de JWT.