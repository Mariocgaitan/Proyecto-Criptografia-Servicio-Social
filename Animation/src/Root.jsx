import { Composition } from "remotion";
import { FeriaServicioSocial } from "./FeriaServicioSocial.jsx";

export const Root = () => {
  return (
    <Composition
      id="FeriaServicioSocial"
      component={FeriaServicioSocial}
      durationInFrames={3000}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
