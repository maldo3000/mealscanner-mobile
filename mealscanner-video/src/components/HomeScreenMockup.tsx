import React from "react";
import { brand } from "../brand";

export const HomeScreenMockup: React.FC = () => {
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const weekCalories = [1850, 2100, 1650, 2200, 1900, 0, 0]; // Sample data
  const todayIndex = 4; // Friday

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontSize: 32,
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
            padding: "6px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            color: brand.ink,
          }}
        >
          PRO
        </div>
      </div>

      {/* Nutrition Hero Card */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brand.surface2}ee, ${brand.surface1}dd)`,
          borderRadius: 28,
          padding: 24,
          marginBottom: 20,
          border: `1px solid ${brand.border}`,
        }}
      >
        {/* Week selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          {weekDays.map((day, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: brand.sage }}>{day}</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background:
                    i === todayIndex
                      ? brand.matcha
                      : weekCalories[i] > 0
                        ? `${brand.matcha}30`
                        : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border:
                    i === todayIndex
                      ? "none"
                      : `1px solid ${brand.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
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

        {/* Calorie circle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: `conic-gradient(${brand.matcha} 0deg 252deg, ${brand.surface1} 252deg 360deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 130,
                height: 130,
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
                  fontSize: 36,
                  fontWeight: 800,
                  color: brand.bone,
                }}
              >
                1,420
              </span>
              <span style={{ fontSize: 14, color: brand.sage }}>
                / 2,000 kcal
              </span>
            </div>
          </div>
        </div>

        {/* Macros row */}
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
                gap: 4,
              }}
            >
              <span style={{ fontSize: 12, color: brand.sage }}>
                {macro.label}
              </span>
              <span
                style={{
                  fontSize: 18,
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

      {/* Recent Meal Section */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span
            style={{ fontSize: 18, fontWeight: 700, color: brand.bone }}
          >
            Recent Meal
          </span>
          <span
            style={{ fontSize: 14, fontWeight: 600, color: brand.matcha }}
          >
            View All
          </span>
        </div>

        <div
          style={{
            background: `${brand.surface2}dd`,
            borderRadius: 20,
            padding: 16,
            display: "flex",
            gap: 16,
            border: `1px solid ${brand.border}`,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 16,
              background: `linear-gradient(135deg, #4a7c59, #2d5a3d)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🥗
          </div>
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: brand.bone,
                display: "block",
                marginBottom: 4,
              }}
            >
              Grilled Chicken Salad
            </span>
            <span
              style={{
                fontSize: 13,
                color: brand.sage,
                display: "block",
                marginBottom: 8,
              }}
            >
              Today, 12:45 PM
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 13, color: brand.matcha, fontWeight: 600 }}>
                520 kcal
              </span>
              <span style={{ fontSize: 13, color: brand.sage }}>
                42g pro
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div
        style={{
          background: `${brand.surface2}dd`,
          borderRadius: 24,
          padding: 20,
          border: `1px solid ${brand.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `${brand.matcha}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            ⭐
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: brand.bone,
                }}
              >
                7
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: brand.bone,
                  letterSpacing: 1,
                }}
              >
                DAY STREAK
              </span>
            </div>
            <span style={{ fontSize: 13, color: brand.sage }}>
              You're on fire! Keep it up.
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {["7 Day", "Consistency", "Balanced"].map((badge) => (
            <div
              key={badge}
              style={{
                background: `${brand.matcha}15`,
                padding: "8px 14px",
                borderRadius: 12,
                border: `1px solid ${brand.matcha}40`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: brand.matcha,
                }}
              >
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
