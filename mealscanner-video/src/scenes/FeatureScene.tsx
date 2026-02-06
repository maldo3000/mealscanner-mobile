import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import { brand } from "../brand";

type FeatureProps = {
  icon: string;
  title: string;
  description: string;
};

const features: FeatureProps[] = [
  {
    icon: "📸",
    title: "Snap a Photo",
    description: "Take a picture of any meal",
  },
  {
    icon: "🤖",
    title: "AI Analysis",
    description: "Instant nutrition breakdown",
  },
  {
    icon: "📊",
    title: "Track Progress",
    description: "Achieve your health goals",
  },
];

const FeatureCard: React.FC<{ feature: FeatureProps; index: number }> = ({
  feature,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delay = index * 8;

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const opacity = interpolate(
    frame - delay,
    [0, 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const y = interpolate(
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 200 },
    }),
    [0, 1],
    [60, 0]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 40,
        background: `linear-gradient(135deg, ${brand.surface2}ee, ${brand.surface1}dd)`,
        borderRadius: 24,
        border: `1px solid ${brand.border}`,
        width: 280,
        opacity,
        transform: `scale(${scale}) translateY(${y}px)`,
        boxShadow: `0 20px 60px ${brand.ink}80`,
      }}
    >
      <div
        style={{
          fontSize: 64,
          marginBottom: 20,
        }}
      >
        {feature.icon}
      </div>
      <h3
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: brand.bone,
          margin: 0,
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        {feature.title}
      </h3>
      <p
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 18,
          color: brand.sage,
          margin: 0,
          textAlign: "center",
        }}
      >
        {feature.description}
      </p>
    </div>
  );
};

export const FeatureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleOpacity = interpolate(
    frame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleY = interpolate(
    spring({
      frame,
      fps,
      config: { damping: 200 },
    }),
    [0, 1],
    [-40, 0]
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${brand.ink} 0%, ${brand.inkAlt} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      {/* Section title */}
      <h2
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 56,
          fontWeight: 800,
          color: brand.matcha,
          margin: 0,
          marginBottom: 60,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          letterSpacing: "-0.02em",
        }}
      >
        How It Works
      </h2>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          gap: 40,
          justifyContent: "center",
        }}
      >
        {features.map((feature, index) => (
          <FeatureCard key={feature.title} feature={feature} index={index} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
