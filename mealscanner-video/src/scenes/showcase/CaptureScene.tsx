import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from "remotion";
import { brand, fonts } from "../../brand";
import { IPhone16Mockup } from "../../components/IPhone16Mockup";
import { ExplodeText, KineticSlide } from "../../components/KineticText";

// Camera viewfinder content
const CameraViewContent: React.FC<{ showFlash: boolean; showAnalyzing: boolean }> = ({
  showFlash,
  showAnalyzing,
}) => {
  const frame = useCurrentFrame();

  // Scanning line animation
  const scanLine = interpolate(
    (frame % 60),
    [0, 60],
    [-20, 120],
    { extrapolateRight: "clamp" }
  );

  // Focus animation
  const focusPulse = 1 + Math.sin(frame * 0.1) * 0.03;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Camera view - food "image" */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg,
            #1a1a1a 0%,
            #2a2a2a 20%,
            #3a3a3a 50%,
            #2a2a2a 80%,
            #1a1a1a 100%
          )`,
        }}
      />

      {/* Simulated food image (gradient + emoji) */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle,
            rgba(74, 124, 89, 0.4) 0%,
            rgba(45, 90, 61, 0.3) 50%,
            transparent 70%
          )`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 100,
            transform: `scale(${focusPulse})`,
          }}
        >
          🥗
        </div>
      </div>

      {/* Side dish */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "25%",
          fontSize: 50,
        }}
      >
        🍞
      </div>

      {/* Drink */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: "15%",
          fontSize: 45,
        }}
      >
        🥤
      </div>

      {/* Camera UI overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            padding: "0 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 20, color: "white" }}>✕</div>
          <div
            style={{
              background: "rgba(0,0,0,0.5)",
              padding: "6px 14px",
              borderRadius: 16,
              color: "white",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Photo
          </div>
          <div style={{ fontSize: 18, color: "white" }}>⚡</div>
        </div>

        {/* Focus brackets */}
        <div
          style={{
            position: "absolute",
            top: "32%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${focusPulse})`,
            width: 180,
            height: 180,
          }}
        >
          {/* Corner brackets */}
          {[
            { top: 0, left: 0, borderTop: "2px", borderLeft: "2px" },
            { top: 0, right: 0, borderTop: "2px", borderRight: "2px" },
            { bottom: 0, left: 0, borderBottom: "2px", borderLeft: "2px" },
            { bottom: 0, right: 0, borderBottom: "2px", borderRight: "2px" },
          ].map((corner, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 30,
                height: 30,
                borderColor: brand.matcha,
                borderStyle: "solid",
                borderWidth: 0,
                ...corner,
              }}
            />
          ))}
        </div>

        {/* Scanning line during analysis */}
        {showAnalyzing && (
          <div
            style={{
              position: "absolute",
              top: `${scanLine}%`,
              left: "15%",
              right: "15%",
              height: 2,
              background: `linear-gradient(90deg, transparent, ${brand.matcha}, transparent)`,
              boxShadow: `0 0 20px ${brand.matcha}, 0 0 40px ${brand.matcha}`,
              opacity: 0.8,
            }}
          />
        )}

        {/* Capture button */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              border: "4px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: showFlash ? brand.matcha : "white",
                boxShadow: showFlash ? `0 0 30px ${brand.matcha}` : "none",
              }}
            />
          </div>
        </div>

        {/* Analyzing indicator */}
        {showAnalyzing && (
          <div
            style={{
              position: "absolute",
              bottom: 140,
              left: "50%",
              transform: "translateX(-50%)",
              background: `${brand.matcha}ee`,
              padding: "10px 24px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                border: `2px solid ${brand.ink}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "none", // We'll animate with transform
                transform: `rotate(${frame * 10}deg)`,
              }}
            />
            <span
              style={{
                color: brand.ink,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Analyzing...
            </span>
          </div>
        )}
      </div>

      {/* Flash overlay */}
      {showFlash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "white",
            opacity: interpolate(
              Math.min(1, Math.max(0, (showFlash ? 1 : 0))),
              [0, 1],
              [0, 0.8]
            ),
          }}
        />
      )}
    </div>
  );
};

export const CaptureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Timeline:
  // 0-1s: Phone enters with camera view
  // 1s: Flash/capture
  // 1-end: Analyzing animation

  const flashFrame = Math.round(fps * 1.2);
  const analyzeStart = Math.round(fps * 1.5);

  const showFlash = frame >= flashFrame && frame < flashFrame + 8;
  const showAnalyzing = frame >= analyzeStart;

  // Phone entrance - dramatic spin in - LARGER for vertical
  const phoneEnter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const phoneScale = interpolate(phoneEnter, [0, 1], [0.5, 1.15]);
  const phoneRotateY = interpolate(phoneEnter, [0, 1], [70, 4]);
  const phoneRotateX = interpolate(phoneEnter, [0, 1], [25, 5]);
  const phoneY = interpolate(phoneEnter, [0, 1], [150, 0]);

  // Capture animation - phone recoil
  const captureRecoil = showFlash
    ? interpolate(
        frame - flashFrame,
        [0, 4, 8],
        [0, -15, 0],
        { extrapolateRight: "clamp" }
      )
    : 0;

  // Continuous rotation
  const continuousRotateY = Math.sin(frame * 0.02) * 3;
  const continuousRotateX = Math.sin(frame * 0.025) * 1.5;

  // Title animation
  const titleEnter = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Floating food items around the scene - positioned for larger phone
  const floatingFood = [
    { emoji: "🍎", x: -220, y: -200, delay: 20 },
    { emoji: "🥑", x: 230, y: -140, delay: 25 },
    { emoji: "🍊", x: -200, y: 220, delay: 30 },
    { emoji: "🥕", x: 210, y: 280, delay: 35 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center 40%, ${brand.surface1} 0%, ${brand.ink} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
            radial-gradient(circle at 40% 30%, ${brand.accentCoral}08 0%, transparent 40%),
            radial-gradient(circle at 60% 70%, ${brand.matcha}10 0%, transparent 35%)
          `,
          transform: `rotate(${frame * 0.15}deg)`,
        }}
      />

      {/* Title - larger for vertical */}
      <div
        style={{
          position: "absolute",
          top: 100,
          textAlign: "center",
          opacity: interpolate(titleEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(titleEnter, [0, 1], [30, 0])}px)`,
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: 56,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            marginBottom: 10,
            letterSpacing: "-0.02em",
          }}
        >
          Snap Your Meal
        </h2>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 48,
            fontWeight: 800,
            color: brand.matcha,
            textShadow: `0 0 50px ${brand.matcha}50`,
          }}
        >
          AI Does the Rest
        </div>
      </div>

      {/* Phone with camera view - centered larger */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `
            translate(-50%, -50%)
            translateY(${phoneY + 80}px)
            perspective(1200px)
            rotateX(${phoneRotateX + continuousRotateX}deg)
            rotateY(${phoneRotateY + continuousRotateY}deg)
            translateZ(${captureRecoil}px)
            scale(${phoneScale})
          `,
          transformStyle: "preserve-3d",
          zIndex: 5,
        }}
      >
        <IPhone16Mockup glowColor={showFlash ? "#fff" : brand.matcha} glowIntensity={showFlash ? 0.9 : 0.6}>
          <CameraViewContent showFlash={showFlash} showAnalyzing={showAnalyzing} />
        </IPhone16Mockup>
      </div>

      {/* Floating food items - larger */}
      {floatingFood.map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 80 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 0.9], { extrapolateRight: "clamp" });
        const float = Math.sin(frame * 0.04 + i * 1.2) * 12;
        const rotate = Math.sin(frame * 0.03 + i) * 12;

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
              zIndex: 15,
            }}
          >
            {item.emoji}
          </div>
        );
      })}

      {/* Capture pulse effect - larger */}
      {showFlash && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            border: `4px solid ${brand.matcha}`,
            opacity: interpolate(
              frame - flashFrame,
              [0, 15],
              [1, 0],
              { extrapolateRight: "clamp" }
            ),
            scale: `${interpolate(
              frame - flashFrame,
              [0, 15],
              [0.5, 1.5],
              { extrapolateRight: "clamp" }
            )}`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
