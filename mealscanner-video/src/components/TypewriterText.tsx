import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type TypewriterTextProps = {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  showCursor?: boolean;
  style?: React.CSSProperties;
};

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 0.4,
  showCursor = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(
    text.length,
    Math.floor(adjustedFrame * charsPerFrame)
  );

  const displayText = text.slice(0, charsToShow);
  const isTyping = charsToShow < text.length && frame >= startFrame;

  // Cursor blink
  const cursorOpacity = interpolate(
    (frame % 16),
    [0, 8, 16],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span style={{ ...style, display: "inline" }}>
      {displayText}
      {showCursor && (
        <span
          style={{
            opacity: isTyping ? 1 : cursorOpacity,
            marginLeft: 2,
          }}
        >
          |
        </span>
      )}
    </span>
  );
};

// Animated text that reveals word by word with a slide-up effect
type AnimatedWordsProps = {
  text: string;
  startFrame?: number;
  staggerFrames?: number;
  style?: React.CSSProperties;
};

export const AnimatedWords: React.FC<AnimatedWordsProps> = ({
  text,
  startFrame = 0,
  staggerFrames = 4,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <span style={{ ...style, display: "inline-flex", flexWrap: "wrap", gap: "0.3em" }}>
      {words.map((word, i) => {
        const wordStart = startFrame + i * staggerFrames;
        const progress = interpolate(
          frame,
          [wordStart, wordStart + 10],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const y = interpolate(progress, [0, 1], [30, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const blur = interpolate(progress, [0, 1], [8, 0]);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px)`,
              opacity,
              filter: `blur(${blur}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};
