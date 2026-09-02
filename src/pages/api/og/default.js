// Default Open Graph image for non-country pages.
import { ImageResponse } from "next/og";

export const config = { runtime: "edge" };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(120deg, #4f46e5 0%, #06b6d4 100%)",
          color: "white",
          fontFamily: "sans-serif",
          textAlign: "center",
          padding: "64px",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.9 }}>🌍 Atlas</div>
        <div style={{ fontSize: 84, fontWeight: 800, marginTop: 16 }}>Explore the World.</div>
        <div style={{ fontSize: 32, opacity: 0.9, marginTop: 16, maxWidth: 900 }}>
          Discover, compare and understand every country on Earth.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
