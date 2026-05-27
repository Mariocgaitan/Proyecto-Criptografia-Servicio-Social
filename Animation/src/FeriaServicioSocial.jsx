import { Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

import { COLORS, FONTS, SCENE_FRAMES } from "./constants.js";
import { Scene1Problema }    from "./scenes/Scene1Problema.jsx";
import { Scene2Estudiante }  from "./scenes/Scene2Estudiante.jsx";
import { Scene2Empresa }     from "./scenes/Scene2Empresa.jsx";
import { Scene2Admin }       from "./scenes/Scene2Admin.jsx";
import { Scene3UnderHood }   from "./scenes/Scene3UnderHood.jsx";
import { Scene4Cierre }      from "./scenes/Scene4Cierre.jsx";

// Carga Inter desde Google Fonts (Remotion gestiona delayRender internamente)
const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const FeriaServicioSocial = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: COLORS.bg,
        overflow: "hidden",
        position: "relative",
        fontFamily: fontFamily,
      }}
    >
      <Sequence from={SCENE_FRAMES.S1.from}  durationInFrames={SCENE_FRAMES.S1.duration}>
        <Scene1Problema />
      </Sequence>

      <Sequence from={SCENE_FRAMES.S2A.from} durationInFrames={SCENE_FRAMES.S2A.duration}>
        <Scene2Estudiante />
      </Sequence>

      <Sequence from={SCENE_FRAMES.S2B.from} durationInFrames={SCENE_FRAMES.S2B.duration}>
        <Scene2Empresa />
      </Sequence>

      <Sequence from={SCENE_FRAMES.S2C.from} durationInFrames={SCENE_FRAMES.S2C.duration}>
        <Scene2Admin />
      </Sequence>

      <Sequence from={SCENE_FRAMES.S3.from}  durationInFrames={SCENE_FRAMES.S3.duration}>
        <Scene3UnderHood />
      </Sequence>

      <Sequence from={SCENE_FRAMES.S4.from}  durationInFrames={SCENE_FRAMES.S4.duration}>
        <Scene4Cierre />
      </Sequence>
    </div>
  );
};
