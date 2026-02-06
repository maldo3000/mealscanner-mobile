import { Composition } from "remotion";
import { MealScannerPromo } from "./MealScannerPromo";

// Video configuration
const FPS = 30;
const DURATION_SECONDS = 18; // ~18 seconds total (accounting for transitions)

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MealScannerPromo"
        component={MealScannerPromo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Vertical format for social media */}
      <Composition
        id="MealScannerPromoVertical"
        component={MealScannerPromo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* Square format for Instagram */}
      <Composition
        id="MealScannerPromoSquare"
        component={MealScannerPromo}
        durationInFrames={DURATION_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1080}
      />
    </>
  );
};
