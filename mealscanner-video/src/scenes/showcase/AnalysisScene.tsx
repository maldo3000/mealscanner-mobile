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
import { BounceValue, Counter } from "../../components/KineticText";

// Analysis result screen content
const AnalysisScreenContent: React.FC<{ scrollOffset: number }> = ({ scrollOffset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered entry for each section
  const sectionEnter = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 80 },
    });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: brand.ink,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Scrollable content container */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 16px",
          transform: `translateY(${-scrollOffset}px)`,
        }}
      >
        {/* Header with meal image */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
            opacity: interpolate(sectionEnter(0), [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(sectionEnter(0), [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 18,
              background: `linear-gradient(135deg, #4a7c59, #2d5a3d)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: `0 8px 24px rgba(0,0,0,0.3)`,
            }}
          >
            🥗
          </div>
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: brand.bone,
                margin: 0,
                marginBottom: 4,
              }}
            >
              Grilled Chicken Salad
            </h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  background: `${brand.matcha}20`,
                  color: brand.matcha,
                  padding: "3px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                High Protein
              </span>
              <span
                style={{
                  color: brand.sage,
                  fontSize: 11,
                }}
              >
                Just now
              </span>
            </div>
          </div>
        </div>

        {/* Calories hero */}
        <div
          style={{
            background: `linear-gradient(135deg, ${brand.surface2}, ${brand.surface1})`,
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            border: `1px solid ${brand.border}`,
            opacity: interpolate(sectionEnter(5), [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(sectionEnter(5), [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: brand.matcha }}>520</span>
            <span style={{ fontSize: 20, color: brand.sage, fontWeight: 600 }}>kcal</span>
          </div>
          <div style={{ textAlign: "center", color: brand.sage, fontSize: 12 }}>
            26% of daily goal
          </div>
        </div>

        {/* Macronutrients */}
        <div
          style={{
            marginBottom: 16,
            opacity: interpolate(sectionEnter(12), [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(sectionEnter(12), [0, 1], [30, 0])}px)`,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: brand.bone,
              margin: 0,
              marginBottom: 12,
              letterSpacing: 0.5,
            }}
          >
            Macronutrients
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {[
              { label: "Protein", value: "42g", color: brand.accentSky, percent: 84 },
              { label: "Carbs", value: "28g", color: brand.accentYellow, percent: 56 },
              { label: "Fat", value: "18g", color: brand.accentCoral, percent: 36 },
            ].map((macro, i) => (
              <div
                key={macro.label}
                style={{
                  background: brand.surface2,
                  borderRadius: 16,
                  padding: 14,
                  border: `1px solid ${brand.border}`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: macro.color,
                    marginBottom: 4,
                  }}
                >
                  {macro.value}
                </div>
                <div style={{ fontSize: 11, color: brand.sage, marginBottom: 8 }}>
                  {macro.label}
                </div>
                <div
                  style={{
                    height: 4,
                    background: `${macro.color}30`,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${macro.percent}%`,
                      height: "100%",
                      background: macro.color,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Micronutrients */}
        <div
          style={{
            marginBottom: 16,
            opacity: interpolate(sectionEnter(20), [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(sectionEnter(20), [0, 1], [30, 0])}px)`,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: brand.bone,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Vitamins & Minerals
          </h3>
          <div
            style={{
              background: brand.surface2,
              borderRadius: 16,
              padding: 14,
              border: `1px solid ${brand.border}`,
            }}
          >
            {[
              { name: "Vitamin A", value: "145%", bar: 100 },
              { name: "Vitamin C", value: "85%", bar: 85 },
              { name: "Iron", value: "32%", bar: 32 },
              { name: "Calcium", value: "18%", bar: 18 },
            ].map((item, i) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: i < 3 ? 12 : 0,
                }}
              >
                <div style={{ width: 80, fontSize: 12, color: brand.sage }}>{item.name}</div>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: `${brand.matcha}20`,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, item.bar)}%`,
                      height: "100%",
                      background: item.bar > 80 ? brand.matcha : brand.sage,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 40,
                    fontSize: 12,
                    fontWeight: 600,
                    color: item.bar > 80 ? brand.matcha : brand.bone,
                    textAlign: "right",
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health score */}
        <div
          style={{
            background: `linear-gradient(135deg, ${brand.matcha}20, ${brand.matcha}10)`,
            borderRadius: 20,
            padding: 18,
            border: `1px solid ${brand.matcha}40`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(sectionEnter(28), [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
            transform: `scale(${interpolate(sectionEnter(28), [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `conic-gradient(${brand.matcha} 0deg 306deg, ${brand.surface1} 306deg 360deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: brand.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                color: brand.matcha,
              }}
            >
              85
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: brand.bone,
                marginBottom: 2,
              }}
            >
              Health Score
            </div>
            <div style={{ fontSize: 12, color: brand.sage }}>
              Excellent nutritional balance
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnalysisScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phone rotation animation - LARGER for vertical
  const phoneEnter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const phoneScale = interpolate(phoneEnter, [0, 1], [0.6, 1.15]);
  const phoneRotateY = interpolate(phoneEnter, [0, 1], [-25, -4]);
  const phoneRotateX = interpolate(phoneEnter, [0, 1], [15, 3]);
  const phoneY = interpolate(phoneEnter, [0, 1], [150, 0]);

  // Scroll the content
  const scrollStart = Math.round(fps * 1.5);
  const scrollEnd = Math.round(fps * 4);
  const scrollOffset = interpolate(
    frame,
    [scrollStart, scrollEnd],
    [0, 250],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Continuous subtle motion
  const continuousRotateY = Math.sin(frame * 0.02) * 2.5;
  const continuousRotateX = Math.sin(frame * 0.025) * 1.5;

  // Bouncing nutrition values that pop out - repositioned for larger phone
  const popValues = [
    { value: "520", unit: "kcal", label: "CALORIES", x: -200, y: -250, delay: 15, color: brand.matcha },
    { value: "42g", unit: "", label: "PROTEIN", x: 200, y: -160, delay: 25, color: brand.accentSky },
    { value: "28g", unit: "", label: "CARBS", x: -180, y: 160, delay: 35, color: brand.accentYellow },
    { value: "18g", unit: "", label: "FAT", x: 190, y: 240, delay: 45, color: brand.accentCoral },
    { value: "85", unit: "", label: "HEALTH SCORE", x: 0, y: 400, delay: 55, color: brand.matcha },
  ];

  // Title
  const titleEnter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center 30%, ${brand.surface1} 0%, ${brand.ink} 70%)`,
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
            radial-gradient(circle at 25% 25%, ${brand.matcha}12 0%, transparent 40%),
            radial-gradient(circle at 75% 75%, ${brand.accentSky}08 0%, transparent 35%),
            radial-gradient(circle at 50% 50%, ${brand.accentYellow}06 0%, transparent 30%)
          `,
          transform: `rotate(${frame * 0.1}deg)`,
        }}
      />

      {/* Title - larger for vertical */}
      <div
        style={{
          position: "absolute",
          top: 500,
          textAlign: "center",
          opacity: interpolate(titleEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(titleEnter, [0, 1], [30, 0])}px)`,
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: 52,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            marginBottom: 10,
          }}
        >
          Instant Analysis
        </h2>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 44,
            fontWeight: 800,
            color: brand.matcha,
            textShadow: `0 0 50px ${brand.matcha}50`,
          }}
        >
          Every Detail Tracked
        </div>
      </div>

      {/* Phone with analysis screen - centered larger */}
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
          <AnalysisScreenContent scrollOffset={scrollOffset} />
        </IPhone16Mockup>
      </div>

      {/* Bouncing nutrition values - larger cards */}
      {popValues.map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 8, stiffness: 120 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const y = interpolate(enter, [0, 1], [60, 0]);
        const opacity = interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

        // Floating and pulsing
        const float = Math.sin(frame * 0.05 + i * 1.3) * 8;
        const pulse = 1 + Math.sin(frame * 0.08 + i) * 0.04;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${item.x}px)`,
              top: `calc(50% + ${item.y}px)`,
              transform: `translate(-50%, -50%) translateY(${y + float}px) scale(${scale * pulse})`,
              opacity,
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: `${brand.surface2}f5`,
                borderRadius: 20,
                padding: "14px 22px",
                border: `2px solid ${item.color}60`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${item.color}30`,
                textAlign: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 32,
                    fontWeight: 800,
                    color: item.color,
                    textShadow: `0 0 20px ${item.color}40`,
                  }}
                >
                  {item.value}
                </span>
                {item.unit && (
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 16,
                      color: brand.sage,
                    }}
                  >
                    {item.unit}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: fonts.body,
                  fontSize: 9,
                  fontWeight: 600,
                  color: brand.sage,
                  letterSpacing: 1,
                  marginTop: 2,
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
