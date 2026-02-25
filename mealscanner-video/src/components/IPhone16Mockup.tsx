import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { brand } from "../brand";

type PhoneMockup16Props = {
  children: React.ReactNode;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: number;
  enableAutoRotate?: boolean;
  glowColor?: string;
  glowIntensity?: number;
};

export const IPhone16Mockup: React.FC<PhoneMockup16Props> = ({
  children,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scale = 1,
  enableAutoRotate = false,
  glowColor = brand.matcha,
  glowIntensity = 0.5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // iPhone 16 Pro dimensions (scaled for video)
  const phoneWidth = 280;
  const phoneHeight = 605;
  const bezelWidth = 8;
  const cornerRadius = 44;

  // Auto rotation
  const autoRotateY = enableAutoRotate ? Math.sin(frame * 0.015) * 8 : 0;
  const autoRotateX = enableAutoRotate ? Math.sin(frame * 0.02) * 3 : 0;

  // Floating animation
  const float = Math.sin(frame * 0.04) * 6;

  // Dynamic shadow based on rotation
  const shadowX = (rotateY + autoRotateY) * 1.5;
  const shadowIntensity = 0.4 + Math.abs(rotateY + autoRotateY) * 0.01;

  return (
    <div
      style={{
        transform: `
          perspective(1200px)
          rotateX(${rotateX + autoRotateX}deg)
          rotateY(${rotateY + autoRotateY}deg)
          rotateZ(${rotateZ}deg)
          scale(${scale})
          translateY(${float}px)
        `,
        transformStyle: "preserve-3d",
        position: "relative",
      }}
    >
      {/* Glow effect */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: phoneWidth * 1.4,
          height: phoneHeight * 1.2,
          borderRadius: cornerRadius * 1.5,
          background: `radial-gradient(ellipse, ${glowColor}60, transparent 70%)`,
          filter: "blur(60px)",
          opacity: glowIntensity,
          zIndex: -1,
        }}
      />

      {/* Phone outer titanium frame - iPhone 16 Pro style */}
      <div
        style={{
          width: phoneWidth + bezelWidth * 2,
          height: phoneHeight + bezelWidth * 2,
          background: `linear-gradient(
            145deg,
            #3a3a3c 0%,
            #2c2c2e 20%,
            #1c1c1e 50%,
            #2c2c2e 80%,
            #3a3a3c 100%
          )`,
          borderRadius: cornerRadius + bezelWidth,
          padding: bezelWidth,
          boxShadow: `
            ${shadowX}px 40px 80px rgba(0, 0, 0, ${shadowIntensity}),
            ${shadowX * 0.5}px 20px 40px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
          position: "relative",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Titanium edge highlight */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: cornerRadius + bezelWidth,
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />

        {/* Action button - left side */}
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 100,
            width: 4,
            height: 22,
            background: "linear-gradient(90deg, #2a2a2c, #3a3a3c, #2a2a2c)",
            borderRadius: "3px 0 0 3px",
            boxShadow: "-2px 0 4px rgba(0,0,0,0.3)",
          }}
        />

        {/* Volume buttons - left side */}
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 145,
            width: 4,
            height: 44,
            background: "linear-gradient(90deg, #2a2a2c, #3a3a3c, #2a2a2c)",
            borderRadius: "3px 0 0 3px",
            boxShadow: "-2px 0 4px rgba(0,0,0,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 200,
            width: 4,
            height: 44,
            background: "linear-gradient(90deg, #2a2a2c, #3a3a3c, #2a2a2c)",
            borderRadius: "3px 0 0 3px",
            boxShadow: "-2px 0 4px rgba(0,0,0,0.3)",
          }}
        />

        {/* Power button - right side */}
        <div
          style={{
            position: "absolute",
            right: -3,
            top: 160,
            width: 4,
            height: 70,
            background: "linear-gradient(90deg, #3a3a3c, #2a2a2c)",
            borderRadius: "0 3px 3px 0",
            boxShadow: "2px 0 4px rgba(0,0,0,0.3)",
          }}
        />

        {/* Camera Control button - right side bottom */}
        <div
          style={{
            position: "absolute",
            right: -4,
            top: 280,
            width: 6,
            height: 28,
            background: `linear-gradient(90deg, #3a3a3c, ${brand.matcha}40, #3a3a3c)`,
            borderRadius: "0 4px 4px 0",
            boxShadow: "2px 0 4px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />

        {/* Screen container */}
        <div
          style={{
            width: phoneWidth,
            height: phoneHeight,
            borderRadius: cornerRadius,
            overflow: "hidden",
            background: "#000",
            position: "relative",
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 36,
              background: "#000",
              borderRadius: 20,
              zIndex: 100,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* Camera lens inside Dynamic Island */}
            <div
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "radial-gradient(circle at 30% 30%, #3a3a3c, #1a1a1c)",
                boxShadow: "inset 0 0 2px rgba(0,0,0,0.8)",
              }}
            />
          </div>

          {/* Screen content */}
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            {children}
          </div>

          {/* Home indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 100,
              height: 4,
              background: "rgba(255, 255, 255, 0.3)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
};
