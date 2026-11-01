import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#080808",
          border: "12px solid #FFB300",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFB300",
          fontWeight: 900,
          fontSize: 78,
          fontFamily: "sans-serif",
        }}
      >
        KX
      </div>
    ),
    { ...size }
  );
}
