# Local Setup — KinetiX

> **Just want to try it?** Use the live demo at [https://kinetix.tanisheesh.in](https://kinetix.tanisheesh.in) — no setup needed.
> This guide is for running KinetiX locally or flashing the firmware onto a physical Arduino UNO R3.

---

## Prerequisites

- Node.js 22+ and npm 10+
- (Optional, for physical robot) Arduino IDE 2.x + Arduino UNO R3 board

---

## 1. Clone and install

```bash
git clone https://github.com/tanisheesh/KinetiX
cd KinetiX
npm install
```

---

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Optional local override (defaults to `https://kinetix.tanisheesh.in`) |

---

## 3. Run locally

```bash
npm run dev
```

KinetiX will be running at `http://localhost:3000`.

- `http://localhost:3000/` — Specification, 5-State DFA & 12-Step Matrix
- `http://localhost:3000/playground` — Interactive 3D Digital Twin Stage & Telemetry Workbench
- `http://localhost:3000/hardware` — 9-Module Datasheets, Fault Wiring Schematic & `.ino` Download
- `http://localhost:3000/how-it-works` — Kinematics, Truth Tables, V2 Upgrades & Design Rationale

---

## 4. Flashing the Arduino UNO Firmware (Optional Physical Build)

1. Open `http://localhost:3000/hardware` and click **DOWNLOAD .INO ↓** to save `KinetiX_Autonomous_Pick_Place.ino`.
2. Wire the components according to the Hardware Pin Map (`D10` Trig, `D11` Echo, `D5/D7/D8` Left Motor, `D6/D4/D2` Right Motor, `D9` SG90 Servo, and unified Common Ground).
3. Open the `.ino` file in Arduino IDE, select **Board: Arduino UNO**, and click **Upload**.

---

## 5. Deploy to production

See [DEPLOY.md](DEPLOY.md) for production deployment, custom domain and rollback steps.

---

<div align="center">

<h3>Tanish Poddar</h3>

<a href="https://tanisheesh.in"><img src="https://img.shields.io/badge/Website-tanisheesh.in-111111?style=flat-square&logo=googlechrome&logoColor=white" alt="Website"></a>
<a href="https://linkedin.com/in/tanisheesh"><img src="https://img.shields.io/badge/LinkedIn-tanisheesh-0A66C2?style=flat-square" alt="LinkedIn"></a>
<a href="https://github.com/tanisheesh"><img src="https://img.shields.io/badge/GitHub-tanisheesh-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
<a href="mailto:hi@tanisheesh.in"><img src="https://img.shields.io/badge/Email-hi%40tanisheesh.in-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email"></a>

</div>
