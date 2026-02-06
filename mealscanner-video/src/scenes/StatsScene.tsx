import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { brand } from "../brand";

type StatProps = {
  value: string;
  label: string;
  color: string;
};

const stats: StatProps[] = [
  { value: "500+", label: "Calories Saved Daily", color: brand.matcha },
  { value: "10K+", label: "Meals Analyzed", color: brand.accentSky },
  { value: "98%", label: "Accuracy Rate", color: brand.accentYellow },
];

const StatItem: React.FC<{ stat: StatProps; index: number }> = ({
  stat,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 10;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Counter animation for numbers
  const numberProgress = interpolate(
    frame - delay,
    [0, 40],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 80,
          fontWeight: 800,
          color: stat.color,
          letterSpacing: "-0.03em",
          textShadow: `0 0 60px ${stat.color}60`,
        }}
      >
        {stat.value}
      </div>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 24,
          color: brand.sage,
          marginTop: 8,
        }}
      >
        {stat.label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background animation
  const bgRotation = interpolate(frame, [0, 300], [0, 360]);

  return (
    <AbsoluteFill
      style={{
        background: brand.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          background: `conic-gradient(from ${bgRotation}deg, ${brand.matcha}10, ${brand.accentSky}10, ${brand.accentLavender}10, ${brand.matcha}10)`,
          borderRadius: "50%",
          filter: "blur(100px)",
        }}
      />

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          gap: 120,
          position: "relative",
          zIndex: 1,
        }}
      >
        {stats.map((stat, index) => (
          <StatItem key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
