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

// Recipe screen content
const RecipeScreenContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recipes = [
    {
      name: "Mediterranean Bowl",
      calories: 520,
      protein: 35,
      time: "25 min",
      emoji: "🥙",
      color: "#4a7c59",
      tags: ["High Protein", "Balanced"],
    },
    {
      name: "Teriyaki Salmon",
      calories: 480,
      protein: 42,
      time: "20 min",
      emoji: "🍣",
      color: "#c45b3e",
      tags: ["Omega-3", "Keto"],
    },
    {
      name: "Quinoa Power Bowl",
      calories: 410,
      protein: 28,
      time: "15 min",
      emoji: "🥗",
      color: "#6b8e4e",
      tags: ["Vegan", "Fiber"],
    },
  ];

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
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: brand.bone,
          margin: 0,
          marginBottom: 14,
        }}
      >
        Recipes For You
      </h1>

      {/* Goal alignment banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brand.matcha}20, ${brand.matcha}10)`,
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
          border: `1px solid ${brand.matcha}40`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `${brand.matcha}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🎯
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: brand.bone,
              marginBottom: 2,
            }}
          >
            Based on Your Goals
          </div>
          <div style={{ fontSize: 11, color: brand.sage }}>
            High protein • 500 cal deficit
          </div>
        </div>
      </div>

      {/* Recipe cards */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {recipes.map((recipe, i) => {
          const cardEnter = spring({
            frame: frame - 10 - i * 8,
            fps,
            config: { damping: 12, stiffness: 80 },
          });

          const cardScale = interpolate(cardEnter, [0, 1], [0.9, 1]);
          const cardOpacity = interpolate(cardEnter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
          const cardX = interpolate(cardEnter, [0, 1], [50, 0]);

          return (
            <div
              key={recipe.name}
              style={{
                background: brand.surface2,
                borderRadius: 20,
                marginBottom: 12,
                border: `1px solid ${brand.border}`,
                overflow: "hidden",
                opacity: cardOpacity,
                transform: `translateX(${cardX}px) scale(${cardScale})`,
              }}
            >
              <div style={{ display: "flex" }}>
                {/* Recipe image */}
                <div
                  style={{
                    width: 90,
                    height: 90,
                    background: `linear-gradient(135deg, ${recipe.color}, ${recipe.color}88)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    flexShrink: 0,
                  }}
                >
                  {recipe.emoji}
                </div>

                {/* Recipe info */}
                <div style={{ flex: 1, padding: 12 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: brand.bone,
                      marginBottom: 6,
                    }}
                  >
                    {recipe.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: brand.matcha, fontWeight: 600 }}>
                      {recipe.calories} kcal
                    </span>
                    <span style={{ fontSize: 12, color: brand.accentSky }}>
                      {recipe.protein}g protein
                    </span>
                    <span style={{ fontSize: 11, color: brand.sage }}>
                      {recipe.time}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: `${brand.matcha}15`,
                          color: brand.matcha,
                          padding: "3px 8px",
                          borderRadius: 8,
                          fontSize: 9,
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Browse more hint */}
      <div
        style={{
          textAlign: "center",
          padding: "14px 0",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: brand.matcha,
          }}
        >
          100+ recipes tailored to you →
        </span>
      </div>
    </div>
  );
};

export const RecipesShowcaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phone animation - rotate in from right - LARGER for vertical
  const phoneEnter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 55 },
  });

  const phoneScale = interpolate(phoneEnter, [0, 1], [0.6, 1.15]);
  const phoneRotateY = interpolate(phoneEnter, [0, 1], [35, -5]);
  const phoneRotateX = interpolate(phoneEnter, [0, 1], [18, 4]);
  const phoneY = interpolate(phoneEnter, [0, 1], [150, 0]);

  // Continuous motion
  const continuousRotateY = Math.sin(frame * 0.02) * 3;
  const continuousRotateX = Math.sin(frame * 0.025) * 1.5;

  // Title
  const titleEnter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  // Recipe emoji floating - repositioned for larger phone
  const floatingRecipes = [
    { emoji: "🥙", x: -220, y: -140, delay: 15 },
    { emoji: "🍣", x: 220, y: -80, delay: 22 },
    { emoji: "🥗", x: -190, y: 200, delay: 30 },
    { emoji: "🍜", x: 200, y: 280, delay: 38 },
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
            radial-gradient(circle at 60% 30%, ${brand.accentYellow}08 0%, transparent 40%),
            radial-gradient(circle at 40% 70%, ${brand.matcha}10 0%, transparent 35%)
          `,
          transform: `rotate(${frame * 0.12}deg)`,
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
          Recipes That
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
          Hit Your Goals
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
        <IPhone16Mockup glowColor={brand.accentYellow} glowIntensity={0.6}>
          <RecipeScreenContent />
        </IPhone16Mockup>
      </div>

      {/* Floating recipe emojis - larger */}
      {floatingRecipes.map((item, i) => {
        const enter = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 90 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 0.9], { extrapolateRight: "clamp" });
        const float = Math.sin(frame * 0.04 + i * 1.4) * 12;
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

      {/* Goal achievement badges floating */}
      {[
        { text: "High Protein", x: -100, y: 250, color: brand.accentSky, delay: 45 },
        { text: "Low Calorie", x: 90, y: 280, color: brand.accentCoral, delay: 52 },
      ].map((badge, i) => {
        const enter = spring({
          frame: frame - badge.delay,
          fps,
          config: { damping: 12, stiffness: 80 },
        });

        const scale = interpolate(enter, [0, 1], [0, 1]);
        const opacity = interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
        const float = Math.sin(frame * 0.05 + i * 2) * 5;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(50% + ${badge.x}px)`,
              top: `calc(50% + ${badge.y}px)`,
              transform: `translate(-50%, -50%) translateY(${float}px) scale(${scale})`,
              opacity,
              zIndex: 20,
            }}
          >
            <div
              style={{
                background: `${badge.color}20`,
                border: `1px solid ${badge.color}50`,
                borderRadius: 12,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>✓</span>
              <span
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: badge.color,
                }}
              >
                {badge.text}
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
