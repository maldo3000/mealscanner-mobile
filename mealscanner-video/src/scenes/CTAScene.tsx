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

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance with dramatic 3D flip
  const logoEnter = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 70 },
  });

  const logoScale = interpolate(logoEnter, [0, 1], [0.3, 1]);
  const logoRotateY = interpolate(logoEnter, [0, 1], [-180, 0]);
  const logoRotateX = interpolate(logoEnter, [0, 1], [30, 0]);

  // Continuous subtle 3D motion
  const continuousRotateY = Math.sin(frame * 0.025) * 5;
  const continuousRotateX = Math.sin(frame * 0.03) * 3;

  // Logo glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.06),
    [-1, 1],
    [0.4, 0.9]
  );

  // Text entrance
  const textEnter = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const textY = interpolate(textEnter, [0, 1], [60, 0]);
  const textOpacity = interpolate(textEnter, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Button animation with bounce
  const buttonEnter = spring({
    frame: frame - 35,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const buttonScale = interpolate(buttonEnter, [0, 1], [0.8, 1]);
  const buttonY = interpolate(buttonEnter, [0, 1], [30, 0]);
  const buttonOpacity = interpolate(buttonEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  const buttonGlow = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.5, 1]
  );

  // Shimmer across button
  const buttonShimmer = interpolate(
    frame,
    [fps * 1.5, fps * 2.5],
    [-200, 400],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Floating food emojis
  const foodEmojis = ['🥗', '🍎', '🥑', '🍊', '🥕', '🍇', '🥦', '🍋'];
  const floatingEmojis = Array.from({ length: 6 }, (_, i) => {
    const emoji = foodEmojis[i % foodEmojis.length];
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const radius = 400 + (i % 2) * 50;
    const x = Math.cos(angle + frame * 0.006) * radius;
    const y = Math.sin(angle + frame * 0.006) * radius * 0.5;
    const rotation = Math.sin(frame * 0.018 + i * 0.8) * 15;
    const scale = 0.8 + Math.sin(frame * 0.022 + i) * 0.2;
    const opacity = 0.9;

    return { emoji, x, y, rotation, scale, opacity };
  });

  // Particle ring effect
  const particles = Array.from({ length: 16 }, (_, i) => {
    const baseAngle = (i / 16) * Math.PI * 2;
    const speed = 0.02 + (i % 4) * 0.005;
    const angle = baseAngle + frame * speed;
    const radiusBase = 320 + (i % 3) * 30;
    const radiusOscillation = Math.sin(frame * 0.04 + i * 0.3) * 25;
    const radius = radiusBase + radiusOscillation;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.5; // Elliptical
    const size = 4 + Math.sin(frame * 0.06 + i * 0.5) * 3;
    const opacity = interpolate(
      frame,
      [5 + i, 20 + i],
      [0, 0.25 + Math.sin(frame * 0.05 + i) * 0.15],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return { x, y, size, opacity, color: i % 3 === 0 ? brand.matcha : i % 3 === 1 ? brand.accentSky : brand.accentYellow };
  });

  // Rising particles effect
  const risingParticles = Array.from({ length: 8 }, (_, i) => {
    const startY = 400;
    const xBase = -300 + i * 85;
    const xWobble = Math.sin(frame * 0.03 + i * 0.7) * 20;
    const yProgress = ((frame * 1.5 + i * 30) % 500) / 500;
    const y = startY - yProgress * 700;
    const opacity = interpolate(yProgress, [0, 0.1, 0.8, 1], [0, 0.3, 0.3, 0]);
    const size = 3 + Math.sin(frame * 0.05 + i) * 2;

    return { x: xBase + xWobble, y, size, opacity };
  });

  // Background movement
  const bgRotate = interpolate(frame, [0, fps * 3], [0, 10], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${brand.surface1} 0%, ${brand.ink} 80%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Animated background */}
      <div
        style={{
          position: "absolute",
          width: "180%",
          height: "180%",
          background: `
            radial-gradient(ellipse at 40% 30%, ${brand.matcha}12 0%, transparent 50%),
            radial-gradient(ellipse at 60% 70%, ${brand.accentSky}08 0%, transparent 40%),
            radial-gradient(ellipse at 30% 80%, ${brand.accentYellow}06 0%, transparent 35%)
          `,
          transform: `rotate(${bgRotate}deg)`,
        }}
      />

      {/* Grid pattern for depth */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage: `
            radial-gradient(circle at center, ${brand.matcha}08 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: `perspective(600px) rotateX(65deg) translateY(${-frame * 1.5}px)`,
          opacity: 0.3,
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

      {/* Orbital particles */}
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
            background: particle.color,
            opacity: particle.opacity,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}

      {/* Rising particles */}
      {risingParticles.map((particle, i) => (
        <div
          key={`rising-${i}`}
          style={{
            position: "absolute",
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: brand.matcha,
            opacity: particle.opacity,
            boxShadow: `0 0 ${particle.size * 3}px ${brand.matcha}`,
          }}
        />
      ))}

      {/* Logo with 3D effect */}
      <div
        style={{
          transform: `
            perspective(1000px)
            scale(${logoScale})
            rotateY(${logoRotateY + continuousRotateY}deg)
            rotateX(${logoRotateX + continuousRotateX}deg)
          `,
          transformStyle: "preserve-3d",
          marginBottom: 35,
          position: "relative",
        }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.matcha}50, transparent 70%)`,
            filter: "blur(50px)",
            opacity: glowIntensity,
          }}
        />
        <Img
          src={staticFile("mealscanner-logo.png")}
          style={{
            width: 200,
            height: 200,
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>

      {/* CTA Text with typewriter */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: fonts.heading,
            fontSize: 68,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            letterSpacing: "-0.03em",
            textShadow: `0 0 40px ${brand.matcha}30`,
          }}
        >
          <TypewriterText
            text="Start Your Journey"
            startFrame={10}
            charsPerFrame={1.0}
            showCursor={true}
          />
        </h1>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 28,
            color: brand.sage,
            marginTop: 18,
            marginBottom: 55,
          }}
        >
          <AnimatedWords
            text="Transform your nutrition with AI"
            startFrame={Math.round(fps * 0.7)}
            staggerFrames={2}
          />
        </div>
      </div>

      {/* Download Button with glow and shimmer */}
      <div
        style={{
          transform: `translateY(${buttonY}px) scale(${buttonScale})`,
          opacity: buttonOpacity,
          position: "relative",
        }}
      >
        {/* Outer glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -30,
            background: `radial-gradient(ellipse, ${brand.matcha}40, transparent 70%)`,
            borderRadius: 50,
            filter: "blur(25px)",
            opacity: buttonGlow,
          }}
        />
        {/* Button glow */}
        <div
          style={{
            position: "absolute",
            inset: -15,
            background: brand.matcha,
            borderRadius: 35,
            filter: "blur(35px)",
            opacity: buttonGlow * 0.6,
          }}
        />
        <div
          style={{
            position: "relative",
            background: `linear-gradient(135deg, ${brand.matcha}, #5fd45f, ${brand.matcha})`,
            backgroundSize: "200% 200%",
            padding: "26px 72px",
            borderRadius: 22,
            boxShadow: `
              0 10px 40px ${brand.matcha}50,
              inset 0 1px 0 rgba(255,255,255,0.2)
            `,
            overflow: "hidden",
          }}
        >
          {/* Shimmer effect */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: buttonShimmer,
              width: 80,
              height: "100%",
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
              transform: "skewX(-20deg)",
            }}
          />
          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 30,
              fontWeight: 800,
              color: brand.ink,
              position: "relative",
              zIndex: 1,
            }}
          >
            Download Free
          </span>
        </div>
      </div>

      {/* App Store badges hint */}
      <div
        style={{
          marginTop: 45,
          opacity: interpolate(frame, [fps * 1.2, fps * 1.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <AnimatedWords
          text="Available on iOS & Android"
          startFrame={Math.round(fps * 1.2)}
          staggerFrames={3}
          style={{
            fontFamily: fonts.body,
            fontSize: 20,
            color: brand.sage,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
