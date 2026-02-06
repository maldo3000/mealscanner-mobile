import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { brand, fonts } from "../brand";
import { PhoneMockup } from "../components/PhoneMockup";
import { HomeScreenMockup } from "../components/HomeScreenMockup";
import { JournalMockup } from "../components/JournalMockup";
import { RecipeMockup } from "../components/RecipeMockup";
import { TypewriterText, AnimatedWords } from "../components/TypewriterText";

type AppShowcaseSceneProps = {
  screen: "home" | "journal" | "recipes" | "all";
};

export const AppShowcaseScene: React.FC<AppShowcaseSceneProps> = ({
  screen,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isAllScreens = screen === "all";
  const isSingleScreen = !isAllScreens;

  // ===== CAMERA / SCENE ANIMATION =====
  // Subtle scene-wide movement for dynamism
  const sceneRotateY = interpolate(
    frame,
    [0, fps * 3],
    [-2, 2],
    { extrapolateRight: "clamp" }
  );

  const sceneRotateX = Math.sin(frame * 0.03) * 1.5;

  // ===== TITLE ANIMATIONS =====
  const titleEnter = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const titleY = interpolate(titleEnter, [0, 1], [-50, 0]);
  const titleOpacity = interpolate(titleEnter, [0, 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  // ===== SINGLE SCREEN ZOOM EFFECT =====
  const zoomOutProgress = spring({
    frame: frame,
    fps,
    config: { damping: 15, stiffness: 35 },
  });

  // More dramatic zoom - starts closer
  const singleScreenZoom = interpolate(
    zoomOutProgress,
    [0, 1],
    [2.8, 1],
    { extrapolateRight: "clamp" }
  );

  // Pan offset with 3D depth feel
  const getZoomFocusOffset = () => {
    switch (screen) {
      case "home":
        return { x: 0, y: -100 };
      case "journal":
        return { x: 0, y: 120 };
      case "recipes":
        return { x: 0, y: 80 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const focusOffset = getZoomFocusOffset();
  const panX = interpolate(zoomOutProgress, [0, 1], [focusOffset.x, 0]);
  const panY = interpolate(zoomOutProgress, [0, 1], [focusOffset.y, 0]);

  // ===== ALL SCREENS ANIMATIONS =====
  const phone1Enter = spring({
    frame: frame - 3,
    fps,
    config: { damping: 10, stiffness: 50 },
  });

  const phone2Enter = spring({
    frame: frame - 10,
    fps,
    config: { damping: 10, stiffness: 50 },
  });

  const phone3Enter = spring({
    frame: frame - 17,
    fps,
    config: { damping: 10, stiffness: 50 },
  });

  // More dramatic 3D rotation for "all" view
  const getPhoneRotateY = (enter: number, position: "left" | "center" | "right") => {
    if (position === "left") {
      return interpolate(enter, [0, 1], [-70, -18], { extrapolateRight: "clamp" });
    }
    if (position === "center") {
      return interpolate(enter, [0, 1], [0, 0], { extrapolateRight: "clamp" });
    }
    return interpolate(enter, [0, 1], [70, 18], { extrapolateRight: "clamp" });
  };

  const getPhoneRotateX = (enter: number) => {
    return interpolate(enter, [0, 1], [20, 5], { extrapolateRight: "clamp" });
  };

  // Enhanced continuous movement
  const continuousRotateY = Math.sin(frame * 0.02) * 3;
  const continuousRotateX = Math.sin(frame * 0.025 + 0.5) * 2;

  // Single screen 3D rotation - more dramatic
  const singleRotateY = interpolate(
    zoomOutProgress,
    [0, 0.3, 0.7, 1],
    [-12, 8, -3, 0]
  );
  const singleRotateX = interpolate(
    zoomOutProgress,
    [0, 1],
    [15, 4]
  );

  // Scale for all view
  const getPhoneScale = (enter: number) => {
    return interpolate(enter, [0, 1], [0.5, 0.82], { extrapolateRight: "clamp" });
  };

  // Z translation - more dramatic depth
  const getPhoneZ = (enter: number, position: "left" | "center" | "right") => {
    const baseZ = interpolate(enter, [0, 1], [-300, 0], { extrapolateRight: "clamp" });
    // Center phone slightly forward
    if (position === "center") return baseZ + 50;
    return baseZ;
  };

  // Opacity
  const getPhoneOpacity = (enter: number) => {
    return interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
  };

  // Enhanced floating animation with varied frequencies
  const float1 = Math.sin(frame * 0.04) * 8 + Math.sin(frame * 0.08) * 3;
  const float2 = Math.sin(frame * 0.04 + 1.2) * 8 + Math.sin(frame * 0.07) * 3;
  const float3 = Math.sin(frame * 0.04 + 2.4) * 8 + Math.sin(frame * 0.09) * 3;

  // Get title based on screen
  const getTitle = () => {
    switch (screen) {
      case "home":
        return "Track Your Daily Progress";
      case "journal":
        return "Your Complete Meal History";
      case "recipes":
        return "Discover Healthy Recipes";
      case "all":
        return "Everything You Need";
    }
  };

  const getSubtitle = () => {
    switch (screen) {
      case "home":
        return "Real-time calories, macros, and streaks";
      case "journal":
        return "Search, filter, and analyze your meals";
      case "recipes":
        return "100+ recipes filtered by diet and goals";
      case "all":
        return "Dashboard, Journal, and Recipes";
    }
  };

  // Phone style for "all" view
  const getAllPhoneStyle = (
    enter: number,
    float: number,
    position: "left" | "center" | "right"
  ) => {
    const rotateY = getPhoneRotateY(enter, position);
    const rotateX = getPhoneRotateX(enter);
    const scale = getPhoneScale(enter);
    const z = getPhoneZ(enter, position);
    const opacity = getPhoneOpacity(enter);

    // X offset for spread
    const xOffset = position === "left" ? -30 : position === "right" ? 30 : 0;

    return {
      opacity,
      transform: `
        perspective(1400px)
        translateX(${xOffset}px)
        translateY(${float}px)
        translateZ(${z}px)
        rotateY(${rotateY + continuousRotateY}deg)
        rotateX(${rotateX + continuousRotateX}deg)
        scale(${scale})
      `,
      transformStyle: "preserve-3d" as const,
      filter: `drop-shadow(${-rotateY * 1.5}px 20px 45px rgba(0,0,0,0.5))`,
    };
  };

  // Single screen style with zoom effect
  const getSinglePhoneStyle = () => {
    const baseScale = 0.85;
    const float = Math.sin(frame * 0.04) * 6;

    return {
      opacity: 1,
      transform: `
        perspective(1400px)
        translateX(${panX}px)
        translateY(${panY + float}px)
        rotateY(${singleRotateY + continuousRotateY}deg)
        rotateX(${singleRotateX + continuousRotateX}deg)
        scale(${baseScale * singleScreenZoom})
      `,
      transformStyle: "preserve-3d" as const,
      filter: `drop-shadow(0px 30px 60px rgba(0,0,0,0.55))`,
    };
  };

  // Dancing food emojis - fixed grid positions, pulsing scale
  const foodEmojis = ['🥗', '🍎', '🥑', '🍊', '🥕', '🍇', '🥦', '🍋', '🍓', '🥝', '🍌', '🫐'];
  // Grid positions - evenly spaced, avoiding center where phone is
  const emojiPositions = [
    // Top row
    { x: -480, y: -280 },
    { x: -240, y: -320 },
    { x: 240, y: -320 },
    { x: 480, y: -280 },
    // Middle row - far left and right only (phone in center)
    { x: -520, y: -50 },
    { x: 520, y: -50 },
    // Bottom row
    { x: -480, y: 220 },
    { x: -240, y: 280 },
    { x: 240, y: 280 },
    { x: 480, y: 220 },
  ];

  const dancingEmojis = emojiPositions.map((pos, i) => {
    const emoji = foodEmojis[i % foodEmojis.length];
    // Pulsing scale - each emoji dances at different phase
    const pulsePhase = i * 0.8;
    const pulseSpeed = 0.08 + (i % 3) * 0.015;
    const scale = 1.5 + Math.sin(frame * pulseSpeed + pulsePhase) * 0.3;
    // Gentle rotation wobble
    const rotation = Math.sin(frame * 0.04 + i * 1.2) * 10;
    // Fade in at start
    const opacity = interpolate(frame, [5 + i * 2, 20 + i * 2], [0, 0.85], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return { emoji, x: pos.x, y: pos.y, rotation, scale, opacity };
  });

  // Ambient particles
  const particles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + frame * 0.01;
    const radius = 450 + Math.sin(frame * 0.02 + i) * 50;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.4;
    const size = 3 + Math.sin(frame * 0.04 + i) * 2;
    const opacity = 0.15 + Math.sin(frame * 0.03 + i * 0.5) * 0.1;

    return { x, y, size, opacity };
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${brand.surface1} 0%, ${brand.ink} 80%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        perspective: 1400,
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: "absolute",
          width: "150%",
          height: "150%",
          background: `
            radial-gradient(ellipse at 30% 30%, ${brand.matcha}10 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, ${brand.accentSky}08 0%, transparent 40%)
          `,
          transform: `rotate(${frame * 0.1}deg)`,
        }}
      />

      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${brand.matcha}12 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.02) * 0.05})`,
        }}
      />

      {/* Dancing food emojis - behind phones */}
      {dancingEmojis.map((item, i) => (
        <div
          key={`emoji-${i}`}
          style={{
            position: "absolute",
            left: `calc(50% + ${item.x}px)`,
            top: `calc(50% + ${item.y}px)`,
            fontSize: 56,
            opacity: item.opacity,
            transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
            zIndex: 0,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Ambient particles */}
      {particles.map((particle, i) => (
        <div
          key={i}
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

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: brand.matcha,
          filter: "blur(180px)",
          opacity: 0.1 + Math.sin(frame * 0.03) * 0.03,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%)`,
        }}
      />

      {/* Title with typewriter effect */}
      <div
        style={{
          position: "absolute",
          top: isAllScreens ? 80 : 110,
          textAlign: "center",
          opacity: isSingleScreen
            ? interpolate(frame, [fps * 0.6, fps * 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : titleOpacity,
          transform: `translateY(${titleY}px)`,
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
            letterSpacing: "-0.02em",
            textShadow: `0 0 30px ${brand.matcha}30`,
          }}
        >
          <TypewriterText
            text={getTitle()}
            startFrame={isSingleScreen ? Math.round(fps * 0.4) : 3}
            charsPerFrame={1.2}
            showCursor={true}
          />
        </h2>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 24,
            color: brand.sage,
            marginTop: 14,
          }}
        >
          <AnimatedWords
            text={getSubtitle()}
            startFrame={isSingleScreen ? Math.round(fps * 0.9) : Math.round(fps * 0.5)}
            staggerFrames={2}
          />
        </div>
      </div>

      {/* Phone mockups container with scene-wide 3D */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isAllScreens ? -60 : 0,
          marginTop: isAllScreens ? 70 : 100,
          transformStyle: "preserve-3d",
          transform: `
            perspective(2000px)
            rotateY(${sceneRotateY}deg)
            rotateX(${sceneRotateX}deg)
          `,
          zIndex: 5,
        }}
      >
        {/* === SINGLE SCREEN VIEWS === */}
        {screen === "home" && (
          <div style={getSinglePhoneStyle()}>
            <PhoneMockup scale={0.85}>
              <HomeScreenMockup />
            </PhoneMockup>
          </div>
        )}

        {screen === "journal" && (
          <div style={getSinglePhoneStyle()}>
            <PhoneMockup scale={0.85}>
              <JournalMockup />
            </PhoneMockup>
          </div>
        )}

        {screen === "recipes" && (
          <div style={getSinglePhoneStyle()}>
            <PhoneMockup scale={0.85}>
              <RecipeMockup />
            </PhoneMockup>
          </div>
        )}

        {/* === ALL SCREENS VIEW === */}
        {isAllScreens && (
          <>
            <div style={getAllPhoneStyle(phone1Enter, float1, "left")}>
              <PhoneMockup scale={0.82}>
                <HomeScreenMockup />
              </PhoneMockup>
            </div>

            <div style={{
              ...getAllPhoneStyle(phone2Enter, float2, "center"),
              zIndex: 10,
            }}>
              <PhoneMockup scale={0.82}>
                <JournalMockup />
              </PhoneMockup>
            </div>

            <div style={getAllPhoneStyle(phone3Enter, float3, "right")}>
              <PhoneMockup scale={0.82}>
                <RecipeMockup />
              </PhoneMockup>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
