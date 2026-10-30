export type RobotFsmState = "SEARCH" | "PICK" | "CARRY" | "PLACE" | "DONE";

export interface HardwareSpecItem {
  label: string;
  value: string;
}

export interface HardwareModule {
  id: string;
  code: string;
  number: number;
  name: string;
  shortName: string;
  category: string;
  slideRef: string;
  accent: string;
  role: string;
  engineeringNote: string;
  specs: HardwareSpecItem[];
  pinsUsed: string[];
}

export interface MissionStep {
  step: number;
  phase: 1 | 2;
  title: string;
  state: RobotFsmState;
  hw: string;
  desc: string;
}

export interface ArenaObstacle {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  type: "crate" | "angled" | "foam";
  label: string;
  angle: number;
}

export interface PresetScenario {
  id: string;
  code: string;
  name: string;
  description: string;
  cylinderPos: { x: number; z: number };
  targetPos: { x: number; z: number };
  obstacles: ArenaObstacle[];
}

export const FSM_STAGES: {
  id: RobotFsmState;
  code: string;
  label: string;
  condition: string;
  action: string;
}[] = [
  {
    id: "SEARCH",
    code: "STATE_01",
    label: "SEARCH & APPROACH",
    condition: "d > 5.0 cm",
    action: "HC-SR04 scans at 40 kHz; L298N drives motors forward, creeping when d < 20 cm",
  },
  {
    id: "PICK",
    code: "STATE_02",
    label: "PICK OBJECT",
    condition: "d ≤ 5.0 cm",
    action: "Motors halt; SG90 servo rotates from 90° (1.5 ms) to 30° (1.17 ms) to clamp cylinder",
  },
  {
    id: "CARRY",
    code: "STATE_03",
    label: "CARRY & AVOID",
    condition: "Gripper Locked",
    action: "Navigates to target; if d ≤ 20 cm, halts and executes differential spin-in-place bypass",
  },
  {
    id: "PLACE",
    code: "STATE_04",
    label: "PLACE AT TARGET",
    condition: "Target Reached",
    action: "Halts at drop zone; SG90 returns to 90° open angle and chassis reverses slightly to clear",
  },
  {
    id: "DONE",
    code: "STATE_05",
    label: "MISSION COMPLETE",
    condition: "Payload Released",
    action: "ENA/ENB PWM set to 0, H-Bridge switches open, autonomous cycle terminated",
  },
];

export const TWELVE_STEPS: MissionStep[] = [
  {
    step: 1,
    phase: 1,
    title: "SYSTEM BOOT & INIT",
    state: "SEARCH",
    hw: "Battery · ATmega328P",
    desc: "Arduino UNO boots, configures GPIO directions, attaches D9 servo to 90° open, and zeroes motor PWM.",
  },
  {
    step: 2,
    phase: 1,
    title: "DRIVE TO PICK ZONE",
    state: "SEARCH",
    hw: "L298N · DC Gearmotors",
    desc: "Arduino sets IN1=1, IN2=0, IN3=1, IN4=0 with PWM=170 so both wheel pairs propel the chassis forward.",
  },
  {
    step: 3,
    phase: 1,
    title: "ULTRASONIC OBJECT LOCK",
    state: "SEARCH",
    hw: "HC-SR04 · Pin D10/D11",
    desc: "40 kHz 8-pulse burst reflects off the hollow cylinder; Echo pulse width t (µs) ÷ 58 locates the object.",
  },
  {
    step: 4,
    phase: 1,
    title: "PRECISION CREEP APPROACH",
    state: "SEARCH",
    hw: "HC-SR04 · ENA/ENB PWM",
    desc: "Duty cycle throttles down to creep speed (PWM=115) until cylinder sits ≤ 5 cm centered between open jaws.",
  },
  {
    step: 5,
    phase: 1,
    title: "ACTUATE SERVO GRIPPER",
    state: "PICK",
    hw: "SG90 Servo · Pin D9",
    desc: "Motors brake; Pin D9 shifts 50 Hz pulse width from 1.50 ms (90°) to 1.17 ms (30°), squeezing rubber pads.",
  },
  {
    step: 6,
    phase: 1,
    title: "PAYLOAD LOCK & TRANSITION",
    state: "PICK",
    hw: "Closed-Loop Potentiometer",
    desc: "1000 ms stabilization dwell confirms servo closed-loop torque lock; FSM transitions from PICK to CARRY.",
  },
  {
    step: 7,
    phase: 2,
    title: "CONTINUOUS OBSTACLE SCAN",
    state: "CARRY",
    hw: "HC-SR04 · 15° Sonar Cone",
    desc: "While transporting payload, any echo returning with d ≤ 20 cm (t ≤ 1160 µs) triggers an obstacle interrupt.",
  },
  {
    step: 8,
    phase: 2,
    title: "DIFFERENTIAL SPIN BYPASS",
    state: "CARRY",
    hw: "L298N · H-Bridge S1–S4",
    desc: "Left wheel drives forward (IN1=1, IN2=0) while right wheel reverses (IN3=0, IN4=1) to pivot clear of obstacle.",
  },
  {
    step: 9,
    phase: 2,
    title: "TRAVERSE TO TARGET ZONE",
    state: "CARRY",
    hw: "1:48 Geared Drive",
    desc: "Once ultrasonic line-of-sight reads > 20 cm clear, chassis rejoins trajectory toward designated drop zone.",
  },
  {
    step: 10,
    phase: 2,
    title: "OPEN GRIPPER JAWS",
    state: "PLACE",
    hw: "SG90 Servo · Pin D9",
    desc: "Upon reaching target coordinates, robot halts and commands gripper.write(90) (1.5 ms pulse) to open jaws.",
  },
  {
    step: 11,
    phase: 2,
    title: "DEPOSIT & CLEARANCE BACKUP",
    state: "PLACE",
    hw: "L298N Reverse (S3+S2)",
    desc: "Hollow cylinder rests stably on target pad; robot reverses briefly so open jaws clear the payload.",
  },
  {
    step: 12,
    phase: 2,
    title: "AUTONOMOUS CYCLE HALT",
    state: "DONE",
    hw: "ATmega328P Controller",
    desc: "All H-Bridge enable lines drop LOW (0V), servo remains at 90°, and FSM enters terminal DONE state.",
  },
];

export const HARDWARE_MODULES: HardwareModule[] = [
  {
    id: "arduino",
    code: "MOD_01",
    number: 1,
    name: "Arduino UNO R3 (ATmega328P)",
    shortName: "Arduino UNO",
    category: "CONTROLLER // BRAIN",
    slideRef: "Slides 6, 7, 17, 18",
    accent: "#00e5ff",
    role: "Executes the 5-state control loop at 16 MHz: triggers the HC-SR04, times the Echo pulse via pulseIn(), computes distance d = t / 58, drives L298N direction/PWM pins, and generates the 50 Hz servo control signal.",
    engineeringNote:
      "Each ATmega328P GPIO pin sources at most ~20 mA safe continuous current at 5 V — far below the 100–500 mA required by DC gearmotors, necessitating the L298N power stage.",
    specs: [
      { label: "MCU Architecture", value: "8-bit AVR ATmega328P" },
      { label: "Clock Frequency", value: "16 MHz Ceramic Resonator" },
      { label: "Logic / Input Voltage", value: "5 V Logic (7–12 V Vin)" },
      { label: "Digital I/O Pins", value: "14 Pins (6 Hardware PWM ~)" },
      { label: "Analog Inputs", value: "6 Channels (10-bit ADC)" },
      { label: "Memory", value: "32 KB Flash · 2 KB SRAM" },
      { label: "Max GPIO Current", value: "~20 mA per pin" },
    ],
    pinsUsed: [
      "D10 (OUTPUT) → HC-SR04 Trig (10 µs pulse)",
      "D11 (INPUT)  → HC-SR04 Echo (Time-of-Flight)",
      "D5  (PWM ~)  → L298N ENA (Left Motor Speed)",
      "D7 / D8      → L298N IN1 / IN2 (Left Dir)",
      "D6  (PWM ~)  → L298N ENB (Right Motor Speed)",
      "D4 / D2      → L298N IN3 / IN4 (Right Dir)",
      "D9  (PWM ~)  → SG90 Servo Signal (50 Hz)",
    ],
  },
  {
    id: "hcsr04",
    code: "MOD_02",
    number: 2,
    name: "HC-SR04 Ultrasonic Ranging Module",
    shortName: "HC-SR04 Sonar",
    category: "SENSING // INPUT",
    slideRef: "Slides 8, 9, 17, 18",
    accent: "#ffb300",
    role: "Non-contact acoustic time-of-flight distance sensor. Emits an 8-cycle burst of 40 kHz ultrasound from Transmitter (T) and measures round-trip reflection time at Receiver (R).",
    engineeringNote:
      "Sound travels at 343 m/s (0.0343 cm/µs). Dividing round-trip travel by 2 yields d = (t × 0.0343) / 2 = t / 58.3 cm. At d = 20 cm, Echo stays HIGH for exactly 1160 µs.",
    specs: [
      { label: "Detection Range", value: "2 cm – 400 cm" },
      { label: "Acoustic Frequency", value: "40 kHz (8-Pulse Burst)" },
      { label: "Directional Cone", value: "≈ 15° Effective Beam Angle" },
      { label: "Supply Voltage", value: "5.0 V DC (~15 mA active)" },
      { label: "Trigger Pulse", value: "10 µs HIGH on Trig Pin" },
      { label: "Governing Formula", value: "d (cm) = Echo (µs) ÷ 58" },
    ],
    pinsUsed: [
      "VCC  → Arduino 5V Rail",
      "Trig → Arduino Pin D10",
      "Echo → Arduino Pin D11",
      "GND  → Common System Ground (0V)",
    ],
  },
  {
    id: "l298n",
    code: "MOD_03",
    number: 3,
    name: "L298N Dual Full-Bridge Driver",
    shortName: "L298N H-Bridge",
    category: "POWER STAGE // MUSCLE",
    slideRef: "Slides 10, 11, 17, 18",
    accent: "#ff2a2a",
    role: "Amplifies low-current 5 V logic signals from the Arduino into high-current bidirectional 7.4 V–12 V power for two independent DC motor channels using dual H-Bridge switch networks (S1–S4).",
    engineeringNote:
      "Closing diagonal pair S1+S4 drives current left-to-right (Forward); closing S3+S2 reverses polarity (Reverse); closing S1+S3 or S2+S4 dynamically brakes the rotor.",
    specs: [
      { label: "Topology", value: "Dual Full H-Bridge (L298N IC)" },
      { label: "Continuous Current", value: "2.0 A per channel (4 A total)" },
      { label: "Motor Supply Range", value: "5 V – 35 V DC" },
      { label: "Internal BJT Drop", value: "~2.0 V thermal drop across IC" },
      { label: "On-Board Regulator", value: "78M05 5V Output (when Vin > 7V)" },
      { label: "Speed Modulation", value: "8-bit PWM on ENA / ENB (0–255)" },
    ],
    pinsUsed: [
      "ENA (D5), IN1 (D7), IN2 (D8) → Motor A (Left)",
      "ENB (D6), IN3 (D4), IN4 (D2) → Motor B (Right)",
      "OUT1 / OUT2 → Left Gearmotors",
      "OUT3 / OUT4 → Right Gearmotors",
      "12V → Battery (+), GND → Battery (–) & Arduino GND",
    ],
  },
  {
    id: "motors",
    code: "MOD_04",
    number: 4,
    name: "1:48 Geared DC Motors & 65mm Wheels",
    shortName: "DC Gearmotors",
    category: "LOCOMOTION // DRIVE",
    slideRef: "Slides 6, 12, 16",
    accent: "#00e676",
    role: "Converts electrical power into high-torque mechanical wheel rotation. Differential speed control between left and right wheel pairs steers and spins the robot without a steering rack.",
    engineeringNote:
      "A bare hobby DC motor spins at >8,000 RPM with negligible torque. The 1:48 multi-stage spur gearbox steps speed down to ~150 RPM while multiplying shaft torque nearly 48×.",
    specs: [
      { label: "Nominal Voltage", value: "6.0 V – 12.0 V DC" },
      { label: "Reduction Ratio", value: "1:48 Geared Down" },
      { label: "Loaded Wheel Speed", value: "100 – 200 RPM" },
      { label: "Current Draw", value: "150 mA nominal · 1.2 A stall" },
      { label: "Wheel Diameter", value: "65 mm Rubber-Treaded Tyres" },
      { label: "Kinematics", value: "Differential Drive (v_L vs v_R)" },
    ],
    pinsUsed: [
      "Left Motor Terminals  → L298N OUT1 & OUT2",
      "Right Motor Terminals → L298N OUT3 & OUT4",
    ],
  },
  {
    id: "servo",
    code: "MOD_05",
    number: 5,
    name: "SG90 Closed-Loop Servo & 2-Jaw Gripper",
    shortName: "SG90 Gripper",
    category: "MANIPULATION // ACTUATOR",
    slideRef: "Slides 13, 14, 15",
    accent: "#c084fc",
    role: "Actuates the parallel two-jaw mechanical gripper to open wide (90°) during approach and clamp firmly (30°) around the hollow non-metallic cylinder during transport.",
    engineeringNote:
      "Contains an internal DC motor, reduction gear train, potentiometer shaft sensor, and error-amplifier IC. Driven by a 50 Hz (20 ms) PWM pulse: 1.0 ms = 0°, 1.5 ms = 90°, 2.0 ms = 180°.",
    specs: [
      { label: "Actuator Model", value: "TowerPro SG90 Micro Servo" },
      { label: "Operating Voltage", value: "4.8 V – 6.0 V DC" },
      { label: "Angular Range", value: "0° to 180° (Closed-Loop)" },
      { label: "Stall Torque", value: "1.8 kg·cm at 4.8 V" },
      { label: "PWM Period", value: "20 ms (50 Hz Refresh Rate)" },
      { label: "Gripper Angles", value: "90° (1.5ms Open) · 30° (1.17ms Grip)" },
    ],
    pinsUsed: [
      "Orange (PWM Signal) → Arduino Pin D9",
      "Red (+VCC)          → 5V Regulated Rail",
      "Brown (Ground)      → Common System Ground",
    ],
  },
  {
    id: "chassis",
    code: "MOD_06",
    number: 6,
    name: "Acrylic Chassis, 7.4V Li-Ion Pack & Harness",
    shortName: "Chassis & Power",
    category: "STRUCTURAL & POWER",
    slideRef: "Slides 5, 6, 16, 18, 22",
    accent: "#ff5500",
    role: "Provides rigid mechanical mounting with front-mounted sensor/gripper, mid-mounted controller/driver, and rear-mounted 2×18650 Li-ion battery pack for longitudinal balance.",
    engineeringNote:
      "All modules share a mandatory Common Ground bus (0V reference). Without a unified GND between Battery (–), L298N, and Arduino, logic voltages float and cause erratic actuation.",
    specs: [
      { label: "Chassis Frame", value: "Dual-Deck Laser-Cut Acrylic" },
      { label: "Primary Power", value: "2×18650 Li-Ion (7.4 V) / 6×AA (9 V)" },
      { label: "Target Payload", value: "Hollow Non-Metallic Cylinder (<50g)" },
      { label: "Interconnects", value: "Solderless M-M / M-F Jumper Wires" },
      { label: "Reference Bus", value: "Unified Star/Bus Common Ground" },
    ],
    pinsUsed: [
      "Battery (+) → L298N +12V Power Terminal",
      "Battery (–) → Common Ground Bus (L298N GND + Arduino GND)",
      "L298N +5V   → Arduino 5V Rail & Peripherals",
    ],
  },
];

export const STATE_MACHINE_CODE = [
  { line: 1, code: "d = readDistanceCm();          // HC-SR04: d = echo_us / 58.0" },
  { line: 2, code: "if (state == SEARCH) {" },
  { line: 3, code: "  if (d > 5.0) forward();      // Approach cylinder in Pick Zone" },
  { line: 4, code: "  else { stopMotors(); state = PICK; }" },
  { line: 5, code: "} else if (state == PICK) {" },
  { line: 6, code: "  gripper.write(30); delay(1000); state = CARRY;" },
  { line: 7, code: "} else if (state == CARRY) {" },
  { line: 8, code: "  if (d <= 20.0) { stopMotors(); turn(); } // Avoid obstacle" },
  { line: 9, code: "  else if (!atTarget()) forward();" },
  { line: 10, code: "  else { stopMotors(); state = PLACE; }" },
  { line: 11, code: "} else if (state == PLACE) {" },
  { line: 12, code: "  gripper.write(90); delay(1000); state = DONE;" },
  { line: 13, code: "} else stopMotors();           // Autonomous cycle complete" },
];

export const FULL_ARDUINO_SKETCH = `// ============================================================================
// KINETIX // AUTONOMOUS ULTRASONIC PICK-AND-PLACE ROBOT FIRMWARE
// Hardware: Arduino UNO (ATmega328P) + HC-SR04 + L298N H-Bridge + SG90 Servo
// ============================================================================

#include <Servo.h>

// --- Pin Definitions (Slide 18 Hardware Wiring Map) ---
const int TRIG_PIN  = 10;  // HC-SR04 Trigger Input (10 us HIGH pulse)
const int ECHO_PIN  = 11;  // HC-SR04 Echo Output (Time-of-Flight pulse)

const int ENA_PIN   = 5;   // Left Motor Channel Speed (PWM 0-255)
const int IN1_PIN   = 7;   // Left H-Bridge Direction Input 1
const int IN2_PIN   = 8;   // Left H-Bridge Direction Input 2

const int ENB_PIN   = 6;   // Right Motor Channel Speed (PWM 0-255)
const int IN3_PIN   = 4;   // Right H-Bridge Direction Input 3
const int IN4_PIN   = 2;   // Right H-Bridge Direction Input 4

const int SERVO_PIN = 9;   // SG90 Gripper Servo PWM Signal (50 Hz / 20 ms)

// --- Tunable Control Thresholds (Slides 15, 21, 24) ---
const int GRIP_OPEN_DEG     = 90;  // 1.50 ms pulse -> Jaws open wide
const int GRIP_CLOSED_DEG   = 30;  // 1.17 ms pulse -> Jaws clamp cylinder
const float PICK_DIST_CM    = 5.0; // Stop & grip distance threshold
const float AVOID_DIST_CM   = 20.0;// Obstacle avoidance distance threshold

const int CRUISE_PWM        = 170; // Normal forward duty cycle (0-255)
const int CREEP_PWM         = 115; // Slow precision approach duty cycle
const int SPIN_PWM          = 190; // Differential turn duty cycle

enum RobotState { SEARCH, PICK, CARRY, PLACE, DONE };
RobotState state = SEARCH;
Servo gripper;

unsigned long carryElapsedMs = 0;
unsigned long prevLoopMs     = 0;
const unsigned long TARGET_REACH_MS = 8000;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(ENA_PIN, OUTPUT); pinMode(IN1_PIN, OUTPUT); pinMode(IN2_PIN, OUTPUT);
  pinMode(ENB_PIN, OUTPUT); pinMode(IN3_PIN, OUTPUT); pinMode(IN4_PIN, OUTPUT);

  gripper.attach(SERVO_PIN);
  gripper.write(GRIP_OPEN_DEG);
  stopMotors();
  delay(1000);
  prevLoopMs = millis();
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long durationUs = pulseIn(ECHO_PIN, HIGH, 30000);
  if (durationUs == 0) return 400.0;
  return (float)durationUs / 58.0; // Slide 9: d = (t * 0.0343) / 2 = t / 58
}

void forward(int pwm) {
  digitalWrite(IN1_PIN, HIGH); digitalWrite(IN2_PIN, LOW); analogWrite(ENA_PIN, pwm);
  digitalWrite(IN3_PIN, HIGH); digitalWrite(IN4_PIN, LOW); analogWrite(ENB_PIN, pwm);
}

void spinRight(int pwm) {
  digitalWrite(IN1_PIN, HIGH); digitalWrite(IN2_PIN, LOW); analogWrite(ENA_PIN, pwm);
  digitalWrite(IN3_PIN, LOW);  digitalWrite(IN4_PIN, HIGH); analogWrite(ENB_PIN, pwm);
}

void reverseSlow(int pwm) {
  digitalWrite(IN1_PIN, LOW);  digitalWrite(IN2_PIN, HIGH); analogWrite(ENA_PIN, pwm);
  digitalWrite(IN3_PIN, LOW);  digitalWrite(IN4_PIN, HIGH); analogWrite(ENB_PIN, pwm);
}

void stopMotors() {
  digitalWrite(IN1_PIN, LOW); digitalWrite(IN2_PIN, LOW); analogWrite(ENA_PIN, 0);
  digitalWrite(IN3_PIN, LOW); digitalWrite(IN4_PIN, LOW); analogWrite(ENB_PIN, 0);
}

bool atTarget() {
  return carryElapsedMs >= TARGET_REACH_MS;
}

void loop() {
  unsigned long now = millis();
  unsigned long dt = now - prevLoopMs;
  prevLoopMs = now;

  float d = readDistanceCm();

  if (state == SEARCH) {
    if (d > PICK_DIST_CM) {
      forward(d < 22.0 ? CREEP_PWM : CRUISE_PWM);
    } else {
      stopMotors();
      state = PICK;
    }
  } else if (state == PICK) {
    gripper.write(GRIP_CLOSED_DEG);
    delay(1000);
    state = CARRY;
    carryElapsedMs = 0;
  } else if (state == CARRY) {
    if (d <= AVOID_DIST_CM) {
      stopMotors();
      delay(200);
      spinRight(SPIN_PWM);
      delay(450);
      stopMotors();
    } else if (!atTarget()) {
      forward(CRUISE_PWM);
      carryElapsedMs += dt;
    } else {
      stopMotors();
      state = PLACE;
    }
  } else if (state == PLACE) {
    gripper.write(GRIP_OPEN_DEG);
    delay(800);
    reverseSlow(CREEP_PWM);
    delay(450);
    stopMotors();
    state = DONE;
  } else {
    stopMotors();
  }
  delay(40);
}`;

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "standard",
    code: "SCEN_01",
    name: "CLASSIC OBSTACLE BYPASS (SLIDE 21)",
    description:
      "Acquire the hollow cylinder in the Pick Zone (d ≤ 5 cm), detect the central obstacle at d ≤ 20 cm, execute a differential spin-in-place bypass, and deposit at the Target Zone.",
    cylinderPos: { x: -3.2, z: 0.0 },
    targetPos: { x: 5.2, z: 0.0 },
    obstacles: [
      {
        id: "obs-1",
        x: 1.0,
        z: 0.0,
        w: 1.25,
        d: 1.4,
        h: 1.1,
        type: "crate",
        label: "OBSTACLE_01",
        angle: 0,
      },
    ],
  },
  {
    id: "slalom",
    code: "SCEN_02",
    name: "MULTI-CRATE WAREHOUSE CORRIDOR",
    description:
      "Staggered dual-obstacle industrial corridor requiring sequential 40 kHz time-of-flight detections and multi-point differential steering corrections.",
    cylinderPos: { x: -3.5, z: -0.4 },
    targetPos: { x: 5.3, z: 0.5 },
    obstacles: [
      {
        id: "obs-a",
        x: 0.2,
        z: -0.45,
        w: 1.2,
        d: 1.35,
        h: 1.1,
        type: "crate",
        label: "CRATE_ALPHA",
        angle: 0,
      },
      {
        id: "obs-b",
        x: 2.7,
        z: 0.95,
        w: 1.2,
        d: 1.35,
        h: 1.1,
        type: "crate",
        label: "CRATE_BETA",
        angle: 0,
      },
    ],
  },
  {
    id: "acoustic_stress",
    code: "SCEN_03",
    name: "SLIDE 26 ACOUSTIC LIMITATIONS STRESS-TEST",
    description:
      "Evaluates HC-SR04 physical failure modes (Slide 26): a 45° angled specular wall that deflects 40 kHz echoes and an acoustic foam block that absorbs sound unless YOLOv8 Vision is enabled.",
    cylinderPos: { x: -3.2, z: 0.0 },
    targetPos: { x: 5.2, z: 0.0 },
    obstacles: [
      {
        id: "obs-angled",
        x: 0.6,
        z: 0.1,
        w: 1.35,
        d: 0.5,
        h: 1.1,
        type: "angled",
        label: "45° DEFLECTOR",
        angle: Math.PI / 4,
      },
      {
        id: "obs-foam",
        x: 2.8,
        z: -1.0,
        w: 1.2,
        d: 1.2,
        h: 1.0,
        type: "foam",
        label: "FOAM ABSORBER",
        angle: 0,
      },
    ],
  },
];

export const VIVA_DEFENSE_QA = [
  {
    code: "Q_01",
    slide: "Slide 10",
    question: "Why can't we drive the DC motors directly from the Arduino UNO digital pins?",
    answer:
      "Three hardware constraints: (1) Current limit: an ATmega328P I/O pin sources at most ~20 mA, whereas a 1:48 geared DC motor draws 150–500 mA continuously and >1 A at stall. (2) Voltage mismatch: the motors require 6–12 V for rated torque while Arduino logic operates at 5 V. (3) Inductive Back-EMF: switching inductive motor windings generates reverse voltage spikes that would destroy the microcontroller without an H-Bridge driver.",
  },
  {
    code: "Q_02",
    slide: "Slide 9",
    question: "Where does the constant 58 come from in the HC-SR04 formula d (cm) = t (µs) ÷ 58?",
    answer:
      "At room temperature, sound travels in air at v ≈ 343 m/s = 0.0343 cm/µs. Because the ultrasonic burst travels from the transmitter to the obstacle AND reflects back to the receiver (total path = 2d), one-way distance is d = (t × 0.0343) / 2 = t × 0.01715 cm. Taking the reciprocal gives 1 / 0.01715 ≈ 58.3 µs/cm, so dividing Echo HIGH time in microseconds by 58 yields distance in centimeters.",
  },
  {
    code: "Q_03",
    slide: "Slides 13, 14, 17",
    question: "Why is the SG90 servo connected directly to Arduino Pin D9 instead of through the L298N driver?",
    answer:
      "Unlike a raw two-wire DC motor, a hobby servo is a complete closed-loop mechatronic subsystem containing its own internal H-bridge driver IC, gear train, and feedback potentiometer. Its power comes from the 5 V rail, while Pin D9 only transmits a low-current (<5 mA) 50 Hz PWM timing signal (1.0 ms to 2.0 ms pulse width) instructing the internal comparator which target angle to hold.",
  },
  {
    code: "Q_04",
    slide: "Slides 19, 24, 26",
    question: "With only a single ultrasonic distance sensor, how does the robot distinguish the pick object from an obstacle?",
    answer:
      "By task phase inside the 5-state Deterministic Finite Automaton (DFA). In the SEARCH state, the arena pick zone is ahead, so the first ultrasonic reflection is treated as the target cylinder (approached down to d ≤ 5 cm and gripped). Once the state transitions to CARRY, the payload is already held in the jaws, so any subsequent reflection with d ≤ 20 cm is classified as an obstacle and triggers the differential spin bypass.",
  },
  {
    code: "Q_05",
    slide: "Slide 18",
    question: "Why must the Battery (–), L298N GND, Arduino GND, HC-SR04 GND, and SG90 Brown wire all be tied together?",
    answer:
      "All digital logic signals (5 V HIGH, 0 V LOW) and PWM duty pulses are potential differences measured relative to a 0 V reference node. Without a unified Common Ground bus, the Arduino and L298N float at different reference potentials, causing the H-Bridge logic gates and servo comparator to misinterpret control signals and behave randomly.",
  },
  {
    code: "Q_06",
    slide: "Slides 26 & 27",
    question: "What are the physical limitations of the current design and how does v2 (Future Scope) solve them?",
    answer:
      "(1) Narrow 15° beam cone and acoustic absorption/deflection on soft foam or >45° angled walls → solved by adding a camera + YOLOv8 object detection and 360° LiDAR. (2) Open-loop target distance estimation drifts under wheel slip or battery voltage sag → solved by wheel encoders and ROS-based SLAM localization. (3) Single lightweight cylindrical payload (1.8 kg·cm SG90 limit) → solved by a parallel-jaw high-torque metal-gear gripper and multi-DOF robotic arm.",
  },
];
