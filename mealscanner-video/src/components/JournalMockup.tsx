import React from "react";
import { brand } from "../brand";

const meals = [
  {
    name: "Grilled Chicken Salad",
    time: "Today, 12:45 PM",
    calories: 520,
    protein: 42,
    carbs: 28,
    fat: 18,
    emoji: "🥗",
  },
  {
    name: "Overnight Oats with Berries",
    time: "Today, 8:30 AM",
    calories: 380,
    protein: 14,
    carbs: 58,
    fat: 12,
    emoji: "🥣",
  },
  {
    name: "Salmon & Quinoa Bowl",
    time: "Yesterday, 7:15 PM",
    calories: 620,
    protein: 38,
    carbs: 45,
    fat: 28,
    emoji: "🍣",
  },
  {
    name: "Greek Yogurt Parfait",
    time: "Yesterday, 10:00 AM",
    calories: 290,
    protein: 18,
    carbs: 32,
    fat: 8,
    emoji: "🫐",
  },
];

export const JournalMockup: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: brand.ink,
        padding: "60px 20px 20px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: brand.bone,
            margin: 0,
            marginBottom: 4,
          }}
        >
          Journal
        </h1>
        <p style={{ fontSize: 14, color: brand.sage, margin: 0 }}>
          Your history of captured meals
        </p>
      </div>

      {/* Search bar */}
      <div
        style={{
          background: `${brand.surface1}cc`,
          borderRadius: 16,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          border: `1px solid ${brand.border}`,
        }}
      >
        <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
        <span style={{ fontSize: 15, color: brand.sage }}>
          Search meals...
        </span>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
        }}
      >
        {["Today", "This Week", "All"].map((filter, i) => (
          <div
            key={filter}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 14,
              background: i === 0 ? brand.matcha : "transparent",
              border: i === 0 ? "none" : `1px solid ${brand.border}`,
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: i === 0 ? brand.ink : brand.sage,
              }}
            >
              {filter}
            </span>
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div
        style={{
          background: `${brand.surface2}dd`,
          borderRadius: 20,
          padding: "14px 20px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: `1px solid ${brand.border}`,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 10,
              color: brand.sage,
              letterSpacing: 0.5,
              display: "block",
              marginBottom: 4,
            }}
          >
            TODAY'S TOTAL
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: brand.matcha,
              }}
            >
              900
            </span>
            <span style={{ fontSize: 14, color: brand.sage }}>kcal</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Pro", value: "56g" },
            { label: "Carb", value: "86g" },
            { label: "Fat", value: "30g" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, color: brand.sage }}>{m.label}</span>
              <span
                style={{ fontSize: 14, fontWeight: 700, color: brand.bone }}
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Meals list */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {meals.map((meal, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 0",
              gap: 14,
              borderBottom:
                i < meals.length - 1
                  ? `1px solid ${brand.border}40`
                  : "none",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                background: `linear-gradient(135deg, ${brand.surface2}, ${brand.surface1})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                border: `1px solid ${brand.border}`,
              }}
            >
              {meal.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: brand.bone,
                  display: "block",
                  marginBottom: 2,
                }}
              >
                {meal.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: brand.sage,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                {meal.time}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: brand.matcha,
                    fontWeight: 600,
                  }}
                >
                  {meal.calories} kcal
                </span>
                <span style={{ fontSize: 12, color: brand.sage }}>
                  {meal.protein}g pro
                </span>
                <span style={{ fontSize: 12, color: brand.sage }}>
                  {meal.carbs}g carb
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
