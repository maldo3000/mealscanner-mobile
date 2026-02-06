import React from "react";
import { brand } from "../brand";

const dietTypes = [
  { icon: "🥬", label: "Vegan" },
  { icon: "🥑", label: "Keto" },
  { icon: "🍖", label: "Paleo" },
  { icon: "🌾", label: "Whole30" },
  { icon: "🥛", label: "Dairy-Free" },
  { icon: "🌿", label: "Low Carb" },
];

const featuredRecipes = [
  {
    name: "Mediterranean Bowl",
    calories: 520,
    time: "25 min",
    emoji: "🥙",
    color: "#4a7c59",
  },
  {
    name: "Teriyaki Salmon",
    calories: 480,
    time: "20 min",
    emoji: "🍣",
    color: "#c45b3e",
  },
  {
    name: "Quinoa Power Bowl",
    calories: 410,
    time: "15 min",
    emoji: "🥗",
    color: "#6b8e4e",
  },
];

export const RecipeMockup: React.FC = () => {
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
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: brand.bone,
          margin: 0,
          marginBottom: 16,
        }}
      >
        Recipes
      </h1>

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            flex: 1,
            background: `${brand.surface1}cc`,
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: `1px solid ${brand.border}`,
          }}
        >
          <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
          <span style={{ fontSize: 14, color: brand.sage }}>
            Search salmon, keto, high protein...
          </span>
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: brand.surface1,
            border: `1px solid ${brand.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 18 }}>⚙️</span>
        </div>
      </div>

      {/* Pick Your Diet Section */}
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: brand.bone,
            margin: 0,
            marginBottom: 12,
          }}
        >
          Pick Your Diet
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {dietTypes.map((diet, i) => (
            <div
              key={diet.label}
              style={{
                background: i === 1 ? `${brand.matcha}30` : brand.surface1,
                border: `1px solid ${i === 1 ? brand.matcha : brand.border}`,
                borderRadius: 14,
                padding: "12px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 22 }}>{diet.icon}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: i === 1 ? brand.matcha : brand.sage,
                }}
              >
                {diet.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Section */}
      <div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: brand.bone,
            margin: 0,
            marginBottom: 12,
          }}
        >
          Featured
        </h3>
        <div
          style={{
            display: "flex",
            gap: 12,
            overflow: "hidden",
          }}
        >
          {featuredRecipes.map((recipe) => (
            <div
              key={recipe.name}
              style={{
                minWidth: 160,
                background: brand.surface2,
                borderRadius: 20,
                overflow: "hidden",
                border: `1px solid ${brand.border}`,
              }}
            >
              {/* Recipe image placeholder */}
              <div
                style={{
                  height: 100,
                  background: `linear-gradient(135deg, ${recipe.color}, ${recipe.color}88)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                }}
              >
                {recipe.emoji}
              </div>
              <div style={{ padding: 12 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: brand.bone,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  {recipe.name}
                </span>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: brand.matcha,
                      fontWeight: 600,
                    }}
                  >
                    {recipe.calories} kcal
                  </span>
                  <span style={{ fontSize: 11, color: brand.sage }}>
                    {recipe.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Recipes hint */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: brand.bone,
              margin: 0,
            }}
          >
            All Recipes
          </h3>
          <span style={{ fontSize: 13, color: brand.sage }}>100+ recipes</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          {[
            { emoji: "🍜", name: "Pho Bowl", cal: 380 },
            { emoji: "🌯", name: "Chicken Wrap", cal: 450 },
          ].map((r) => (
            <div
              key={r.name}
              style={{
                background: brand.surface2,
                borderRadius: 16,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: `1px solid ${brand.border}`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: brand.surface1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {r.emoji}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: brand.bone,
                    display: "block",
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontSize: 11, color: brand.matcha }}>
                  {r.cal} kcal
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
