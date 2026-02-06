import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { brand, fonts } from "../brand";
import { TypewriterText, AnimatedWords } from "../components/TypewriterText";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance - smooth and elegant
  const logoEnter = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 60, mass: 1 },
  });

  const logoScale = interpolate(logoEnter, [0, 1], [0.7, 1]);
  const logoY = interpolate(logoEnter, [0, 1], [40, 0]);

  // 3D rotation animation
  const rotateY = interpolate(
    frame,
    [0, fps * 2.5],
    [0, 8],
    { extrapolateRight: "clamp" }
  );

  const rotateX = Math.sin(frame * 0.06) * 3;

  // Logo glow pulses
  const glowPulse = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.4, 0.8]
  );

  const glowOpacity = interpolate(
    frame,
    [fps * 0.3, fps * 0.8],
    [0, glowPulse],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Floating food emojis
  const foodEmojis = ['🥗', '🍎', '🥑', '🍊', '🥕', '🍇', '🥦', '🍋'];
  const floatingEmojis = Array.from({ length: 8 }, (_, i) => {
    const emoji = foodEmojis[i % foodEmojis.length];
    const angle = (i / 8) * Math.PI * 2;
    const radius = 380 + (i % 3) * 60;
    const x = Math.cos(angle + frame * 0.008) * radius;
    const y = Math.sin(angle + frame * 0.008) * radius * 0.6;
    const rotation = Math.sin(frame * 0.02 + i) * 15;
    const scale = 0.8 + Math.sin(frame * 0.03 + i * 0.5) * 0.2;
    const opacity = interpolate(
      frame,
      [15 + i * 3, 35 + i * 3],
      [0, 0.9],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return { emoji, x, y, rotation, scale, opacity };
  });

  // Floating particles
  const particles = Array.from({ length: 12 }, (_, i) => {
    const baseAngle = (i / 12) * Math.PI * 2;
    const speed = 0.015 + (i % 3) * 0.005;
    const angle = baseAngle + frame * speed;
    const radiusBase = 280 + (i % 4) * 40;
    const radiusOscillation = Math.sin(frame * 0.03 + i) * 30;
    const radius = radiusBase + radiusOscillation;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const size = 4 + Math.sin(frame * 0.05 + i * 0.7) * 3;
    const opacity = interpolate(
      frame,
      [10 + i * 2, 25 + i * 2],
      [0, 0.3 + Math.sin(frame * 0.06 + i) * 0.15],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return { x, y, size, opacity };
  });

  // Background movement
  const bgScale = interpolate(
    frame,
    [0, fps * 2.5],
    [1.2, 1],
    { extrapolateRight: "clamp" }
  );

  const bgRotate = interpolate(
    frame,
    [0, fps * 2.5],
    [-5, 0],
    { extrapolateRight: "clamp" }
  );


  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${brand.surface2} 0%, ${brand.ink} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Animated background layer */}
      <div
        style={{
          position: "absolute",
          width: "150%",
          height: "150%",
          background: `
            radial-gradient(circle at 30% 40%, ${brand.matcha}08 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, ${brand.accentSky}06 0%, transparent 40%)
          `,
          transform: `scale(${bgScale}) rotate(${bgRotate}deg)`,
        }}
      />

      {/* Animated grid lines for depth */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage: `
            linear-gradient(${brand.matcha}05 1px, transparent 1px),
            linear-gradient(90deg, ${brand.matcha}05 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: `perspective(500px) rotateX(60deg) translateY(${-frame * 2}px)`,
          opacity: 0.4,
        }}
      />

      {/* Floating food emojis */}
      {floatingEmojis.map((item, i) => (
        <div
          key={`emoji-${i}`}
          style={{
            position: "absolute",
            left: `calc(50% + ${item.x}px)`,
            top: `calc(50% + ${item.y}px)`,
            fontSize: 36,
            opacity: item.opacity,
            transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Floating particles */}
      {particles.map((particle, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: i % 2 === 0 ? brand.matcha : brand.accentSky,
            opacity: particle.opacity,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${particle.size * 2}px ${i % 2 === 0 ? brand.matcha : brand.accentSky}`,
          }}
        />
      ))}

      {/* Logo with 3D effect and glow */}
      <div
        style={{
          position: "relative",
          transform: `
            perspective(1000px)
            translateY(${logoY}px)
            scale(${logoScale})
            rotateY(${rotateY}deg)
            rotateX(${rotateX}deg)
          `,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.matcha}40, transparent 70%)`,
            filter: "blur(60px)",
            opacity: glowOpacity,
          }}
        />

        {/* Inner sharp glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: brand.matcha,
            filter: "blur(80px)",
            opacity: glowOpacity * 0.6,
          }}
        />

        {/* Logo image */}
        <Img
          src={staticFile("mealscanner-logo.png")}
          style={{
            width: 300,
            height: 300,
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>

      {/* Tagline with typewriter effect */}
      <div
        style={{
          marginTop: 50,
          textAlign: "center",
          transform: `perspective(1000px) rotateX(${rotateX * 0.3}deg)`,
        }}
      >
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: 56,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            letterSpacing: "-0.02em",
            textShadow: `0 0 40px ${brand.matcha}40`,
          }}
        >
          <TypewriterText
            text="Snap, Analyze, Eat Smarter"
            startFrame={Math.round(fps * 0.5)}
            charsPerFrame={1.0}
            showCursor={true}
          />
        </h2>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 26,
            color: brand.sage,
            marginTop: 20,
          }}
        >
          <AnimatedWords
            text="AI-Powered Meal Tracking"
            startFrame={Math.round(fps * 1.0)}
            staggerFrames={3}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
