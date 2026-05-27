# Brief de Implementación IA — Redirección Profesional Motion Graphic  
## Proyecto: Feria Servicio Social — Tecnológico de Monterrey

> **Propósito de este documento:**  
> Guiar a la IA desarrolladora para transformar el video actual de Remotion de una animación funcional a un **motion graphic profesional**, con una dirección visual clara, narrativa cinematográfica, voz integrada, escenas conectadas y una gramática visual consistente.

---

# 1. Diagnóstico del video actual

El video actual ya tiene una base sólida:

- Escena inicial con problema claro: formularios acumulados, papeles cayendo y saturación visual.
- Flujo del estudiante con QR, Google login, perfil y QR personal.
- Flujo de empresa con escaneo, comparación manual vs digital y dato de mejora.
- Escena de admin con funciones del panel.
- Escena técnica con stack.
- Cierre con nombre, URL y estadísticas.

Sin embargo, el video se percibe **estático** porque las escenas funcionan como bloques separados. Las primeras escenas cuentan una historia, pero las últimas se sienten más como una lista animada de funcionalidades.

El objetivo de esta nueva versión es convertir el video en una pieza con:

- narrativa continua;
- dirección visual unificada;
- escenas conectadas;
- profundidad visual;
- intención cinematográfica;
- voz en off integrada;
- movimiento con propósito;
- sistema visual repetible.

---

# 2. Nueva dirección creativa

## Concepto central

> **Del caos en papel a un evento vivo, medible y controlado en tiempo real.**

El video no debe sentirse como una demo de software.  
Debe sentirse como una transformación operativa.

No se está vendiendo una app.  
Se está mostrando cómo un proceso manual, lento y desordenado se convierte en un sistema digital, seguro, rápido y controlado.

---

# 3. Idea visual principal

## La línea azul inteligente

La nueva versión debe estar guiada por una **línea azul eléctrica** que representa el sistema digital.

Esta línea debe funcionar como el “personaje visual” del video.

Debe:

1. Nacer dentro del caos de papeles.
2. Cortar el desorden.
3. Convertirse en haz de escaneo.
4. Recorrer el QR.
5. Activar el login institucional.
6. Dibujar el formulario digital.
7. Formar el QR personal.
8. Viajar hacia la empresa.
9. Convertirse en pulso de inscripción.
10. Alimentar el dashboard.
11. Conectar los módulos administrativos.
12. Ordenar los datos.
13. Subrayar el cierre.

La línea azul no debe ser solo transición.  
Debe ser el elemento que **causa** los cambios visuales.

---

# 4. Objetivo de rediseño

La implementación debe pasar de:

> “Mira todas las funciones del sistema.”

a:

> “Mira cómo el sistema transforma el evento completo.”

El video debe comunicar:

- menos papel;
- menos filas;
- validación institucional;
- registro rápido;
- control en tiempo real;
- seguridad;
- trazabilidad;
- escalabilidad;
- experiencia moderna.

---

# 5. Duración y estructura sugerida

Mantener duración aproximada de **90 segundos**.

## Nueva estructura narrativa

| Tiempo aprox. | Escena | Objetivo |
|---:|---|---|
| 0–12 s | Caos en papel | Mostrar el dolor del proceso actual. |
| 12–18 s | Nace la línea digital | Introducir la solución visual. |
| 18–36 s | Estudiante | Escanea, valida cuenta, completa perfil y obtiene QR. |
| 36–50 s | Empresa | Escanea QR del estudiante e inscribe en segundos. |
| 50–65 s | Evento vivo | Mostrar registros como pulsos conectados al sistema. |
| 65–78 s | Centro de control | Mostrar panel admin como dashboard vivo, no carrusel. |
| 78–86 s | Confianza e impacto | Mostrar seguridad, escala y métricas clave. |
| 86–90 s | Cierre | Nombre, promesa y URL. |

---

# 6. Cambio principal sobre la versión actual

## Antes

El video actual separa:

- problema;
- estudiante;
- empresa;
- admin;
- tech stack;
- cierre.

## Ahora

La IA debe conectar todo en una misma transformación:

```text
papel → línea azul → QR → validación → QR personal → escaneo empresa → dato → dashboard → impacto → cierre
```

Cada escena debe nacer de la anterior.

---

# 7. Sistema visual

## Paleta principal

Usar la paleta actual, pero con reglas más estrictas.

| Color | Valor | Uso |
|---|---|---|
| Blanco | `#FFFFFF` | Escenas limpias, UI, explicación editorial. |
| Fondo oscuro tech | `#050D1A` | Escaneo, QR, momentos cinematográficos. |
| Tinta principal | `#08081A` | Texto sobre blanco. |
| Tinta secundaria | `rgba(8,8,26,0.70)` | Subtítulos. |
| Tinta tenue | `rgba(8,8,26,0.45)` | Labels, metadatos. |
| Azul eléctrico | `#0055FF` | Acción digital, línea guía, conexión, CTAs. |
| Glow azul | `rgba(0,85,255,0.25)` | Halos, pulsos, escaneos. |
| Verde éxito | `#00C853` | Confirmación, inscripción, validación exitosa. |
| Violeta | `#7C3AED` | Solo detalles de admin o seguridad. |
| Superficie oscura | `#0A0A1E` | Teléfonos, paneles oscuros. |
| Card oscura | `#111127` | Tarjetas dentro de dispositivos. |
| Rojo alerta | `#E04040` | Solo para problema, fricción o urgencia. |

## Regla de uso

- El **azul** significa acción digital.
- El **verde** significa éxito.
- El **rojo** significa problema o fricción.
- El **violeta** debe usarse poco, solo para admin/seguridad.
- El blanco no debe sentirse vacío: debe tener profundidad con grids, sombras suaves, gradientes muy sutiles y movimiento de cámara.

---

# 8. Sistema de movimiento

## Principios

Cada movimiento debe cumplir una función:

1. Guiar la mirada.
2. Conectar una idea con otra.
3. Mostrar transformación.
4. Crear profundidad.
5. Marcar ritmo con la voz.
6. Reforzar una acción del sistema.

Evitar animaciones decorativas sin propósito.

---

## Técnicas obligatorias

### 8.1 Línea guía SVG

Implementar un componente reusable:

```text
DigitalGuideLine
```

Debe poder:

- dibujar paths con stroke;
- revelar usando strokeDasharray / strokeDashoffset;
- tener glow;
- emitir pequeños pulsos;
- convertirse en scanner vertical;
- conectar nodos;
- subrayar texto;
- actuar como transición.

La línea azul debe aparecer varias veces durante el video, no solo entre escenas.

---

### 8.2 Transiciones causales

No usar cortes aislados o fade out/fade in como recurso principal.

Las transiciones deben ocurrir porque la línea azul transforma un elemento:

| Desde | Hacia | Transición sugerida |
|---|---|---|
| Papeles | QR stand | La línea limpia el papel y revela el QR. |
| QR stand | Login | El QR se expande a interfaz de autenticación. |
| Login | Perfil | La línea recorre el email y abre formulario. |
| Perfil | QR personal | El formulario se compacta y se convierte en QR. |
| QR personal | Empresa | El QR viaja como pulso al scanner. |
| Scanner | Dashboard | El check de inscripción se transforma en dato. |
| Dashboard | Impacto | Los datos se agrupan en métricas. |
| Impacto | Cierre | Los datos forman el nombre del sistema. |

---

### 8.3 Cámara virtual 2D

Crear sensación de cámara aunque todo sea 2D.

Usar:

- slow push-in;
- zoom out reveal;
- pan lateral;
- parallax;
- enfoque/desenfoque suave;
- escalas por capas.

Evitar escenas completamente fijas.

Cada escena debe tener al menos un movimiento global muy sutil.

---

### 8.4 Profundidad por capas

Cada escena debe tener:

1. Fondo.
2. Grid, textura o gradiente.
3. Elementos secundarios.
4. Elemento principal.
5. Línea azul / acción.
6. Texto narrativo.
7. Detalles o microinteracciones.

No poner todos los elementos al mismo nivel visual.

---

### 8.5 Microinteracciones

Incluir microinteracciones en:

- validación de correo `@tec.mx`;
- check de acceso válido;
- botón activado;
- QR generado;
- QR escaneado;
- counter de inscritos;
- feed en vivo;
- barras de cupo;
- nodos del mapa;
- métricas finales.

Ejemplos:

- botón que pasa de gris a azul;
- borde de input que se ilumina;
- check que aparece con spring;
- número que cuenta rápidamente;
- pulso que viaja al dashboard;
- barra que se llena y se estabiliza;
- chip que aparece con ligero rebote.

---

# 9. Tipografía y texto

## Tipografía

Mantener:

- **Inter** para títulos y texto.
- **Fira Code / monospace** para labels técnicos, URL, etiquetas de sistema.

## Regla de texto

El video debe usar menos texto y más intención.

Evitar frases largas en pantalla.

Preferir frases cortas:

- “Cada semestre.”
- “Miles de formularios.”
- “Filas.”
- “Firmas.”
- “Validaciones manuales.”
- “Hay una mejor manera.”
- “Escanea.”
- “Valida.”
- “Registra.”
- “Controla.”
- “Mide.”
- “Sin papel.”
- “En tiempo real.”

Los textos deben sentirse de campaña, no como manual de usuario.

---

# 10. Voz en off

## Tono

La voz debe ser:

- clara;
- institucional;
- moderna;
- segura;
- no exageradamente comercial;
- enfocada en transformación;
- con ritmo pausado pero dinámico.

No debe describir literalmente todo lo que se ve.

Debe explicar el “por qué” mientras la animación muestra el “cómo”.

---

## Guion sugerido de voz — versión completa 90 s

> Cada semestre, la Feria de Servicio Social concentra cientos de registros, listas, firmas y validaciones manuales.  
>  
> Lo que antes se perdía entre papeles, filas y tiempos de espera, ahora puede convertirse en un flujo digital.  
>  
> Con Feria Servicio Social, el alumno escanea el QR del stand, inicia sesión con su cuenta institucional y completa su perfil en segundos.  
>  
> El sistema genera un QR personal y seguro, listo para usarse durante el evento.  
>  
> En cada empresa, el registro ocurre con un escaneo. Sin listas físicas. Sin captura manual. Sin perder trazabilidad.  
>  
> Cada inscripción se convierte en información en tiempo real para el coordinador: cupos disponibles, empresas activas, accesos, proyectos e inscripciones al momento.  
>  
> Detrás del sistema hay validación institucional, códigos temporales y una arquitectura preparada para operar con cientos de estudiantes.  
>  
> El resultado: cero papel, registros en segundos y control total del evento.  
>  
> Feria Servicio Social.  
> Digitaliza la experiencia de tu evento.

---

## Guion segmentado por escena

### Escena 1 — Caos en papel

**Tiempo:** 0–12 s

Voz:

> Cada semestre, la Feria de Servicio Social concentra cientos de registros, listas, firmas y validaciones manuales.

Texto en pantalla:

```text
Cada semestre.
Miles de formularios.
En papel.
```

Dato visual:

```text
547 formularios
```

---

### Escena 2 — Nace la solución

**Tiempo:** 12–18 s

Voz:

> Lo que antes se perdía entre papeles, filas y tiempos de espera, ahora puede convertirse en un flujo digital.

Texto en pantalla:

```text
Hay una mejor manera.
```

Acción visual:

La línea azul limpia el caos, revela espacio y abre el primer QR.

---

### Escena 3 — Estudiante

**Tiempo:** 18–36 s

Voz:

> Con Feria Servicio Social, el alumno escanea el QR del stand, inicia sesión con su cuenta institucional y completa su perfil en segundos.

Texto en pantalla:

```text
Escanea.
Valida tu cuenta.
Completa tu perfil.
```

Acciones visuales:

- QR del stand.
- Scanner azul.
- Login `@tec.mx`.
- Campo validado.
- Perfil completado.
- Botón guardar.
- QR personal generado.

---

### Escena 4 — Empresa

**Tiempo:** 36–50 s

Voz:

> El sistema genera un QR personal y seguro, listo para usarse durante el evento. En cada empresa, el registro ocurre con un escaneo.

Texto en pantalla:

```text
QR personal.
Registro en 2.3 s.
```

Acciones visuales:

- QR personal sale del teléfono del alumno.
- Viaja como pulso azul.
- Entra al visor del scanner de empresa.
- Aparece check verde.
- Registro confirmado.

---

### Escena 5 — Evento vivo

**Tiempo:** 50–65 s

Voz:

> Sin listas físicas. Sin captura manual. Sin perder trazabilidad.

Texto en pantalla:

```text
Cada escaneo se convierte en dato.
```

Acciones visuales:

- Mapa abstracto de la feria.
- Stands como nodos.
- Estudiantes como puntos.
- Pulsos de inscripción viajando al dashboard.
- Contadores subiendo.

Dato:

```text
260 inscritos en 10 min
vs
18 manuales
```

Importante: mostrar el dato como consecuencia del sistema, no como banner aislado.

---

### Escena 6 — Centro de control

**Tiempo:** 65–78 s

Voz:

> Cada inscripción se convierte en información en tiempo real para el coordinador: cupos disponibles, empresas activas, accesos, proyectos e inscripciones al momento.

Texto en pantalla:

```text
Control en tiempo real.
```

Acciones visuales:

Mostrar dashboard vivo, no carrusel.

Debe incluir:

- estado del evento;
- cupos por empresa;
- feed de inscripciones;
- empresas activas;
- acción de preregistro;
- activación del evento;
- carga CSV;
- credenciales.

Todo debe sentirse conectado al evento vivo.

---

### Escena 7 — Confianza técnica e impacto

**Tiempo:** 78–86 s

Voz:

> Detrás del sistema hay validación institucional, códigos temporales y una arquitectura preparada para operar con cientos de estudiantes.

Texto en pantalla:

```text
Seguro.
Rápido.
Escalable.
```

Apoyos visuales:

- `OAuth 2.0` asociado a acceso institucional.
- `TOTP` asociado a QR temporal.
- `PostgreSQL / Redis` asociado a datos en tiempo real.
- `Docker / AWS` asociado a operación productiva.

No mostrarlo como lista de logos.  
Mostrarlo como garantías.

---

### Escena 8 — Cierre

**Tiempo:** 86–90 s

Voz:

> Feria Servicio Social. Digitaliza la experiencia de tu evento.

Texto en pantalla:

```text
Feria Servicio Social
Del papel al control total del evento.
feriaserviciosocial.com
```

Stats discretas:

```text
+500 inscripciones · 0 papeles · 2.3 s por registro
```

---

# 11. Diseño de escenas detallado

---

## Escena 1 — Caos en papel

### Objetivo

Establecer problema y saturación.

### Mantener de la versión actual

- Vista cenital.
- Papeles cayendo.
- Contador 0 → 547.
- Texto enterrado por papeles.
- Barrido/sweep de salida.
- Frase “Hay una mejor manera.”

### Mejorar

- La línea azul debe aparecer entre los papeles antes del sweep.
- La línea debe intentar abrirse paso, como si el sistema estuviera naciendo dentro del caos.
- El sweep no debe sentirse como “explosión decorativa”, sino como transformación: el papel se convierte en trazos, datos o partículas.

### Visual deseado

El suelo se cubre de papeles.  
Todo se vuelve ilegible.  
Aparece un pequeño pulso azul debajo del papel.  
El pulso crece en forma de línea.  
La línea corta la escena.  
Los papeles se apartan.  
Aparece:

```text
Hay una mejor manera.
```

---

## Escena 2 — Transición a flujo digital

### Objetivo

Convertir el caos en el primer punto digital: QR del stand.

### Implementación visual

- La frase “Hay una mejor manera” debe ser subrayada por la línea azul.
- El subrayado se extiende hacia la derecha.
- La cámara sigue la línea.
- La línea dibuja un marco.
- El marco se convierte en el QR del stand.

### Técnica

- SVG path animation.
- Mask reveal.
- Camera pan.
- Glow azul.
- Transformación de línea a grid QR.

---

## Escena 3 — Estudiante

### Objetivo

Mostrar el flujo completo sin que parezca tutorial.

### Enfoque

No mostrar cada paso como pantalla estática.  
Mostrarlos como una secuencia conectada por la línea.

### Acciones

1. QR del stand se construye.
2. Teléfono lo escanea.
3. Scanner azul baja.
4. Check de acceso válido.
5. QR se expande a login.
6. Se escribe `A01659057@tec.mx`.
7. `@tec.mx` se ilumina.
8. Botón “Siguiente” se activa.
9. Interfaz se desplaza a perfil.
10. Campos se llenan con microtyping.
11. Botón “Guardar” se activa.
12. Formulario se compacta y se convierte en QR personal.

### Texto en pantalla

Usar máximo 3 bloques:

```text
Escanea el QR del stand.
Solo cuentas @tec.mx.
Tu acceso queda listo.
```

### Dirección

Debe sentirse rápido, fluido y seguro.

---

## Escena 4 — Empresa

### Objetivo

Mostrar que la empresa registra al alumno en segundos.

### Problema actual

La comparación manual vs digital puede sentirse demasiado explicativa si se mantiene mucho tiempo.

### Nueva dirección

La comparación debe emerger como contraste dinámico.

### Acciones

1. QR personal sale del teléfono del alumno.
2. El QR se convierte en pulso azul.
3. Pulso viaja a scanner de empresa.
4. Scanner detecta QR.
5. Check verde.
6. Aparece tarjeta de alumno inscrito.
7. Al lado aparece proceso manual ralentizado en papel.
8. La diferencia de velocidad se expresa con contadores.

### Visual

Lado digital:

```text
2.3 s
Inscrito
```

Lado manual:

```text
3 min
Lista · Firma · Verificación
```

Pero el lado manual debe ser más pequeño, más pesado y con menor energía visual.  
No darle el mismo protagonismo que al flujo digital.

### Dato final

```text
260 inscritos en 10 min
14× más rápido
18 manuales
```

El dato debe aparecer como resultado del escaneo acumulado.

---

## Escena 5 — Evento vivo

### Objetivo

Esta es una escena clave nueva.  
Debe convertir registros individuales en sistema completo.

### Visual central

Un mapa abstracto de la feria:

- stands como nodos;
- estudiantes como puntos pequeños;
- líneas/pulsos azules viajando;
- cada pulso representa un escaneo;
- cada nodo se ilumina al recibir alumnos;
- un dashboard empieza a capturar esos eventos.

### Elementos

- Nodos de empresas.
- Puntos de estudiantes.
- Pulsos azules.
- Feed de eventos.
- Contador global.
- Capacidad de cupos.
- Tiempo promedio.

### Texto

```text
Cada escaneo se convierte en dato.
```

### Movimiento

- Cámara hace zoom out desde un escaneo individual al mapa completo.
- Pulsos se multiplican.
- Dashboard entra desde un lateral o se revela sobre el mapa.
- Los datos empiezan a ordenarse.

---

## Escena 6 — Centro de control administrativo

### Objetivo

Reemplazar el carrusel de 6 tarjetas por un dashboard vivo.

### Problema a evitar

No debe parecer PowerPoint.  
No mostrar una tarjeta por función durante mucho tiempo.

### Nueva estructura de UI

Crear un panel central tipo “command center”.

Debe incluir:

1. Header:
   - Feria Servicio Social
   - Estado: Evento activo
   - Hora / fecha
   - indicador online

2. Columna izquierda:
   - Empresas activas
   - proyectos disponibles
   - carga CSV completada

3. Centro:
   - Feed de inscripciones en vivo
   - estudiante inscrito
   - empresa asignada
   - timestamp

4. Columna derecha:
   - Cupos por proyecto
   - barras de disponibilidad
   - alertas de cupo bajo

5. Barra inferior:
   - acciones rápidas:
     - cerrar preregistro;
     - iniciar evento;
     - habilitar QR;
     - gestionar credenciales.

### Cómo mostrar las 6 funciones actuales

No eliminarlas.  
Integrarlas dentro del dashboard:

| Función actual | Nueva representación |
|---|---|
| Pre-registro | Toggle/botón “Preregistro cerrado” con lock. |
| Iniciar Evento · Habilitar QR | Botón principal que activa pulsos del mapa. |
| Gestión de Proyectos | Barras de cupo por empresa/proyecto. |
| Empresas + Carga CSV | CSV que se transforma en empresas activas. |
| Inscripciones en Vivo | Feed central en tiempo real. |
| Credenciales de Empresa | Panel pequeño de usuarios/llaves. |

### Texto

```text
Control en tiempo real.
```

### Movimiento

- Dashboard no debe estar estático.
- Feed debe actualizarse.
- Barras deben animarse.
- Nodos deben parpadear.
- El mapa debe seguir enviando pulsos.
- Cámara debe moverse suavemente entre módulos.

---

## Escena 7 — Confianza técnica

### Objetivo

Mostrar stack sin romper la narrativa.

### Regla

No hacer una escena de “logos de tecnologías”.

La tecnología debe explicarse como garantías.

### Estructura visual

Cuatro bloques conectados por la línea azul:

```text
Acceso institucional
QR temporal
Datos en tiempo real
Operación en producción
```

### Relación con tecnologías

| Garantía | Mostrar como | Tecnología secundaria |
|---|---|---|
| Acceso institucional | Escudo `@tec.mx` | OAuth 2.0 / Google |
| QR temporal | QR con cuenta regresiva 30s | TOTP RFC6238 |
| Datos en tiempo real | Pulsos entrando a base de datos | Redis / PostgreSQL |
| Operación productiva | Nube y contenedores | Docker / AWS EC2 |

### Texto principal

```text
Seguro.
Rápido.
Escalable.
```

### Texto secundario

Los nombres técnicos pueden aparecer en chips pequeños, no como titulares.

---

## Escena 8 — Cierre

### Objetivo

Cerrar con una idea memorable.

### Visual

- Los datos del dashboard se ordenan.
- Los pulsos azules forman una retícula.
- La retícula se transforma en un QR abstracto.
- El QR se disuelve en el nombre del sistema.
- La línea azul subraya el título.
- Aparece URL.

### Texto

```text
Feria Servicio Social
Del papel al control total del evento.
feriaserviciosocial.com
```

### Stats discretas

```text
+500 inscripciones · 0 papeles · 2.3 s por registro
```

### No incluir

- No incluir chips técnicos en el cierre.
- No saturar de datos.
- No meter demasiados elementos institucionales.

---

# 12. Guía de ritmo

## Pacing general

El video debe alternar momentos de:

- tensión;
- claridad;
- aceleración;
- control;
- cierre.

## Ritmo sugerido

| Segmento | Ritmo |
|---|---|
| Caos papel | Creciente, saturado. |
| Línea aparece | Pausa dramática. |
| Estudiante | Ágil, fluido. |
| Empresa | Preciso, rápido. |
| Evento vivo | Expansivo. |
| Dashboard | Controlado, inteligente. |
| Confianza técnica | Breve, contundente. |
| Cierre | Elegante, respirado. |

---

# 13. Implementación de voz

## Reglas técnicas

- La voz debe incorporarse como archivo de audio.
- Usar `Audio` de Remotion.
- Sincronizar animaciones clave con timestamps de la narración.
- Mantener música o ambiente debajo de la voz a volumen bajo.
- Evitar que los efectos sonoros compitan con la voz.

## Sugerencia de mezcla

| Elemento | Volumen relativo |
|---|---:|
| Voz | 100% |
| Música de fondo | 12%–22% |
| SFX de escaneo | 20%–35% |
| SFX de click/check | 18%–30% |
| Whooshes de transición | 15%–25% |

## SFX sugeridos

- Papel cayendo / shuffle sutil.
- Pulso digital.
- Scanner beep suave.
- Click de botón.
- Check confirmation.
- Data ticks.
- Whoosh suave de línea.
- Ambience tech muy discreto.

No usar sonidos caricaturescos.

---

# 14. Guion visual + voz por tiempo

## 0–12 s

Voz:

> Cada semestre, la Feria de Servicio Social concentra cientos de registros, listas, firmas y validaciones manuales.

Visual:

- Papeles caen.
- Contador 547.
- Texto se tapa.
- Caos.

Texto:

```text
Cada semestre.
Miles de formularios.
En papel.
```

---

## 12–18 s

Voz:

> Lo que antes se perdía entre papeles, filas y tiempos de espera, ahora puede convertirse en un flujo digital.

Visual:

- Pulso azul bajo papeles.
- Línea limpia escena.
- Aparece “Hay una mejor manera.”
- Línea se transforma en QR.

Texto:

```text
Hay una mejor manera.
```

---

## 18–36 s

Voz:

> Con Feria Servicio Social, el alumno escanea el QR del stand, inicia sesión con su cuenta institucional y completa su perfil en segundos.

Visual:

- QR stand.
- Teléfono.
- Login.
- Email institucional.
- Perfil.
- QR personal.

Texto:

```text
Escanea.
Valida.
Accede.
```

---

## 36–50 s

Voz:

> El sistema genera un QR personal y seguro, listo para usarse durante el evento. En cada empresa, el registro ocurre con un escaneo.

Visual:

- QR personal viaja.
- Empresa escanea.
- Check verde.
- Registro aparece.

Texto:

```text
Registro en 2.3 s.
```

---

## 50–65 s

Voz:

> Sin listas físicas. Sin captura manual. Sin perder trazabilidad.

Visual:

- Escaneos multiplicándose.
- Mapa de feria.
- Pulsos hacia dashboard.
- Conteo 260 vs 18.

Texto:

```text
Cada escaneo se convierte en dato.
```

---

## 65–78 s

Voz:

> Cada inscripción se convierte en información en tiempo real para el coordinador: cupos disponibles, empresas activas, accesos, proyectos e inscripciones al momento.

Visual:

- Dashboard vivo.
- Feed.
- Cupos.
- Empresas.
- Activación evento.
- Carga CSV.
- Credenciales.

Texto:

```text
Control en tiempo real.
```

---

## 78–86 s

Voz:

> Detrás del sistema hay validación institucional, códigos temporales y una arquitectura preparada para operar con cientos de estudiantes.

Visual:

- Garantías técnicas.
- Escudo @tec.mx.
- QR temporal.
- DB en tiempo real.
- Nube/contenedores.

Texto:

```text
Seguro.
Rápido.
Escalable.
```

---

## 86–90 s

Voz:

> Feria Servicio Social. Digitaliza la experiencia de tu evento.

Visual:

- Datos forman retícula.
- Retícula forma título.
- Línea azul subraya.
- URL.

Texto:

```text
Feria Servicio Social
Del papel al control total del evento.
feriaserviciosocial.com
```

---

# 15. Reglas de composición

## Jerarquía

En cada escena debe existir:

1. Un elemento protagonista.
2. Un mensaje principal.
3. Un apoyo visual.
4. Una acción de la línea azul.

Si hay más de un protagonista, la escena debe simplificarse.

---

## Espacio

No saturar todo con UI.

Usar respiración visual:

- márgenes amplios;
- fondos limpios;
- texto grande;
- información secundaria pequeña;
- detalles técnicos discretos.

---

## Dirección de mirada

La línea azul debe guiar el ojo.

La mirada debe moverse de forma intencional:

```text
izquierda → centro → derecha
cerca → lejos
problema → solución
acción → dato
dato → control
```

---

# 16. Reglas para evitar que se sienta estático

La IA debe revisar que cada escena tenga:

- movimiento de cámara;
- movimiento interno;
- microinteracciones;
- entrada/salida con propósito;
- continuidad con la escena anterior;
- una transformación visual clara.

Si una escena solo muestra una tarjeta quieta con texto, debe rediseñarse.

---

# 17. Componentes recomendados

Crear o adaptar componentes como:

## `DigitalGuideLine`

Uso:

- paths SVG;
- scanner;
- subrayado;
- transición;
- conexión de nodos;
- pulso hacia dashboard.

Props sugeridas:

```text
path
progress
glow
pulse
strokeWidth
mode: "draw" | "scan" | "connect" | "underline" | "transition"
```

---

## `CameraMove`

Uso:

- pan;
- zoom;
- parallax;
- push-in;
- zoom-out reveal.

Props sugeridas:

```text
frame
startFrame
endFrame
fromScale
toScale
fromX
toX
fromY
toY
children
```

---

## `EventMap`

Uso:

- mapa abstracto de feria;
- nodos de empresas;
- puntos de estudiantes;
- pulsos de escaneo;
- conexión con dashboard.

---

## `LiveDashboard`

Uso:

- reemplazar carrusel admin;
- mostrar dashboard vivo;
- feed en tiempo real;
- cupos;
- acciones;
- credenciales;
- estado de evento.

---

## `MetricReveal`

Uso:

- 0 papel;
- 2.3 s;
- +500 inscritos;
- 14× más rápido;
- 260 vs 18.

---

## `VoiceCaption`

Uso:

- mostrar palabras clave sincronizadas con voz;
- no subtitular todo;
- resaltar solo conceptos importantes.

Ejemplo:

```text
PAPEL → QR → DATO → CONTROL
```

---

# 18. Reglas sobre subtítulos y kinetic typography

No usar subtítulos tradicionales en todo el video.

Usar palabras clave sincronizadas con la voz.

Ejemplos:

- “papeles”
- “filas”
- “validaciones”
- “flujo digital”
- “cuenta institucional”
- “registro en segundos”
- “tiempo real”
- “control total”

Cada palabra clave puede aparecer con:

- fade + rise;
- scale suave;
- subrayado azul;
- máscara;
- entrada por línea guía.

---

# 19. Métricas que deben conservarse

Mantener estos datos:

```text
547 formularios
2.3 s por inscripción
3 min proceso manual
260 inscritos en 10 min
18 inscritos manuales en 10 min
14× más rápido
+500 inscripciones
0 papeles
QR se regenera cada 30 s
```

Usarlos con moderación.

No mostrarlos todos al mismo tiempo.

---

# 20. Mensajes clave

El video debe dejar claras estas ideas:

1. El proceso actual en papel es lento y difícil de controlar.
2. El alumno se registra de forma simple usando QR y cuenta institucional.
3. La empresa registra al alumno con un escaneo.
4. El coordinador ve el evento en tiempo real.
5. El sistema es seguro y escalable.
6. El resultado es menos papel, menos filas y más control.

---

# 21. Frases recomendadas para pantalla

Usar estas frases como base:

```text
Cada semestre.
Miles de formularios.
En papel.

Hay una mejor manera.

Escanea el QR.
Valida tu cuenta @tec.mx.
Completa tu perfil.
Tu QR queda listo.

Registro en 2.3 s.
Sin listas físicas.
Sin captura manual.

Cada escaneo se convierte en dato.

Control en tiempo real.

Seguro.
Rápido.
Escalable.

Del papel al control total del evento.
```

---

# 22. Frases que conviene evitar

Evitar frases demasiado largas o técnicas en pantalla:

```text
Sistema integral de gestión digital para eventos de servicio social
Autenticación mediante OAuth 2.0 y generación de tokens TOTP
Módulo administrativo con gestión de proyectos y credenciales
```

Esas ideas pueden existir visualmente o en chips pequeños, pero no como titulares.

---

# 23. Transiciones

## Transición actual

La transición actual con banda oscura y líneas azules puede mantenerse, pero debe usarse menos como “cortinilla” y más como transformación.

## Nueva regla

Cada transición debe responder a una pregunta:

```text
¿Qué se transformó?
```

Ejemplos:

- papel se transforma en QR;
- QR se transforma en login;
- formulario se transforma en QR personal;
- QR escaneado se transforma en dato;
- datos se transforman en dashboard;
- dashboard se transforma en métricas;
- métricas se transforman en cierre.

---

# 24. Escena admin — instrucción crítica

La escena admin es una prioridad de rediseño.

No mantener el carrusel de 6 cards como eje principal.

El carrusel puede reutilizarse parcialmente como detalles internos, pero la escena debe ser un **dashboard vivo**.

Debe sentirse como:

> “El coordinador está viendo el evento en tiempo real.”

No como:

> “Estas son seis funciones del software.”

---

# 25. Escena tech stack — instrucción crítica

No hacer una escena de stack técnico como protagonista.

Convertirlo a una escena de confianza.

Mostrar tecnología solo como soporte visual.

Orden de prioridad:

1. Seguridad institucional.
2. QR temporal.
3. Datos en tiempo real.
4. Escalabilidad.
5. Tecnologías específicas.

---

# 26. Cierre — instrucción crítica

El cierre debe ser simple, elegante y memorable.

No sobrecargarlo con chips técnicos.

Usar:

```text
Feria Servicio Social
Del papel al control total del evento.
feriaserviciosocial.com
```

Opcional, muy discreto:

```text
+500 inscripciones · 0 papeles · 2.3 s por registro
```

---

# 27. Checklist de calidad

Antes de considerar finalizado el rediseño, validar:

## Narrativa

- [ ] ¿El video cuenta una transformación, no solo funciones?
- [ ] ¿La historia avanza de papel a control en tiempo real?
- [ ] ¿Las últimas escenas tienen desarrollo y no solo información?
- [ ] ¿El cierre resume la promesa?

## Visual

- [ ] ¿La línea azul aparece como hilo conductor?
- [ ] ¿Hay profundidad visual?
- [ ] ¿Se usa la paleta con intención?
- [ ] ¿El dashboard se ve vivo?
- [ ] ¿Los textos son cortos y potentes?

## Movimiento

- [ ] ¿Cada escena tiene cámara o parallax?
- [ ] ¿Las transiciones son causales?
- [ ] ¿Hay microinteracciones?
- [ ] ¿Los movimientos guían la mirada?
- [ ] ¿No hay cards quietas demasiado tiempo?

## Voz

- [ ] ¿La voz guía la transformación?
- [ ] ¿No describe literalmente cada elemento?
- [ ] ¿Las palabras clave aparecen sincronizadas?
- [ ] ¿La música no tapa la voz?
- [ ] ¿Los SFX son sutiles?

## Información

- [ ] ¿Se conserva 547 formularios?
- [ ] ¿Se conserva 2.3 s?
- [ ] ¿Se conserva 260 vs 18?
- [ ] ¿Se conserva 14×?
- [ ] ¿Se conserva +500 y 0 papeles?
- [ ] ¿Se conserva QR cada 30 s?
- [ ] ¿Se conserva URL?

---

# 28. Prioridad de implementación

Si no se puede rediseñar todo al mismo tiempo, implementar en este orden:

## Prioridad 1

- Línea azul como hilo conductor.
- Transiciones causales.
- Dashboard vivo en lugar de carrusel.
- Guion de voz sincronizado.

## Prioridad 2

- Evento vivo con mapa y pulsos.
- Cámara virtual/parallax.
- Microinteracciones.
- Rediseño de tech stack como garantías.

## Prioridad 3

- Refinamiento de SFX.
- Kinetic typography.
- Texturas sutiles.
- Cierre con transformación de datos a título.

---

# 29. Resultado esperado

Al final, el video debe sentirse como:

> Un motion graphic profesional de lanzamiento de producto, con narrativa visual, dirección cinematográfica y una identidad clara.

No debe sentirse como:

> Una demo animada de pantallas.
> Una presentación con transiciones.
> Una lista de funcionalidades.
> Un tutorial de uso.

---

# 30. Resumen final para la IA

Rediseña el video usando esta idea:

```text
El papel se transforma en línea.
La línea se transforma en QR.
El QR se transforma en registro.
El registro se transforma en dato.
El dato se transforma en control.
El control se transforma en confianza.
```

La línea azul debe conectar todo.

El dashboard debe sentirse vivo.

El stack técnico debe verse como garantía.

La voz debe narrar transformación, no instrucciones.

El cierre debe ser simple y memorable.

**Dirección final:**  
**“Del papel al control total del evento.”**
