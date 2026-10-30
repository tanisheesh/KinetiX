import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://kinetix.tanisheesh.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#080808",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KinetiX — Autonomous Ultrasonic Pick-and-Place Robotics Digital Twin",
    template: "%s | KinetiX",
  },
  description:
    "Interactive 3D WebGL Digital Twin and Hardware Telemetry Workbench for an Autonomous Obstacle-Avoiding Pick-and-Place Mobile Robot (Arduino UNO ATmega328P + 40 kHz HC-SR04 Sonar + L298N Dual H-Bridge + 50 Hz SG90 Closed-Loop Servo Gripper).",
  applicationName: "KinetiX",
  authors: [{ name: "Tanish Poddar", url: "https://tanisheesh.in" }],
  creator: "Tanish Poddar",
  publisher: "Tanish Poddar",
  keywords: [
    "KinetiX",
    "Pick and Place Robot",
    "Obstacle Avoiding Robot",
    "Arduino UNO Robotics",
    "HC-SR04 Ultrasonic Sensor",
    "L298N H-Bridge Motor Driver",
    "SG90 Servo Gripper",
    "Robotics Digital Twin",
    "Three.js Robotics Simulation",
    "Differential Drive Kinematics",
    "Finite State Machine Robotics",
    "Tanish Poddar",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "KinetiX",
    title: "KinetiX — Autonomous Ultrasonic Pick-and-Place Robotics Digital Twin",
    description:
      "Fixed-path robots fail on first contact. KinetiX simulates a 5-state autonomous rover with 40 kHz ultrasonic raycasting, L298N H-Bridge switching, and 50 Hz SG90 servo manipulation in real time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KinetiX — Autonomous Ultrasonic Pick-and-Place Robotics Digital Twin",
    description:
      "3D WebGL Robotics Digital Twin: ATmega328P 5-State FSM + HC-SR04 Time-of-Flight Oscilloscope + L298N H-Bridge Switch Matrix + SG90 Closed-Loop Gripper.",
    creator: "@tanisheeshh",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "KinetiX",
  operatingSystem: "Web, Arduino AVR, Linux, Windows, macOS",
  applicationCategory: "DeveloperApplication",
  url: SITE_URL,
  author: [
    {
      "@type": "Person",
      name: "Tanish Poddar",
      url: "https://tanisheesh.in",
    },
  ],
  description:
    "Interactive 3D WebGL Digital Twin and Hardware Telemetry Workbench for an Autonomous Ultrasonic Pick-and-Place Mobile Robot.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen overflow-x-hidden antialiased selection:bg-[#ffb300] selection:text-black">
        {children}
      </body>
    </html>
  );
}
