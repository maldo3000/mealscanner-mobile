import React from "react";
import { AbsoluteFill, useVideoConfig, Sequence } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

// Scene imports
import { IntroTextScene } from "./scenes/showcase/IntroTextScene";
import { HomeShowcaseScene } from "./scenes/showcase/HomeShowcaseScene";
import { CaptureScene } from "./scenes/showcase/CaptureScene";
import { AnalysisScene } from "./scenes/showcase/AnalysisScene";
import { RecipesShowcaseScene } from "./scenes/showcase/RecipesShowcaseScene";
import { JournalShowcaseScene } from "./scenes/showcase/JournalShowcaseScene";
import { ClosingScene } from "./scenes/showcase/ClosingScene";

export const FeatureShowcase: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      {/* Scene 1: Intro with kinetic typography */}
      <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
        <IntroTextScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: Math.round(0.5 * fps) })}
      />

      {/* Scene 2: Home screen showcase - calories at a glance */}
      <TransitionSeries.Sequence durationInFrames={Math.round(4 * fps)}>
        <HomeShowcaseScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 15, stiffness: 80 }, durationInFrames: Math.round(0.4 * fps) })}
      />

      {/* Scene 3: Camera capture - taking a picture of food */}
      <TransitionSeries.Sequence durationInFrames={Math.round(4 * fps)}>
        <CaptureScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: Math.round(0.4 * fps) })}
      />

      {/* Scene 4: Analysis screen - macro/micronutrients bouncing */}
      <TransitionSeries.Sequence durationInFrames={Math.round(5 * fps)}>
        <AnalysisScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 12, stiffness: 60 }, durationInFrames: Math.round(0.5 * fps) })}
      />

      {/* Scene 5: Recipes - meet your goals */}
      <TransitionSeries.Sequence durationInFrames={Math.round(4 * fps)}>
        <RecipesShowcaseScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={springTiming({ config: { damping: 15, stiffness: 70 }, durationInFrames: Math.round(0.4 * fps) })}
      />

      {/* Scene 6: Journal - scrolling through entries */}
      <TransitionSeries.Sequence durationInFrames={Math.round(4 * fps)}>
        <JournalShowcaseScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: Math.round(0.6 * fps) })}
      />

      {/* Scene 7: Closing - "More than an app, it's a system" */}
      <TransitionSeries.Sequence durationInFrames={Math.round(5 * fps)}>
        <ClosingScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
