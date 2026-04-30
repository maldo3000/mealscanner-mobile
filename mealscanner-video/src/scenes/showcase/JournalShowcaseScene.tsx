import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { brand, fonts } from "../../brand";
import { IPhone16Mockup } from "../../components/IPhone16Mockup";

// Journal screen content with scrolling animation
const JournalScreenContent: React.FC<{ scrollOffset: number }> = ({ scrollOffset }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const meals = [
    {
      name: "Grilled Chicken Salad",
      time: "Today, 12:45 PM",
      calories: 520,
      protein: 42,
      carbs: 28,
      emoji: "🥗",
    },
    {
      name: "Overnight Oats",
      time: "Today, 8:30 AM",
      calories: 380,
      protein: 14,
      carbs: 58,
      emoji: "🥣",
    },
    {
      name: "Salmon & Quinoa",
      time: "Yesterday, 7:15 PM",
      calories: 620,
      protein: 38,
      carbs: 45,
      emoji: "🍣",
    },
    {
      name: "Greek Yogurt Parfait",
      time: "Yesterday, 10:00 AM",
      calories: 290,
      protein: 18,
      carbs: 32,
      emoji: "🫐",
    },
    {
      name: "Avocado Toast",
      time: "Yesterday, 8:00 AM",
      calories: 350,
      protein: 12,
      carbs: 40,
      emoji: "🥑",
    },
    {
      name: "Steak & Vegetables",
      time: "2 days ago, 7:00 PM",
      calories: 580,
      protein: 48,
      carbs: 22,
      emoji: "🥩",
    },
  ];

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
      {/* Scrollable content */}
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
        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: brand.bone,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Journal
          </h1>
          <p style={{ fontSize: 12, color: brand.sage, margin: 0 }}>
            Your meal history
          </p>
        </div>

        {/* Search bar */}
        <div
          style={{
            background: `${brand.surface1}cc`,
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
            border: `1px solid ${brand.border}`,
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
          <span style={{ fontSize: 13, color: brand.sage }}>
            Search meals...
          </span>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {["All", "Today", "Week"].map((filter, i) => (
            <div
              key={filter}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 12,
                background: i === 0 ? brand.matcha : "transparent",
                border: i === 0 ? "none" : `1px solid ${brand.border}`,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: i === 0 ? brand.ink : brand.sage,
                }}
              >
                {filter}
              </span>
            </div>
          ))}
        </div>

        {/* Meal entries */}
        {meals.map((meal, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 0",
              gap: 12,
              borderBottom: i < meals.length - 1 ? `1px solid ${brand.border}40` : "none",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${brand.surface2}, ${brand.surface1})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                border: `1px solid ${brand.border}`,
                flexShrink: 0,
              }}
            >
              {meal.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: brand.bone,
                  display: "block",
                  marginBottom: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {meal.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: brand.sage,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {meal.time}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: brand.matcha,
                    fontWeight: 600,
                  }}
                >
                  {meal.calories} kcal
                </span>
                <span style={{ fontSize: 11, color: brand.sage }}>
                  {meal.protein}g pro
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const JournalShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phone animation - LARGER for vertical
  const phoneEnter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 55 },
  });

  const phoneScale = interpolate(phoneEnter, [0, 1], [0.6, 1.15]);
  const phoneRotateY = interpolate(phoneEnter, [0, 1], [-30, 5]);
  const phoneRotateX = interpolate(phoneEnter, [0, 1], [18, 4]);
  const phoneY = interpolate(phoneEnter, [0, 1], [150, 0]);

  // Scroll animation - auto scroll through entries
  const scrollStart = Math.round(fps * 0.8);
  const scrollEnd = Math.round(fps * 3.5);
  const scrollOffset = interpolate(
    frame,
    [scrollStart, scrollEnd],
    [0, 280],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Continuous motion
  const continuousRotateY = Math.sin(frame * 0.02) * 2.5;
  const continuousRotateX = Math.sin(frame * 0.025) * 1.5;

  // Title
  const titleEnter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Stats that appear - repositioned for larger phone
  const stats = [
    { value: "2,450", label: "CALORIES TODAY", x: -190, y: -200, delay: 20, color: brand.matcha },
    { value: "127g", label: "PROTEIN", x: 190, y: -120, delay: 30, color: brand.accentSky },
    { value: "14", label: "MEALS THIS WEEK", x: 0, y: 380, delay: 40, color: brand.accentYellow },
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
            radial-gradient(circle at 35% 35%, ${brand.accentSky}08 0%, transparent 40%),
            radial-gradient(circle at 65% 65%, ${brand.matcha}10 0%, transparent 35%)
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
            fontSize: 54,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            marginBottom: 10,
          }}
        >
          Your Journey
        </h2>
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: 60,
            fontWeight: 800,
            color: brand.matcha,
            textShadow: `0 0 60px ${brand.matcha}50`,
          }}
        >
          Every Meal Counts
        </div>
      </div>

      {/* Phone - centered larger */}
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
        <IPhone16Mockup glowColor={brand.accentSky} glowIntensity={0.6}>
          <JournalScreenContent scrollOffset={scrollOffset} />
        </IPhone16Mockup>
      </div>

      {/* Floating stats - larger */}
      {stats.map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 100 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        const y = interpolate(enter, [0, 1], [40, 0]);
        const float = Math.sin(frame * 0.04 + i * 1.5) * 8;

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
                padding: "14px 22px",
                border: `2px solid ${item.color}50`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${item.color}25`,
                textAlign: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 32,
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
                  fontSize: 11,
                  fontWeight: 600,
                  color: brand.sage,
                  letterSpacing: 1,
                }}
              >
                {item.label}
              </div>
            </div>
          </div>
        );
      })}

      {/* Floating meal emojis - repositioned */}
      {[
        { emoji: "🥗", x: -200, y: 140, delay: 25 },
        { emoji: "🍣", x: 190, y: 200, delay: 32 },
      ].map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 80 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 0.85], { extrapolateRight: "clamp" });
        const float = Math.sin(frame * 0.05 + i * 1.8) * 8;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${item.x}px)`,
              top: `calc(50% + ${item.y}px)`,
              fontSize: 40,
              opacity,
              transform: `translate(-50%, -50%) translateY(${float}px) scale(${scale})`,
              zIndex: 15,
            }}
          >
            {item.emoji}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
