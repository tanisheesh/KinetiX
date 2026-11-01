import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KinetiX — Autonomous Pick-and-Place Robotics Digital Twin",
    short_name: "KinetiX",
    description:
      "Interactive 3D WebGL Digital Twin and Hardware Telemetry Workbench for an Arduino UNO + HC-SR04 + L298N + SG90 Autonomous Pick-and-Place Robot.",
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#FFB300",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
