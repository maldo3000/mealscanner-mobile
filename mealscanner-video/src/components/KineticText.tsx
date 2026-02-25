import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { brand, fonts } from "../brand";

// Animated text that explodes in letter by letter with spring physics
type ExplodeTextProps = {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
};

export const ExplodeText: React.FC<ExplodeTextProps> = ({
  text,
  startFrame = 0,
  staggerFrames = 2,
  fontSize = 72,
  color = brand.bone,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split("");

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        justifyContent: "center",
        fontFamily: fonts.heading,
        fontSize,
        fontWeight: 800,
        color,
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {chars.map((char, i) => {
        const charStart = startFrame + i * staggerFrames;

        const progress = spring({
          frame: frame - charStart,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const scale = interpolate(progress, [0, 1], [0, 1]);
        const y = interpolate(progress, [0, 1], [80, 0]);
        const rotate = interpolate(progress, [0, 1], [15, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px) scale(${scale}) rotate(${rotate}deg)`,
              opacity,
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </span>
  );
};

// Kinetic text that slides and scales dramatically
type KineticSlideProps = {
  text: string;
  startFrame?: number;
  direction?: "left" | "right" | "up" | "down";
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
};

export const KineticSlide: React.FC<KineticSlideProps> = ({
  text,
  startFrame = 0,
  direction = "left",
  fontSize = 64,
  color = brand.bone,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const getTransform = () => {
    const distance = 200;
    switch (direction) {
      case "left":
        return `translateX(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
      case "right":
        return `translateX(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case "up":
        return `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`;
      case "down":
        return `translateY(${interpolate(progress, [0, 1], [-distance, 0])}px)`;
    }
  };

  const scale = interpolate(progress, [0, 0.5, 1], [0.5, 1.1, 1]);
  const opacity = interpolate(progress, [0, 0.2], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        transform: `${getTransform()} scale(${scale})`,
        opacity,
        fontFamily: fonts.heading,
        fontSize,
        fontWeight: 800,
        color,
        letterSpacing: "-0.02em",
        textAlign: "center",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// Bouncing text for nutrition values
type BounceValueProps = {
  value: string;
  label: string;
  startFrame?: number;
  color?: string;
  size?: "small" | "medium" | "large";
};

export const BounceValue: React.FC<BounceValueProps> = ({
  value,
  label,
  startFrame = 0,
  color = brand.matcha,
  size = "medium",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bounce = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 8, stiffness: 120 },
  });

  const scale = interpolate(bounce, [0, 1], [0, 1]);
  const y = interpolate(bounce, [0, 1], [60, 0]);
  const opacity = interpolate(bounce, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

  const fontSize = size === "large" ? 56 : size === "medium" ? 40 : 28;
  const labelSize = size === "large" ? 18 : size === "medium" ? 14 : 11;

  // Continuous subtle pulse
  const pulse = 1 + Math.sin(frame * 0.08) * 0.03;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        transform: `translateY(${y}px) scale(${scale * pulse})`,
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 800,
          color,
          textShadow: `0 0 30px ${color}40`,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: fonts.body,
          fontSize: labelSize,
          fontWeight: 600,
          color: brand.sage,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};

// Split text that animates in two halves
type SplitRevealProps = {
  topText: string;
  bottomText: string;
  startFrame?: number;
  fontSize?: number;
};

export const SplitReveal: React.FC<SplitRevealProps> = ({
  topText,
  bottomText,
  startFrame = 0,
  fontSize = 56,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topProgress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const bottomProgress = spring({
    frame: frame - startFrame - 8,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const topY = interpolate(topProgress, [0, 1], [-100, 0]);
  const bottomY = interpolate(bottomProgress, [0, 1], [100, 0]);
  const topOpacity = interpolate(topProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const bottomOpacity = interpolate(bottomProgress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          transform: `translateY(${topY}px)`,
          opacity: topOpacity,
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 800,
          color: brand.bone,
          letterSpacing: "-0.02em",
        }}
      >
        {topText}
      </div>
      <div
        style={{
          transform: `translateY(${bottomY}px)`,
          opacity: bottomOpacity,
          fontFamily: fonts.heading,
          fontSize: fontSize * 1.2,
          fontWeight: 800,
          color: brand.matcha,
          letterSpacing: "-0.02em",
          textShadow: `0 0 40px ${brand.matcha}40`,
        }}
      >
        {bottomText}
      </div>
    </div>
  );
};

// Glitch/distort text effect
type GlitchTextProps = {
  text: string;
  startFrame?: number;
  fontSize?: number;
  active?: boolean;
};

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  startFrame = 0,
  fontSize = 64,
  active = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);

  // Glitch offsets
  const glitchActive = active && frame % 30 < 3;
  const glitchX = glitchActive ? (Math.random() - 0.5) * 10 : 0;
  const glitchY = glitchActive ? (Math.random() - 0.5) * 5 : 0;

  return (
    <div
      style={{
        position: "relative",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Glitch layers */}
      {glitchActive && (
        <>
          <span
            style={{
              position: "absolute",
              fontFamily: fonts.heading,
              fontSize,
              fontWeight: 800,
              color: brand.accentSky,
              letterSpacing: "-0.02em",
              transform: `translate(${glitchX - 3}px, ${glitchY}px)`,
              opacity: 0.8,
              mixBlendMode: "screen",
            }}
          >
            {text}
          </span>
          <span
            style={{
              position: "absolute",
              fontFamily: fonts.heading,
              fontSize,
              fontWeight: 800,
              color: brand.accentCoral,
              letterSpacing: "-0.02em",
              transform: `translate(${glitchX + 3}px, ${glitchY}px)`,
              opacity: 0.8,
              mixBlendMode: "screen",
            }}
          >
            {text}
          </span>
        </>
      )}
      <span
        style={{
          fontFamily: fonts.heading,
          fontSize,
          fontWeight: 800,
          color: brand.bone,
          letterSpacing: "-0.02em",
          position: "relative",
        }}
      >
        {text}
      </span>
    </div>
  );
};

// Counter animation for numbers
type CounterProps = {
  from: number;
  to: number;
  startFrame?: number;
  durationFrames?: number;
  suffix?: string;
  prefix?: string;
  fontSize?: number;
  color?: string;
  decimals?: number;
};

export const Counter: React.FC<CounterProps> = ({
  from,
  to,
  startFrame = 0,
  durationFrames = 30,
  suffix = "",
  prefix = "",
  fontSize = 72,
  color = brand.matcha,
  decimals = 0,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame - startFrame,
    [0, durationFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const value = interpolate(progress, [0, 1], [from, to]);
  const displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value);

  const scale = interpolate(
    frame - startFrame,
    [0, durationFrames * 0.1, durationFrames],
    [0.5, 1.1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = interpolate(
    frame - startFrame,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span
      style={{
        fontFamily: fonts.heading,
        fontSize,
        fontWeight: 800,
        color,
        transform: `scale(${scale})`,
        opacity,
        display: "inline-block",
        textShadow: `0 0 40px ${color}40`,
      }}
    >
      {prefix}{displayValue}{suffix}
    </span>
  );
};
