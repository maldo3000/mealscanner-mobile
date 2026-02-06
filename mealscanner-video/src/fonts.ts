import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const loadFonts = async () => {
  await loadFont({
    family: "Telegraf",
    url: staticFile("Telegraf-UltraBold-800.otf"),
    weight: "800",
  });
};

// Font family constants
export const fonts = {
  heading: "Telegraf, Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
} as const;

// Load fonts immediately
loadFonts();
