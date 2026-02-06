import { useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { IntroScene } from "./scenes/IntroScene";
import { AppShowcaseScene } from "./scenes/AppShowcaseScene";
import { CTAScene } from "./scenes/CTAScene";

export const MealScannerPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      {/* Scene 1: Intro with logo */}
      <TransitionSeries.Sequence durationInFrames={Math.round(2.5 * fps)}>
        <IntroScene />
      </TransitionSeries.Sequence>

      {/* Smooth fade with spring timing for organic feel */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: Math.round(0.6 * fps) })}
      />

      {/* Scene 2: Home Screen Showcase */}
      <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
        <AppShowcaseScene screen="home" />
      </TransitionSeries.Sequence>

      {/* Slide transition for smooth effect */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 15, stiffness: 80 }, durationInFrames: Math.round(0.5 * fps) })}
      />

      {/* Scene 3: Journal Screen Showcase */}
      <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
        <AppShowcaseScene screen="journal" />
      </TransitionSeries.Sequence>

      {/* Wipe transition for variety */}
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: Math.round(0.5 * fps) })}
      />

      {/* Scene 4: Recipes Screen Showcase */}
      <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
        <AppShowcaseScene screen="recipes" />
      </TransitionSeries.Sequence>

      {/* Slide up into all screens */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 15, stiffness: 60 }, durationInFrames: Math.round(0.6 * fps) })}
      />

      {/* Scene 5: All Screens Together */}
      <TransitionSeries.Sequence durationInFrames={Math.round(3.5 * fps)}>
        <AppShowcaseScene screen="all" />
      </TransitionSeries.Sequence>

      {/* Elegant fade to CTA */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: Math.round(0.6 * fps) })}
      />

      {/* Scene 6: CTA */}
      <TransitionSeries.Sequence durationInFrames={Math.round(5 * fps)}>
        <CTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
