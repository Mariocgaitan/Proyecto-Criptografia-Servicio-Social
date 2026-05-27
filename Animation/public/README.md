# Audio / Voz

Coloca aquí el archivo de voz generado con IA (ElevenLabs, Google TTS, etc).

Formato recomendado: **voiceover.mp3** (90 segundos exactos)

En Root.jsx o FeriaServicioSocial.jsx agrega:
```jsx
import { Audio } from "remotion";
import { staticFile } from "remotion";

// Dentro del componente:
<Audio src={staticFile("voiceover.mp3")} />
```

Ver script completo de voz en: ../ESTRATEGIA.md → Sección 6
