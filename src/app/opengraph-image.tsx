import { ImageResponse } from "next/og";

export const alt =
  "KinetiX — Autonomous Ultrasonic Pick-and-Place Robotics Control Plane & 3D Digital Twin";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          padding: "56px 64px",
          border: "12px solid #222220",
          color: "#F2EFE9",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderBottom: "2px solid #222220",
            paddingBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "#FFB300",
                color: "#080808",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "24px",
              }}
            >
              KX
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "0.04em" }}>
                KINETIX
              </span>
              <span style={{ fontSize: "13px", color: "#88857E", letterSpacing: "0.14em" }}>
                SYS.REV.1.0 // ATMEGA328P + 40KHZ HC-SR04 SONAR + L298N H-BRIDGE + SG90
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "8px 18px",
              border: "2px solid #00E676",
              color: "#00E676",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            kinetix.tanisheesh.in
          </div>
        </div>

        {/* Center Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              fontSize: "16px",
              color: "#FFB300",
              fontWeight: 700,
              letterSpacing: "0.2em",
            }}
          >
            AUTONOMOUS MOBILE MANIPULATION &amp; 3D DIGITAL TWIN
          </div>
          <div
            style={{
              fontSize: "70px",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              color: "#F2EFE9",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>FIXED-PATH ROBOTS FAIL</span>
            <span style={{ color: "#FFB300" }}>ON FIRST CONTACT.</span>
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#88857E",
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            Real-time 3D WebGL Digital Twin simulating 40 kHz ultrasonic time-of-flight ranging (d = t / 58 cm), L298N dual H-Bridge switching, and 50 Hz closed-loop SG90 servo manipulation.
          </div>
        </div>

        {/* Bottom KPI Strip */}
        <div
          style={{
            display: "flex",
            width: "100%",
            borderTop: "2px solid #222220",
            paddingTop: "24px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "34px", fontWeight: 900, color: "#FFB300" }}>40 kHz</span>
            <span style={{ fontSize: "12px", color: "#88857E", letterSpacing: "0.1em" }}>
              HC-SR04 SONAR BURST
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "34px", fontWeight: 900, color: "#00E676" }}>d = t / 58</span>
            <span style={{ fontSize: "12px", color: "#88857E", letterSpacing: "0.1em" }}>
              TIME-OF-FLIGHT PRECISION
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "34px", fontWeight: 900, color: "#F2EFE9" }}>5-STATE FSM</span>
            <span style={{ fontSize: "12px", color: "#88857E", letterSpacing: "0.1em" }}>
              SEARCH · PICK · CARRY · PLACE
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "19px", fontWeight: 800, color: "#F2EFE9" }}>
              TANISH PODDAR
            </span>
            <span style={{ fontSize: "13px", color: "#88857E" }}>
              tanisheesh.in · github.com/tanisheesh
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
