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

// Compact home screen mockup for vertical video
const HomeScreenContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIndex = 4;

  // Animated calorie ring
  const ringProgress = interpolate(
    frame,
    [20, 60],
    [0, 252],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: brand.ink,
        padding: "50px 16px 16px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
          }}
        >
          Today
        </h1>
        <div
          style={{
            background: `linear-gradient(135deg, ${brand.matcha}, #5fd45f)`,
            padding: "4px 10px",
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            color: brand.ink,
          }}
        >
          PRO
        </div>
      </div>

      {/* Main nutrition card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brand.surface2}ee, ${brand.surface1}dd)`,
          borderRadius: 24,
          padding: 18,
          marginBottom: 14,
          border: `1px solid ${brand.border}`,
        }}
      >
        {/* Week days */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          {weekDays.map((day, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 10, color: brand.sage }}>{day}</span>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 10,
                  background: i === todayIndex ? brand.matcha : i < todayIndex ? `${brand.matcha}30` : "transparent",
                  border: i === todayIndex ? "none" : `1px solid ${brand.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: i === todayIndex ? brand.ink : brand.bone,
                  }}
                >
                  {i + 13}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Calorie ring */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: `conic-gradient(${brand.matcha} 0deg ${ringProgress}deg, ${brand.surface1} ${ringProgress}deg 360deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              boxShadow: `0 0 30px ${brand.matcha}20`,
            }}
          >
            <div
              style={{
                width: 105,
                height: 105,
                borderRadius: "50%",
                background: brand.surface2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: brand.bone,
                }}
              >
                1,420
              </span>
              <span style={{ fontSize: 11, color: brand.sage }}>
                / 2,000 kcal
              </span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          {[
            { label: "Protein", value: "85g", color: brand.accentSky },
            { label: "Carbs", value: "142g", color: brand.accentYellow },
            { label: "Fat", value: "48g", color: brand.accentCoral },
          ].map((macro) => (
            <div
              key={macro.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span style={{ fontSize: 10, color: brand.sage }}>
                {macro.label}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: macro.color,
                }}
              >
                {macro.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent meal */}
      <div
        style={{
          background: `${brand.surface2}dd`,
          borderRadius: 18,
          padding: 14,
          display: "flex",
          gap: 12,
          border: `1px solid ${brand.border}`,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: `linear-gradient(135deg, #4a7c59, #2d5a3d)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          🥗
        </div>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: brand.bone,
              display: "block",
              marginBottom: 3,
            }}
          >
            Grilled Chicken Salad
          </span>
          <span style={{ fontSize: 11, color: brand.sage, display: "block", marginBottom: 5 }}>
            Today, 12:45 PM
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <span style={{ fontSize: 12, color: brand.matcha, fontWeight: 600 }}>520 kcal</span>
            <span style={{ fontSize: 11, color: brand.sage }}>42g pro</span>
          </div>
        </div>
      </div>

      {/* Streak card */}
      <div
        style={{
          background: `${brand.surface2}dd`,
          borderRadius: 20,
          padding: 16,
          border: `1px solid ${brand.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `${brand.matcha}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            ⭐
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: brand.bone }}>7</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: brand.bone, letterSpacing: 0.5 }}>
                DAY STREAK
              </span>
            </div>
            <span style={{ fontSize: 11, color: brand.sage }}>You're on fire!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HomeShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phone entrance with 3D rotation - MUCH LARGER for vertical
  const phoneEnter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 50 },
  });

  // Scale up significantly for vertical format
  const phoneScale = interpolate(phoneEnter, [0, 1], [0.6, 1.15]);
  const phoneRotateY = interpolate(phoneEnter, [0, 1], [-35, 6]);
  const phoneRotateX = interpolate(phoneEnter, [0, 1], [20, 4]);
  const phoneY = interpolate(phoneEnter, [0, 1], [200, 0]);

  // Continuous subtle rotation
  const continuousRotateY = Math.sin(frame * 0.02) * 3;
  const continuousRotateX = Math.sin(frame * 0.025) * 1.5;

  // Text animations
  const titleEnter = spring({
    frame: frame - 10,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const titleOpacity = interpolate(titleEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(titleEnter, [0, 1], [40, 0]);

  // Floating nutrition values - positioned around larger phone
  const values = [
    { value: "1,420", label: "CALORIES", x: -200, y: -120, delay: 30, color: brand.matcha },
    { value: "85g", label: "PROTEIN", x: 200, y: 60, delay: 40, color: brand.accentSky },
    { value: "7", label: "DAY STREAK", x: -180, y: 280, delay: 50, color: brand.accentYellow },
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
            radial-gradient(circle at 30% 30%, ${brand.matcha}10 0%, transparent 40%),
            radial-gradient(circle at 70% 60%, ${brand.accentSky}08 0%, transparent 35%)
          `,
          transform: `rotate(${frame * 0.1}deg)`,
        }}
      />

      {/* Title - positioned at top */}
      <div
        style={{
          position: "absolute",
          top: 100,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
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
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Your Day
        </h2>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 64,
            fontWeight: 800,
            color: brand.matcha,
            textShadow: `0 0 60px ${brand.matcha}50`,
          }}
        >
          At a Glance
        </div>
      </div>

      {/* Phone with 3D rotation - centered in middle */}
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
            scale(${phoneScale})
          `,
          transformStyle: "preserve-3d",
          zIndex: 5,
        }}
      >
        <IPhone16Mockup glowIntensity={0.7}>
          <HomeScreenContent />
        </IPhone16Mockup>
      </div>

      {/* Floating bouncing values - larger and better positioned */}
      {values.map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 100 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        const y = interpolate(enter, [0, 1], [50, 0]);

        // Floating animation
        const float = Math.sin(frame * 0.04 + i * 1.5) * 10;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${item.x}px)`,
              top: `calc(50% + ${item.y}px)`,
              transform: `translate(-50%, -50%) translateY(${y + float}px) scale(${scale})`,
              opacity,
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: `${brand.surface2}f5`,
                borderRadius: 20,
                padding: "16px 24px",
                border: `2px solid ${item.color}50`,
                boxShadow: `0 15px 50px rgba(0,0,0,0.5), 0 0 40px ${item.color}30`,
                textAlign: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 36,
                  fontWeight: 800,
                  color: item.color,
                  marginBottom: 4,
                  textShadow: `0 0 20px ${item.color}40`,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 600,
                  color: brand.sage,
                  letterSpacing: 1.5,
                }}
              >
                {item.label}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
