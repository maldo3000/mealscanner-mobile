import { Composition } from "remotion";
import { MealScannerPromo } from "./MealScannerPromo";
import { FeatureShowcase } from "./FeatureShowcase";

// Video configuration
const FPS = 30;
const DURATION_SECONDS = 18; // ~18 seconds total (accounting for transitions)
const FEATURE_SHOWCASE_SECONDS = 29; // ~29 seconds for feature showcase

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

      {/* ===== NEW: Feature Showcase - 9:16 Vertical ===== */}
      {/* Full feature showcase with 3D iPhone 16 mockups */}
      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        durationInFrames={FEATURE_SHOWCASE_SECONDS * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* Feature Showcase - 1080p for YouTube */}
      <Composition
        id="FeatureShowcase1080p"
        component={FeatureShowcase}
        durationInFrames={FEATURE_SHOWCASE_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
