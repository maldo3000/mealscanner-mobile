import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import { brand, fonts } from "../../brand";
import { ExplodeText, KineticSlide } from "../../components/KineticText";

export const IntroTextScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo animation
  const logoEnter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoScale = interpolate(logoEnter, [0, 1], [0.3, 1]);
  const logoRotate = interpolate(logoEnter, [0, 1], [-180, 0]);
  const logoY = interpolate(logoEnter, [0, 1], [100, 0]);

  // Continuous logo motion
  const logoFloat = Math.sin(frame * 0.05) * 8;
  const logoRotateY = Math.sin(frame * 0.03) * 5;

  // Glow pulse
  const glowPulse = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.4, 0.9]
  );

  // Background particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 2 + frame * 0.01;
    const radius = 200 + Math.sin(frame * 0.02 + i) * 50 + i * 10;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 1.5;
    const size = 3 + Math.sin(frame * 0.04 + i) * 2;
    const opacity = 0.2 + Math.sin(frame * 0.03 + i) * 0.1;
    const color = i % 3 === 0 ? brand.matcha : i % 3 === 1 ? brand.accentSky : brand.accentYellow;

    return { x, y, size, opacity, color };
  });

  // Animated grid
  const gridY = (frame * 3) % 100;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${brand.surface1} 0%, ${brand.ink} 70%)`,
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
          width: "200%",
          height: "200%",
          background: `
            radial-gradient(ellipse at 30% 20%, ${brand.matcha}15 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, ${brand.accentSky}10 0%, transparent 40%)
          `,
          transform: `rotate(${frame * 0.2}deg)`,
        }}
      />

      {/* Perspective grid */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage: `
            linear-gradient(${brand.matcha}08 1px, transparent 1px),
            linear-gradient(90deg, ${brand.matcha}08 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          transform: `perspective(400px) rotateX(70deg) translateY(${-gridY}px)`,
          opacity: 0.5,
          top: "50%",
        }}
      />

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
            background: particle.color,
            opacity: particle.opacity,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}

      {/* Logo with 3D effect - larger for vertical */}
      <div
        style={{
          transform: `
            perspective(1000px)
            translateY(${logoY + logoFloat}px)
            scale(${logoScale})
            rotateZ(${logoRotate}deg)
            rotateY(${logoRotateY}deg)
          `,
          position: "relative",
          marginBottom: 60,
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.matcha}50, transparent 70%)`,
            filter: "blur(60px)",
            opacity: glowPulse,
          }}
        />

        <Img
          src={staticFile("mealscanner-logo.png")}
          style={{
            width: 240,
            height: 240,
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>

      {/* Kinetic typography - larger for vertical */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <ExplodeText
          text="TRACK SMARTER"
          startFrame={Math.round(fps * 0.4)}
          staggerFrames={2}
          fontSize={72}
          color={brand.bone}
        />
      </div>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Sequence from={Math.round(fps * 0.8)} layout="none">
          <KineticSlide
            text="EAT BETTER"
            direction="right"
            fontSize={88}
            color={brand.matcha}
            style={{ textShadow: `0 0 80px ${brand.matcha}60` }}
          />
        </Sequence>
      </div>

      {/* Subtitle */}
      <Sequence from={Math.round(fps * 1.4)} layout="none">
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 22,
            color: brand.sage,
            textAlign: "center",
            opacity: interpolate(
              frame - fps * 1.4,
              [0, 20],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
            transform: `translateY(${interpolate(
              frame - fps * 1.4,
              [0, 20],
              [30, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            )}px)`,
          }}
        >
          AI-Powered Nutrition Tracking
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
