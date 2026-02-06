import React from "react";
import { brand } from "../brand";

type PhoneMockupProps = {
  children: React.ReactNode;
  scale?: number;
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  scale = 1,
}) => {
  const phoneWidth = 375;
  const phoneHeight = 812;
  const bezelWidth = 12;
  const cornerRadius = 50;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      {/* Phone outer frame */}
      <div
        style={{
          width: phoneWidth + bezelWidth * 2,
          height: phoneHeight + bezelWidth * 2,
          background: "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)",
          borderRadius: cornerRadius + bezelWidth,
          padding: bezelWidth,
          boxShadow: `
            0 50px 100px rgba(0, 0, 0, 0.5),
            0 20px 40px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          position: "relative",
        }}
      >
        {/* Side button */}
        <div
          style={{
            position: "absolute",
            right: -3,
            top: 120,
            width: 3,
            height: 80,
            background: "#333",
            borderRadius: "0 2px 2px 0",
          }}
        />

        {/* Volume buttons */}
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 100,
            width: 3,
            height: 30,
            background: "#333",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 150,
            width: 3,
            height: 55,
            background: "#333",
            borderRadius: "2px 0 0 2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -3,
            top: 215,
            width: 3,
            height: 55,
            background: "#333",
            borderRadius: "2px 0 0 2px",
          }}
        />

        {/* Screen container */}
        <div
          style={{
            width: phoneWidth,
            height: phoneHeight,
            borderRadius: cornerRadius,
            overflow: "hidden",
            background: brand.ink,
            position: "relative",
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 126,
              height: 37,
              background: "#000",
              borderRadius: 20,
              zIndex: 10,
            }}
          />

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
              width: 134,
              height: 5,
              background: "rgba(255, 255, 255, 0.3)",
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    </div>
  );
};
