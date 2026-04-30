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
import { ExplodeText, SplitReveal, GlitchText } from "../../components/KineticText";
import { TypewriterText, AnimatedWords } from "../../components/TypewriterText";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Logo animation - dramatic entrance
  const logoEnter = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 60 },
  });

  const logoScale = interpolate(logoEnter, [0, 1], [0.2, 1]);
  const logoRotateY = interpolate(logoEnter, [0, 1], [-360, 0]);
  const logoY = interpolate(logoEnter, [0, 1], [100, 0]);

  // Continuous motion
  const logoFloat = Math.sin(frame * 0.04) * 8;
  const logoRotateContinuous = Math.sin(frame * 0.02) * 5;

  // Glow pulse
  const glowPulse = interpolate(
    Math.sin(frame * 0.06),
    [-1, 1],
    [0.4, 1]
  );

  // Text animations
  const taglineStart = Math.round(fps * 0.6);
  const taglineEnter = spring({
    frame: frame - taglineStart,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Button animation
  const buttonStart = Math.round(fps * 2);
  const buttonEnter = spring({
    frame: frame - buttonStart,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const buttonScale = interpolate(buttonEnter, [0, 1], [0.8, 1]);
  const buttonY = interpolate(buttonEnter, [0, 1], [40, 0]);
  const buttonOpacity = interpolate(buttonEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

  // Button shimmer
  const shimmerX = interpolate(
    frame,
    [buttonStart + fps * 0.8, buttonStart + fps * 1.5],
    [-150, 350],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Particle explosion - larger for vertical
  const particles = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * Math.PI * 2;
    const speed = 0.012 + (i % 5) * 0.003;
    const baseRadius = 200 + (i % 4) * 60;
    const radiusProgress = interpolate(
      frame,
      [0, fps * 0.8],
      [0, 1],
      { extrapolateRight: "clamp" }
    );
    const radius = baseRadius * radiusProgress + Math.sin(frame * 0.03 + i) * 40;

    const currentAngle = angle + frame * speed;
    const x = Math.cos(currentAngle) * radius;
    const y = Math.sin(currentAngle) * radius * 1.4;
    const size = 4 + Math.sin(frame * 0.05 + i * 0.5) * 2.5;
    const opacity = interpolate(
      frame,
      [5 + i, 25 + i],
      [0, 0.3 + Math.sin(frame * 0.04 + i) * 0.1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    const colors = [brand.matcha, brand.accentSky, brand.accentYellow, brand.accentCoral];
    const color = colors[i % colors.length];

    return { x, y, size, opacity, color };
  });

  // Rising particles - wider spread for vertical
  const risingParticles = Array.from({ length: 16 }, (_, i) => {
    const xBase = -280 + i * 38;
    const xWobble = Math.sin(frame * 0.03 + i * 0.8) * 20;
    const yProgress = ((frame * 1.8 + i * 25) % 800) / 800;
    const y = 500 - yProgress * 1000;
    const opacity = interpolate(yProgress, [0, 0.1, 0.85, 1], [0, 0.35, 0.35, 0]);
    const size = 4 + Math.sin(frame * 0.04 + i) * 2;

    return { x: xBase + xWobble, y, size, opacity };
  });

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
      {/* Animated background */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          background: `
            radial-gradient(ellipse at 40% 30%, ${brand.matcha}15 0%, transparent 50%),
            radial-gradient(ellipse at 60% 70%, ${brand.accentSky}10 0%, transparent 40%),
            radial-gradient(ellipse at 30% 80%, ${brand.accentYellow}08 0%, transparent 35%)
          `,
          transform: `rotate(${frame * 0.15}deg)`,
        }}
      />

      {/* Perspective grid */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage: `
            radial-gradient(circle, ${brand.matcha}10 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: `perspective(500px) rotateX(70deg) translateY(${-frame * 2}px)`,
          opacity: 0.3,
          top: "60%",
        }}
      />

      {/* Orbital particles */}
      {particles.map((particle, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(40% + ${particle.y}px)`,
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

      {/* Logo with 3D effect - larger for vertical */}
      <div
        style={{
          transform: `
            perspective(1000px)
            translateY(${logoY + logoFloat}px)
            scale(${logoScale})
            rotateY(${logoRotateY + logoRotateContinuous}deg)
          `,
          position: "relative",
          marginBottom: 50,
        }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${brand.matcha}50, transparent 70%)`,
            filter: "blur(80px)",
            opacity: glowPulse,
          }}
        />

        {/* Inner glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: brand.matcha,
            filter: "blur(100px)",
            opacity: glowPulse * 0.5,
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

      {/* Tagline - More than an app - larger for vertical */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 24,
          opacity: interpolate(taglineEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(taglineEnter, [0, 1], [40, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 48,
            fontWeight: 800,
            color: brand.sage,
            marginBottom: 10,
            letterSpacing: "-0.01em",
          }}
        >
          Nutrition made easy
        </div>
      </div>

      {/* IT'S A SYSTEM - with explosive text - larger for vertical */}
      <Sequence from={Math.round(fps * 1.0)} layout="none">
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <ExplodeText
            text="MealScanner"
            startFrame={0}
            staggerFrames={3}
            fontSize={80}
            color={brand.matcha}
            style={{ textShadow: `0 0 80px ${brand.matcha}60` }}
          />
        </div>
      </Sequence>

      {/* Download button */}
      <div
        style={{
          transform: `translateY(${buttonY}px) scale(${buttonScale})`,
          opacity: buttonOpacity,
          position: "relative",
        }}
      >
        {/* Glow behind button */}
        <div
          style={{
            position: "absolute",
            inset: -25,
            background: `radial-gradient(ellipse, ${brand.matcha}50, transparent 70%)`,
            borderRadius: 40,
            filter: "blur(30px)",
            opacity: glowPulse * 0.7,
          }}
        />

        {/* Button - larger for vertical */}
        <div
          style={{
            position: "relative",
            background: `linear-gradient(135deg, ${brand.matcha}, #5fd45f, ${brand.matcha})`,
            backgroundSize: "200% 200%",
            padding: "28px 80px",
            borderRadius: 24,
            boxShadow: `
              0 20px 60px ${brand.matcha}50,
              inset 0 1px 0 rgba(255,255,255,0.2)
            `,
            overflow: "hidden",
          }}
        >
          {/* Shimmer */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: shimmerX,
              width: 100,
              height: "100%",
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)`,
              transform: "skewX(-20deg)",
            }}
          />

          <span
            style={{
              fontFamily: fonts.heading,
              fontSize: 32,
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

      {/* App Store hint - larger for vertical */}
      <Sequence from={Math.round(fps * 2.5)} layout="none">
        <div
          style={{
            marginTop: 40,
            opacity: interpolate(
              frame - fps * 2.5,
              [0, 20],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          <AnimatedWords
            text="Available on iOS & Android"
            startFrame={0}
            staggerFrames={3}
            style={{
              fontFamily: fonts.body,
              fontSize: 24,
              color: brand.sage,
            }}
          />
        </div>
      </Sequence>

      {/* Floating food emojis - larger and spread out for vertical */}
      {[
        { emoji: "🥗", x: -220, y: -320, delay: 10 },
        { emoji: "🍎", x: 200, y: -280, delay: 15 },
        { emoji: "🥑", x: -200, y: 320, delay: 20 },
        { emoji: "🍊", x: 220, y: 360, delay: 25 },
        { emoji: "🥕", x: -260, y: 60, delay: 18 },
        { emoji: "🍳", x: 250, y: 100, delay: 22 },
      ].map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 12, stiffness: 60 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 0.85], { extrapolateRight: "clamp" });
        const float = Math.sin(frame * 0.04 + i * 1.2) * 12;
        const rotate = Math.sin(frame * 0.03 + i) * 15;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${item.x}px)`,
              top: `calc(50% + ${item.y}px)`,
              fontSize: 56,
              opacity,
              transform: `translate(-50%, -50%) translateY(${float}px) scale(${scale}) rotate(${rotate}deg)`,
            }}
          >
            {item.emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
