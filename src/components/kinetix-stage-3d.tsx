"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ArenaObstacle,
  HARDWARE_MODULES,
  RobotFsmState,
} from "@/lib/kinetix-data";

export const WORLD_TO_CM = 10.0; // 1 world unit = 10 cm (2.0 units = 20 cm, 0.5 units = 5 cm)

export interface StageTelemetry {
  x: number;
  z: number;
  headingDeg: number;
  state: RobotFsmState;
  subStageText: string;
  stepNum: number;
  activeCodeLine: number;
  distanceCm: number;
  echoUs: number;
  gripAngle: number;
  servoPulseMs: number;
  hasCylinder: boolean;
  leftPwm: number;
  rightPwm: number;
  in1: number;
  in2: number;
  in3: number;
  in4: number;
}

interface KinetiXStage3DProps {
  isRunning: boolean;
  simSpeed: number;
  mode: "auto" | "manual";
  resetId: number;
  obstacleThresholdCm: number;
  pickDistCm: number;
  motorPwm: number;
  obstacles: ArenaObstacle[];
  setObstacles: React.Dispatch<React.SetStateAction<ArenaObstacle[]>>;
  cylinderPos: { x: number; z: number };
  setCylinderPos: React.Dispatch<React.SetStateAction<{ x: number; z: number }>>;
  targetPos: { x: number; z: number };
  cameraMode: "orbit" | "chase" | "pov" | "top" | "xray";
  selectedPart: string;
  setSelectedPart: (id: string) => void;
  yoloEnabled: boolean;
  slamEnabled: boolean;
  manualKeys: {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    gripClosed: boolean;
  };
  onTelemetryUpdate: (t: StageTelemetry) => void;
}

interface ProjectedTag {
  id: string;
  code: string;
  title: string;
  sub: string;
  border: string;
  accent: string;
  x: number;
  y: number;
}

export default function KinetiXStage3D({
  isRunning,
  simSpeed,
  mode,
  resetId,
  obstacleThresholdCm,
  pickDistCm,
  motorPwm,
  obstacles,
  setObstacles,
  cylinderPos,
  setCylinderPos,
  targetPos,
  cameraMode,
  selectedPart,
  setSelectedPart,
  yoloEnabled,
  slamEnabled,
  manualKeys,
  onTelemetryUpdate,
}: KinetiXStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [worldTags, setWorldTags] = useState<ProjectedTag[]>([]);
  const [xrayTags, setXrayTags] = useState<ProjectedTag[]>([]);
  const [yoloBoxes, setYoloBoxes] = useState<
    { id: string; label: string; color: string; x: number; y: number; w: number; h: number }[]
  >([]);
  const [dragNotice, setDragNotice] = useState<string | null>(null);

  const propsRef = useRef({
    isRunning,
    simSpeed,
    mode,
    obstacleThresholdCm,
    pickDistCm,
    motorPwm,
    obstacles,
    cylinderPos,
    targetPos,
    cameraMode,
    selectedPart,
    yoloEnabled,
    slamEnabled,
    manualKeys,
  });

  useEffect(() => {
    propsRef.current = {
      isRunning,
      simSpeed,
      mode,
      obstacleThresholdCm,
      pickDistCm,
      motorPwm,
      obstacles,
      cylinderPos,
      targetPos,
      cameraMode,
      selectedPart,
      yoloEnabled,
      slamEnabled,
      manualKeys,
    };
  }, [
    isRunning,
    simSpeed,
    mode,
    obstacleThresholdCm,
    pickDistCm,
    motorPwm,
    obstacles,
    cylinderPos,
    targetPos,
    cameraMode,
    selectedPart,
    yoloEnabled,
    slamEnabled,
    manualKeys,
  ]);

  const physRef = useRef({
    x: -6.4,
    z: 0.0,
    heading: 0,
    state: "SEARCH" as RobotFsmState,
    subStageText: "SCANNING CORRIDOR // DRIVING TO PICK ZONE",
    stepNum: 2,
    activeCodeLine: 3,
    gripAngle: 90,
    targetGripAngle: 90,
    hasCylinder: false,
    leftPwm: 170,
    rightPwm: 170,
    in1: 1,
    in2: 0,
    in3: 1,
    in4: 0,
    distanceCm: 32.0,
    echoUs: 1856,
    avoidState: "NONE" as "NONE" | "BRAKE" | "SPIN" | "BYPASS",
    avoidTimer: 0,
    avoidTurnDir: -1,
    stateTimer: 0,
    wheelRotL: 0,
    wheelRotR: 0,
    trailPoints: [{ x: -6.4, z: 0.0 }],
    lastTrailTime: 0,
  });

  // Reset Robot on resetId change
  useEffect(() => {
    const rp = physRef.current;
    rp.x = -6.4;
    rp.z = 0.0;
    rp.heading = Math.atan2(cylinderPos.z - rp.z, cylinderPos.x - rp.x);
    rp.state = "SEARCH";
    rp.subStageText = "BOOT COMPLETE // DRIVING TO PICK ZONE (HC-SR04 ACTIVE)";
    rp.stepNum = 2;
    rp.activeCodeLine = 3;
    rp.gripAngle = 90;
    rp.targetGripAngle = 90;
    rp.hasCylinder = false;
    rp.leftPwm = 0;
    rp.rightPwm = 0;
    rp.in1 = 0;
    rp.in2 = 0;
    rp.in3 = 0;
    rp.in4 = 0;
    rp.avoidState = "NONE";
    rp.avoidTimer = 0;
    rp.stateTimer = 0;
    rp.trailPoints = [{ x: rp.x, z: rp.z }];
  }, [resetId, cylinderPos.x, cylinderPos.z]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0a");
    scene.fog = new THREE.Fog("#0a0a0a", 18, 36);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(-0.5, 7.2, 9.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Studio Lighting
    scene.add(new THREE.AmbientLight("#ffffff", 1.35));
    const hemi = new THREE.HemisphereLight("#f2efe9", "#151515", 0.85);
    hemi.position.set(0, 18, 0);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight("#ffffff", 2.1);
    dirLight.position.set(5, 15, 9);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const dCam = 10;
    dirLight.shadow.camera.left = -dCam;
    dirLight.shadow.camera.right = dCam;
    dirLight.shadow.camera.top = dCam;
    dirLight.shadow.camera.bottom = -dCam;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // --- ARENA STAGE DECK ---
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const deckMesh = new THREE.Mesh(
      new THREE.BoxGeometry(18.0, 0.28, 9.6),
      new THREE.MeshStandardMaterial({
        color: "#141413",
        roughness: 0.65,
        metalness: 0.15,
      })
    );
    deckMesh.position.set(-0.5, -0.14, 0);
    deckMesh.receiveShadow = true;
    arenaGroup.add(deckMesh);

    const gridHelper = new THREE.GridHelper(18, 36, "#3a3834", "#222220");
    gridHelper.position.set(-0.5, 0.005, 0);
    arenaGroup.add(gridHelper);

    // Arena Boundary Rails
    const railMat = new THREE.MeshStandardMaterial({
      color: "#222220",
      metalness: 0.4,
      roughness: 0.4,
    });
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.22, 0.14), railMat);
    northWall.position.set(-0.5, 0.11, -4.73);
    arenaGroup.add(northWall);
    const southWall = northWall.clone();
    southWall.position.set(-0.5, 0.11, 4.73);
    arenaGroup.add(southWall);

    // Start Zone Pad (-6.4, 0)
    const startPad = new THREE.Group();
    startPad.position.set(-6.4, 0.012, 0);
    const sRing = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: "#88857e", side: THREE.DoubleSide })
    );
    sRing.rotation.x = -Math.PI / 2;
    startPad.add(sRing);
    arenaGroup.add(startPad);

    // Pick Zone Pad
    const pickPad = new THREE.Group();
    const pRing = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.7, 32),
      new THREE.MeshBasicMaterial({ color: "#ffb300", side: THREE.DoubleSide })
    );
    pRing.rotation.x = -Math.PI / 2;
    pickPad.add(pRing);
    arenaGroup.add(pickPad);

    // Target Drop Zone Pad
    const targetPad = new THREE.Group();
    const tDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.82, 36),
      new THREE.MeshBasicMaterial({
        color: "#00e676",
        transparent: true,
        opacity: 0.18,
      })
    );
    tDisc.rotation.x = -Math.PI / 2;
    targetPad.add(tDisc);
    const tRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.94, 36),
      new THREE.MeshBasicMaterial({ color: "#00e676", side: THREE.DoubleSide })
    );
    tRing.rotation.x = -Math.PI / 2;
    targetPad.add(tRing);
    arenaGroup.add(targetPad);

    // --- HOLLOW NON-METALLIC CYLINDER PAYLOAD (Slide 22) ---
    const cylinderGroup = new THREE.Group();
    const cylOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.62, 32, 1, true),
      new THREE.MeshStandardMaterial({
        color: "#ffb300",
        roughness: 0.25,
        metalness: 0.1,
        side: THREE.DoubleSide,
      })
    );
    cylOuter.position.y = 0.31;
    cylOuter.castShadow = true;
    cylinderGroup.add(cylOuter);

    const cylInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.62, 32, 1, true),
      new THREE.MeshStandardMaterial({
        color: "#4a3200",
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
    );
    cylInner.position.y = 0.31;
    cylinderGroup.add(cylInner);

    const cylRim = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.21, 32),
      new THREE.MeshBasicMaterial({ color: "#ffe082", side: THREE.DoubleSide })
    );
    cylRim.rotation.x = -Math.PI / 2;
    cylRim.position.y = 0.62;
    cylinderGroup.add(cylRim);
    scene.add(cylinderGroup);

    // --- PROCEDURAL 3D ROBOT ("KINETIX RM-01") ---
    const robotRoot = new THREE.Group();
    robotRoot.scale.set(1.15, 1.15, 1.15);
    scene.add(robotRoot);

    const partGroups: Record<string, THREE.Group> = {
      chassis: new THREE.Group(),
      motors: new THREE.Group(),
      arduino: new THREE.Group(),
      l298n: new THREE.Group(),
      hcsr04: new THREE.Group(),
      servo: new THREE.Group(),
    };
    Object.entries(partGroups).forEach(([k, g]) => {
      g.userData = { partId: k };
      robotRoot.add(g);
    });

    const tagMesh = (obj: THREE.Object3D, partId: string) => {
      obj.userData = { partId };
      obj.children.forEach((c) => tagMesh(c, partId));
    };

    // 1. Chassis & 18650 Pack
    const plateMat = new THREE.MeshStandardMaterial({
      color: "#d6d3cd",
      roughness: 0.3,
      metalness: 0.25,
    });
    const botPlate = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.06, 1.06), plateMat);
    botPlate.position.set(0, 0.28, 0);
    botPlate.castShadow = true;
    partGroups.chassis.add(botPlate);

    const topPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.05, 0.96),
      new THREE.MeshStandardMaterial({ color: "#222220", roughness: 0.35 })
    );
    topPlate.position.set(-0.05, 0.55, 0);
    topPlate.castShadow = true;
    partGroups.chassis.add(topPlate);

    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.59, 0.064, 1.07)),
      new THREE.LineBasicMaterial({ color: "#ffb300" })
    );
    edgeLines.position.copy(botPlate.position);
    partGroups.chassis.add(edgeLines);

    const brassMat = new THREE.MeshStandardMaterial({
      color: "#ffb300",
      metalness: 0.8,
      roughness: 0.2,
    });
    [
      [-0.6, -0.4],
      [-0.6, 0.4],
      [0.0, -0.4],
      [0.0, 0.4],
      [0.52, -0.4],
      [0.52, 0.4],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.25, 12), brassMat);
      p.position.set(px, 0.41, pz);
      partGroups.chassis.add(p);
    });

    const battHolder = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.2, 0.72),
      new THREE.MeshStandardMaterial({ color: "#111111" })
    );
    battHolder.position.set(-0.52, 0.66, 0);
    partGroups.chassis.add(battHolder);

    [-0.16, 0.16].forEach((bz) => {
      const cell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.66, 20),
        new THREE.MeshStandardMaterial({ color: "#0088cc", metalness: 0.4, roughness: 0.25 })
      );
      cell.rotation.x = Math.PI / 2;
      cell.position.set(-0.52, 0.71, bz);
      partGroups.chassis.add(cell);
    });
    tagMesh(partGroups.chassis, "chassis");

    // 2. 4x Geared Motors & Wheels
    const yellowMat = new THREE.MeshStandardMaterial({ color: "#ffb300", roughness: 0.3 });
    const tireMat = new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.85 });
    const wheels: { mesh: THREE.Group; side: "L" | "R" }[] = [];

    (
      [
        { x: 0.48, z: -0.63, side: "L" },
        { x: -0.48, z: -0.63, side: "L" },
        { x: 0.48, z: 0.63, side: "R" },
        { x: -0.48, z: 0.63, side: "R" },
      ] as const
    ).forEach(({ x, z, side }) => {
      const gbox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.18), yellowMat);
      gbox.position.set(x, 0.22, z * 0.68);
      partGroups.motors.add(gbox);

      const wGrp = new THREE.Group();
      wGrp.position.set(x, 0.29, z);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.16, 28), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      wGrp.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.168, 20), yellowMat);
      hub.rotation.x = Math.PI / 2;
      wGrp.add(hub);

      for (let i = 0; i < 3; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.04, 0.174),
          new THREE.MeshBasicMaterial({ color: "#080808" })
        );
        spoke.rotation.z = (i * Math.PI) / 3;
        wGrp.add(spoke);
      }
      partGroups.motors.add(wGrp);
      wheels.push({ mesh: wGrp, side });
    });
    tagMesh(partGroups.motors, "motors");

    // 3. Arduino UNO R3
    const unoPcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.045, 0.44),
      new THREE.MeshStandardMaterial({ color: "#0077b6", roughness: 0.3 })
    );
    unoPcb.position.set(0.3, 0.6, 0.18);
    partGroups.arduino.add(unoPcb);

    const dipChip = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.038, 0.08),
      new THREE.MeshStandardMaterial({ color: "#080808" })
    );
    dipChip.position.set(0.34, 0.63, 0.22);
    partGroups.arduino.add(dipChip);

    const usbPort = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.09, 0.1),
      new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.85, roughness: 0.2 })
    );
    usbPort.position.set(0.06, 0.64, 0.08);
    partGroups.arduino.add(usbPort);
    tagMesh(partGroups.arduino, "arduino");

    // 4. L298N Dual H-Bridge
    const l298Pcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.045, 0.44),
      new THREE.MeshStandardMaterial({ color: "#d90429", roughness: 0.3 })
    );
    l298Pcb.position.set(-0.06, 0.6, -0.22);
    partGroups.l298n.add(l298Pcb);

    const heatsink = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.21, 0.22),
      new THREE.MeshStandardMaterial({ color: "#141413", metalness: 0.7, roughness: 0.25 })
    );
    heatsink.position.set(-0.06, 0.71, -0.22);
    partGroups.l298n.add(heatsink);
    tagMesh(partGroups.l298n, "l298n");

    // 5. HC-SR04 Ultrasonic Sensor
    const sonarPcb = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.21, 0.46),
      new THREE.MeshStandardMaterial({ color: "#0077b6" })
    );
    sonarPcb.position.set(0.77, 0.5, 0);
    partGroups.hcsr04.add(sonarPcb);

    const silverMat = new THREE.MeshStandardMaterial({
      color: "#f2efe9",
      metalness: 0.85,
      roughness: 0.18,
    });
    [-0.13, 0.13].forEach((sz) => {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.13, 24), silverMat);
      can.rotation.z = Math.PI / 2;
      can.position.set(0.84, 0.5, sz);
      partGroups.hcsr04.add(can);
    });
    tagMesh(partGroups.hcsr04, "hcsr04");

    // 6. SG90 Servo & 2-Jaw Gripper
    const sg90 = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.2, 0.13),
      new THREE.MeshStandardMaterial({ color: "#0096c7" })
    );
    sg90.position.set(0.77, 0.25, 0);
    partGroups.servo.add(sg90);

    const jawBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.045, 0.54),
      new THREE.MeshStandardMaterial({ color: "#222220", metalness: 0.5 })
    );
    jawBracket.position.set(0.9, 0.25, 0);
    partGroups.servo.add(jawBracket);

    const leftJaw = new THREE.Group();
    leftJaw.position.set(0.94, 0.25, -0.21);
    partGroups.servo.add(leftJaw);

    const rightJaw = new THREE.Group();
    rightJaw.position.set(0.94, 0.25, 0.21);
    partGroups.servo.add(rightJaw);

    const buildFinger = (isLeft: boolean) => {
      const g = new THREE.Group();
      const s = isLeft ? 1 : -1;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.045), silverMat);
      arm.position.set(0.17, 0, 0);
      g.add(arm);

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.1, 0.04),
        new THREE.MeshStandardMaterial({ color: "#ffb300" })
      );
      pad.position.set(0.4, 0, s * 0.045);
      pad.rotation.y = s * 0.24;
      g.add(pad);
      return g;
    };
    leftJaw.add(buildFinger(true));
    rightJaw.add(buildFinger(false));
    tagMesh(partGroups.servo, "servo");

    // 7. Sonar Volumetric Cone
    const sonarOrigin = new THREE.Group();
    sonarOrigin.position.set(0.9, 0.5, 0);
    robotRoot.add(sonarOrigin);

    const coneGeo = new THREE.ConeGeometry(0.3, 1.0, 24, 1, true);
    coneGeo.translate(0, -0.5, 0);
    coneGeo.rotateZ(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: "#ffb300",
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sonarCone = new THREE.Mesh(coneGeo, coneMat);
    sonarOrigin.add(sonarCone);

    const hitRing = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.14, 24),
      new THREE.MeshBasicMaterial({ color: "#ffb300", side: THREE.DoubleSide })
    );
    hitRing.rotation.y = Math.PI / 2;
    sonarOrigin.add(hitRing);

    // 8. ROS 360° SLAM Ring
    const slamRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.78, 64),
      new THREE.MeshBasicMaterial({
        color: "#00e5ff",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    slamRing.rotation.x = -Math.PI / 2;
    slamRing.position.y = 0.05;
    slamRing.visible = false;
    robotRoot.add(slamRing);

    // Obstacles & Trail
    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);

    const maxTrail = 350;
    const trailArr = new Float32Array(maxTrail * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailArr, 3));
    const trailLine = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: "#ffb300" })
    );
    scene.add(trailLine);

    // Mouse Orbit & Dragging
    const camSpherical = {
      radius: 10.8,
      theta: -0.16,
      phi: 0.9,
      target: new THREE.Vector3(-0.5, 0.3, 0.1),
    };
    let isOrbiting = false;
    let isPanning = false;
    let prevMouse = { x: 0, y: 0 };
    let activeDrag: { type: "obstacle" | "cylinder"; id?: string } | null = null;

    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();

    const updateMouse = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouseNdc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseNdc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      updateMouse(e);
      raycaster.setFromCamera(mouseNdc, camera);

      const obsHits = raycaster.intersectObjects(obstaclesGroup.children, true);
      if (obsHits.length > 0 && e.button === 0) {
        let o: THREE.Object3D | null = obsHits[0].object;
        while (o && !o.userData?.obsId && o !== obstaclesGroup) o = o.parent;
        if (o?.userData?.obsId) {
          activeDrag = { type: "obstacle", id: o.userData.obsId };
          setDragNotice(`REPOSITIONING ${o.userData.label} // RELEASE TO LOCK`);
          return;
        }
      }

      if (!physRef.current.hasCylinder && e.button === 0) {
        const cylHits = raycaster.intersectObjects(cylinderGroup.children, true);
        if (cylHits.length > 0) {
          activeDrag = { type: "cylinder" };
          setDragNotice("REPOSITIONING PICK CYLINDER // RELEASE TO LOCK");
          return;
        }
      }

      if (propsRef.current.cameraMode === "xray") {
        const rHits = raycaster.intersectObjects(robotRoot.children, true);
        if (rHits.length > 0) {
          let o: THREE.Object3D | null = rHits[0].object;
          while (o && !o.userData?.partId && o !== robotRoot) o = o.parent;
          if (o?.userData?.partId) {
            setSelectedPart(o.userData.partId);
            return;
          }
        }
      }

      if (e.button === 2 || e.shiftKey) isPanning = true;
      else if (e.button === 0) isOrbiting = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      updateMouse(e);
      raycaster.setFromCamera(mouseNdc, camera);

      if (activeDrag) {
        if (raycaster.ray.intersectPlane(floorPlane, planeHit)) {
          const cx = Math.max(-7.0, Math.min(7.0, planeHit.x));
          const cz = Math.max(-3.6, Math.min(3.6, planeHit.z));
          if (activeDrag.type === "obstacle" && activeDrag.id) {
            const dragId = activeDrag.id;
            setObstacles((prev) =>
              prev.map((o) =>
                o.id === dragId
                  ? { ...o, x: Number(cx.toFixed(2)), z: Number(cz.toFixed(2)) }
                  : o
              )
            );
          } else if (activeDrag.type === "cylinder") {
            setCylinderPos({ x: Number(cx.toFixed(2)), z: Number(cz.toFixed(2)) });
          }
        }
        return;
      }

      if (isOrbiting && propsRef.current.cameraMode === "orbit") {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        camSpherical.theta -= dx * 0.006;
        camSpherical.phi = Math.max(0.22, Math.min(1.42, camSpherical.phi - dy * 0.006));
        prevMouse = { x: e.clientX, y: e.clientY };
      } else if (isPanning && propsRef.current.cameraMode === "orbit") {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        camSpherical.target.x -= dx * 0.012;
        camSpherical.target.z -= dy * 0.012;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = () => {
      isOrbiting = false;
      isPanning = false;
      activeDrag = null;
      setDragNotice(null);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camSpherical.radius = Math.max(3.5, Math.min(18, camSpherical.radius + e.deltaY * 0.008));
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", (e) => e.preventDefault());

    let prevObsJson = "";
    const syncObstacles = (obsList: ArenaObstacle[]) => {
      const j = JSON.stringify(obsList);
      if (j === prevObsJson) return;
      prevObsJson = j;
      while (obstaclesGroup.children.length > 0) {
        obstaclesGroup.remove(obstaclesGroup.children[0]);
      }
      obsList.forEach((o) => {
        const g = new THREE.Group();
        g.position.set(o.x, 0, o.z);
        g.rotation.y = o.angle || 0;
        g.userData = { obsId: o.id, label: o.label, obsType: o.type };

        const fillCol =
          o.type === "foam" ? "#6d28d9" : o.type === "angled" ? "#e11d48" : "#b91c1c";
        const strokeCol =
          o.type === "foam" ? "#c084fc" : o.type === "angled" ? "#ffb300" : "#ff2a2a";

        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(o.w, o.h, o.d),
          new THREE.MeshStandardMaterial({
            color: fillCol,
            roughness: o.type === "foam" ? 0.95 : 0.4,
            metalness: 0.15,
          })
        );
        mesh.position.y = o.h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        g.add(mesh);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(o.w + 0.01, o.h + 0.01, o.d + 0.01)),
          new THREE.LineBasicMaterial({ color: strokeCol })
        );
        edges.position.y = o.h / 2;
        g.add(edges);

        obstaclesGroup.add(g);
      });
    };

    const computeSonar = (
      rp: typeof physRef.current,
      cyl: { x: number; z: number },
      yoloOn: boolean
    ) => {
      const origin = new THREE.Vector3(
        rp.x + Math.cos(rp.heading) * 1.02,
        0.4,
        rp.z + Math.sin(rp.heading) * 1.02
      );
      let minWorld = 12.0;

      if (!rp.hasCylinder) {
        const dx = cyl.x - origin.x;
        const dz = cyl.z - origin.z;
        const dCyl = Math.hypot(dx, dz);
        let diff = Math.atan2(dz, dx) - rp.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.35) {
          minWorld = Math.min(minWorld, Math.max(0.2, dCyl - 0.21));
        }
      }

      const halfCone = (7.5 * Math.PI) / 180;
      [-halfCone, 0, halfCone].forEach((off) => {
        const a = rp.heading + off;
        raycaster.set(origin, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).normalize());
        raycaster.near = 0.05;
        raycaster.far = 15.0;
        const hits = raycaster.intersectObjects(obstaclesGroup.children, true);
        if (hits.length > 0) {
          let o: THREE.Object3D | null = hits[0].object;
          while (o && !o.userData?.obsType && o !== obstaclesGroup) o = o.parent;
          const t = o?.userData?.obsType;
          if (t === "foam" && !yoloOn) {
            minWorld = Math.min(minWorld, hits[0].distance * 1.85);
          } else if (t === "angled" && !yoloOn) {
            minWorld = Math.min(minWorld, hits[0].distance * 1.45);
          } else {
            minWorld = Math.min(minWorld, hits[0].distance);
          }
        }
      });

      const cm = Math.max(2.0, Math.min(120.0, minWorld * WORLD_TO_CM));
      return { cm, worldLen: cm / WORLD_TO_CM };
    };

    let animId: number;
    let lastT = performance.now();
    let lastUi = 0;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const cur = propsRef.current;
      const rp = physRef.current;

      syncObstacles(cur.obstacles);
      pickPad.position.set(cur.cylinderPos.x, 0.012, cur.cylinderPos.z);
      targetPad.position.set(cur.targetPos.x, 0.012, cur.targetPos.z);

      const { cm, worldLen } = computeSonar(rp, cur.cylinderPos, cur.yoloEnabled);
      rp.distanceCm = cm;
      rp.echoUs = Math.round(cm * 58);

      const spdMult = (cur.motorPwm / 170) * cur.simSpeed;
      const linSpd = 1.55 * spdMult;
      const turnSpd = 2.2 * spdMult;

      const wrap = (a: number) => {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
      };

      if (cur.mode === "manual") {
        const k = cur.manualKeys;
        let lin = 0;
        let ang = 0;
        if (k.w) lin += linSpd;
        if (k.s) lin -= linSpd * 0.8;
        if (k.a) ang -= turnSpd;
        if (k.d) ang += turnSpd;
        rp.heading += ang * dt;
        rp.x += Math.cos(rp.heading) * lin * dt;
        rp.z += Math.sin(rp.heading) * lin * dt;
        rp.targetGripAngle = k.gripClosed ? 30 : 90;
        rp.subStageText = "MANUAL WASD TELEOP OVERRIDE // SPACEBAR TOGGLES SG90 GRIPPER";

        const jawX = rp.x + Math.cos(rp.heading) * 1.35;
        const jawZ = rp.z + Math.sin(rp.heading) * 1.35;
        const dCyl = Math.hypot(cur.cylinderPos.x - jawX, cur.cylinderPos.z - jawZ);
        if (k.gripClosed && !rp.hasCylinder && dCyl < 0.6) {
          rp.hasCylinder = true;
          rp.state = "CARRY";
        } else if (!k.gripClosed && rp.hasCylinder) {
          rp.hasCylinder = false;
          setCylinderPos({ x: Number(jawX.toFixed(2)), z: Number(jawZ.toFixed(2)) });
          rp.state = "SEARCH";
        }
      } else if (cur.isRunning && cur.cameraMode !== "xray") {
        if (rp.state === "SEARCH") {
          rp.targetGripAngle = 90;
          const jawX = rp.x + Math.cos(rp.heading) * 1.35;
          const jawZ = rp.z + Math.sin(rp.heading) * 1.35;
          const dWorld = Math.hypot(cur.cylinderPos.x - jawX, cur.cylinderPos.z - jawZ);
          const dCm = dWorld * WORLD_TO_CM;
          rp.distanceCm = Math.min(rp.distanceCm, Math.max(2.5, dCm));
          rp.echoUs = Math.round(rp.distanceCm * 58);

          const err = wrap(
            Math.atan2(cur.cylinderPos.z - rp.z, cur.cylinderPos.x - rp.x) - rp.heading
          );

          if (dCm > cur.pickDistCm) {
            rp.heading += Math.sign(err) * Math.min(Math.abs(err) * 4.0, turnSpd) * dt;
            const s = dCm < 16 ? linSpd * 0.55 : linSpd;
            rp.x += Math.cos(rp.heading) * s * dt;
            rp.z += Math.sin(rp.heading) * s * dt;
            rp.stepNum = dCm < 16 ? 4 : 3;
            rp.activeCodeLine = 3;
            rp.subStageText =
              dCm < 16
                ? `CREEPING TO PICK OBJECT // d = ${rp.distanceCm.toFixed(1)} cm (TARGET ≤ 5.0 cm)`
                : `APPROACHING PICK ZONE // SONAR d = ${rp.distanceCm.toFixed(1)} cm`;
            rp.in1 = 1;
            rp.in2 = 0;
            rp.in3 = 1;
            rp.in4 = 0;
            rp.leftPwm = dCm < 16 ? 115 : cur.motorPwm;
            rp.rightPwm = rp.leftPwm;
          } else {
            rp.state = "PICK";
            rp.stateTimer = 0;
            rp.stepNum = 5;
            rp.activeCodeLine = 6;
            rp.subStageText = "OBJECT AT ≤ 5.0 cm // MOTORS HALTED · CLOSING SG90 JAWS TO 30°";
            rp.in1 = 0;
            rp.in2 = 0;
            rp.in3 = 0;
            rp.in4 = 0;
            rp.leftPwm = 0;
            rp.rightPwm = 0;
          }
        } else if (rp.state === "PICK") {
          rp.targetGripAngle = 30;
          rp.stateTimer += dt * cur.simSpeed;
          rp.in1 = 0;
          rp.in2 = 0;
          rp.in3 = 0;
          rp.in4 = 0;
          rp.leftPwm = 0;
          rp.rightPwm = 0;
          if (rp.stateTimer > 0.45) {
            rp.hasCylinder = true;
            rp.stepNum = 6;
          }
          if (rp.stateTimer > 1.05) {
            rp.state = "CARRY";
            rp.avoidState = "NONE";
            rp.stepNum = 7;
            rp.activeCodeLine = 9;
          }
        } else if (rp.state === "CARRY") {
          rp.targetGripAngle = 30;
          const distTarget = Math.hypot(cur.targetPos.x - rp.x, cur.targetPos.z - rp.z);

          if (distTarget < 0.75) {
            rp.state = "PLACE";
            rp.stateTimer = 0;
            rp.stepNum = 10;
            rp.activeCodeLine = 12;
            rp.subStageText = "TARGET DROP ZONE REACHED // OPENING SG90 GRIPPER TO 90°";
            rp.in1 = 0;
            rp.in2 = 0;
            rp.in3 = 0;
            rp.in4 = 0;
            rp.leftPwm = 0;
            rp.rightPwm = 0;
          } else if (
            rp.avoidState === "NONE" &&
            rp.distanceCm <= cur.obstacleThresholdCm
          ) {
            rp.avoidState = "BRAKE";
            rp.avoidTimer = 0;
            rp.stepNum = 7;
            rp.activeCodeLine = 8;
            rp.subStageText = `OBSTACLE DETECTED AT d = ${rp.distanceCm.toFixed(1)} cm (≤ ${cur.obstacleThresholdCm} cm) // H-BRIDGE BRAKING`;
            rp.avoidTurnDir = rp.z >= 0 ? -1 : 1;
          } else if (rp.avoidState === "BRAKE") {
            rp.in1 = 1;
            rp.in2 = 1;
            rp.in3 = 1;
            rp.in4 = 1;
            rp.leftPwm = 0;
            rp.rightPwm = 0;
            rp.avoidTimer += dt * cur.simSpeed;
            if (rp.avoidTimer > 0.4) {
              rp.avoidState = "SPIN";
              rp.avoidTimer = 0;
              rp.stepNum = 8;
              rp.subStageText = "DIFFERENTIAL SPIN-IN-PLACE // L298N S1+S4 (L) & S3+S2 (R)";
            }
          } else if (rp.avoidState === "SPIN") {
            rp.heading += rp.avoidTurnDir * turnSpd * dt;
            rp.in1 = rp.avoidTurnDir > 0 ? 1 : 0;
            rp.in2 = rp.avoidTurnDir > 0 ? 0 : 1;
            rp.in3 = rp.avoidTurnDir > 0 ? 0 : 1;
            rp.in4 = rp.avoidTurnDir > 0 ? 1 : 0;
            rp.leftPwm = cur.motorPwm;
            rp.rightPwm = cur.motorPwm;
            rp.avoidTimer += dt * cur.simSpeed;
            if (
              rp.avoidTimer > 0.55 &&
              rp.distanceCm > cur.obstacleThresholdCm + 8
            ) {
              rp.avoidState = "BYPASS";
              rp.avoidTimer = 0;
              rp.subStageText = "CORRIDOR CLEAR // BYPASSING OBSTACLE FLANK";
            }
          } else if (rp.avoidState === "BYPASS") {
            rp.x += Math.cos(rp.heading) * linSpd * dt;
            rp.z += Math.sin(rp.heading) * linSpd * dt;
            rp.in1 = 1;
            rp.in2 = 0;
            rp.in3 = 1;
            rp.in4 = 0;
            rp.leftPwm = cur.motorPwm;
            rp.rightPwm = cur.motorPwm;
            rp.avoidTimer += dt * cur.simSpeed;
            if (rp.distanceCm <= cur.obstacleThresholdCm) {
              rp.avoidState = "BRAKE";
              rp.avoidTimer = 0;
            } else if (rp.avoidTimer > 1.1) {
              rp.avoidState = "NONE";
            }
          } else {
            rp.stepNum = 9;
            rp.activeCodeLine = 9;
            rp.subStageText = `TRANSPORTING CYLINDER TO TARGET // SONAR CLEAR (${rp.distanceCm.toFixed(1)} cm)`;
            const err = wrap(
              Math.atan2(cur.targetPos.z - rp.z, cur.targetPos.x - rp.x) - rp.heading
            );
            rp.heading += Math.sign(err) * Math.min(Math.abs(err) * 3.0, turnSpd) * dt;
            rp.x += Math.cos(rp.heading) * linSpd * dt;
            rp.z += Math.sin(rp.heading) * linSpd * dt;
            rp.in1 = 1;
            rp.in2 = 0;
            rp.in3 = 1;
            rp.in4 = 0;
            rp.leftPwm = cur.motorPwm;
            rp.rightPwm = cur.motorPwm;
          }
        } else if (rp.state === "PLACE") {
          rp.targetGripAngle = 90;
          rp.stateTimer += dt * cur.simSpeed;
          if (rp.stateTimer < 0.55) {
            if (rp.hasCylinder && rp.stateTimer > 0.25) {
              rp.hasCylinder = false;
              setCylinderPos({
                x: Number(cur.targetPos.x.toFixed(2)),
                z: Number(cur.targetPos.z.toFixed(2)),
              });
            }
          } else if (rp.stateTimer < 1.1) {
            rp.stepNum = 11;
            rp.subStageText = "PAYLOAD DEPOSITED // REVERSING CHASSIS TO CLEAR CYLINDER";
            rp.x -= Math.cos(rp.heading) * (linSpd * 0.55) * dt;
            rp.z -= Math.sin(rp.heading) * (linSpd * 0.55) * dt;
            rp.in1 = 0;
            rp.in2 = 1;
            rp.in3 = 0;
            rp.in4 = 1;
            rp.leftPwm = 115;
            rp.rightPwm = 115;
          } else {
            rp.state = "DONE";
            rp.stepNum = 12;
            rp.activeCodeLine = 13;
            rp.subStageText = "MISSION COMPLETE // PAYLOAD DELIVERED AUTONOMOUSLY TO TARGET";
            rp.in1 = 0;
            rp.in2 = 0;
            rp.in3 = 0;
            rp.in4 = 0;
            rp.leftPwm = 0;
            rp.rightPwm = 0;
          }
        }
      }

      rp.x = Math.max(-7.3, Math.min(7.3, rp.x));
      rp.z = Math.max(-3.6, Math.min(3.6, rp.z));

      rp.gripAngle += (rp.targetGripAngle - rp.gripAngle) * Math.min(1, dt * 10);
      const openNorm = (rp.gripAngle - 30) / 60;
      leftJaw.rotation.y = 0.05 + openNorm * 0.45;
      rightJaw.rotation.y = -0.05 - openNorm * 0.45;

      robotRoot.position.set(rp.x, 0, rp.z);
      robotRoot.rotation.y = -rp.heading;

      const lDir = rp.in1 - rp.in2;
      const rDir = rp.in3 - rp.in4;
      rp.wheelRotL += lDir * (rp.leftPwm / 255) * dt * 8.5;
      rp.wheelRotR += rDir * (rp.rightPwm / 255) * dt * 8.5;
      wheels.forEach(({ mesh, side }) => {
        mesh.rotation.z = side === "L" ? -rp.wheelRotL : -rp.wheelRotR;
      });

      if (rp.hasCylinder) {
        cylinderGroup.position.set(
          rp.x + Math.cos(rp.heading) * 1.44,
          0.04,
          rp.z + Math.sin(rp.heading) * 1.44
        );
      } else {
        cylinderGroup.position.set(cur.cylinderPos.x, 0, cur.cylinderPos.z);
      }

      const cLen = Math.max(0.3, Math.min(6.2, worldLen));
      sonarCone.scale.set(cLen, 1, cLen);
      const isAlert = rp.distanceCm <= cur.obstacleThresholdCm;
      const beamCol = isAlert ? "#ff2a2a" : "#ffb300";
      coneMat.color.set(beamCol);
      hitRing.material.color.set(beamCol);
      hitRing.position.set(cLen, 0, 0);

      slamRing.visible = cur.slamEnabled;

      // Exploded X-Ray Animation
      const isXray = cur.cameraMode === "xray";
      const expOffsets: Record<string, [number, number, number]> = isXray
        ? {
            chassis: [0, 0, 0],
            motors: [0, -0.18, 0],
            arduino: [0.35, 0.92, 0.35],
            l298n: [-0.35, 0.7, -0.35],
            hcsr04: [0.55, 0.45, 0],
            servo: [0.85, 0.08, 0],
          }
        : {
            chassis: [0, 0, 0],
            motors: [0, 0, 0],
            arduino: [0, 0, 0],
            l298n: [0, 0, 0],
            hcsr04: [0, 0, 0],
            servo: [0, 0, 0],
          };
      Object.entries(partGroups).forEach(([k, g]) => {
        const [tx, ty, tz] = expOffsets[k];
        g.position.x += (tx - g.position.x) * Math.min(1, dt * 7);
        g.position.y += (ty - g.position.y) * Math.min(1, dt * 7);
        g.position.z += (tz - g.position.z) * Math.min(1, dt * 7);
      });

      if (now - rp.lastTrailTime > 100) {
        rp.lastTrailTime = now;
        rp.trailPoints.push({ x: rp.x, z: rp.z });
        if (rp.trailPoints.length > maxTrail) rp.trailPoints.shift();
        const arr = trailGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < maxTrail; i++) {
          const pt = rp.trailPoints[Math.min(i, rp.trailPoints.length - 1)] || rp;
          arr[i * 3] = pt.x;
          arr[i * 3 + 1] = 0.03;
          arr[i * 3 + 2] = pt.z;
        }
        trailGeo.attributes.position.needsUpdate = true;
        trailGeo.setDrawRange(0, rp.trailPoints.length);
      }

      // Camera Modes
      if (cur.cameraMode === "xray") {
        camera.position.lerp(new THREE.Vector3(rp.x + 1.9, 2.7, rp.z + 3.1), dt * 5);
        camera.lookAt(new THREE.Vector3(rp.x + 0.1, 0.65, rp.z));
      } else if (cur.cameraMode === "chase") {
        camera.position.lerp(
          new THREE.Vector3(
            rp.x - Math.cos(rp.heading) * 4.0,
            2.5,
            rp.z - Math.sin(rp.heading) * 4.0
          ),
          dt * 6
        );
        camera.lookAt(
          new THREE.Vector3(
            rp.x + Math.cos(rp.heading) * 2.4,
            0.35,
            rp.z + Math.sin(rp.heading) * 2.4
          )
        );
      } else if (cur.cameraMode === "pov") {
        camera.position.set(
          rp.x + Math.cos(rp.heading) * 0.65,
          0.72,
          rp.z + Math.sin(rp.heading) * 0.65
        );
        camera.lookAt(
          new THREE.Vector3(
            rp.x + Math.cos(rp.heading) * 4.5,
            0.3,
            rp.z + Math.sin(rp.heading) * 4.5
          )
        );
      } else if (cur.cameraMode === "top") {
        camera.position.lerp(new THREE.Vector3(-0.5, 14.2, 0.01), dt * 6);
        camera.lookAt(new THREE.Vector3(-0.5, 0, 0));
      } else {
        const cx =
          camSpherical.target.x +
          camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta);
        const cy = camSpherical.radius * Math.cos(camSpherical.phi);
        const cz =
          camSpherical.target.z +
          camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta);
        camera.position.set(cx, cy, cz);
        camera.lookAt(camSpherical.target);
      }

      renderer.render(scene, camera);

      if (now - lastUi > 65) {
        lastUi = now;
        onTelemetryUpdate({
          x: rp.x,
          z: rp.z,
          headingDeg: Math.round(((-rp.heading * 180) / Math.PI + 360) % 360),
          state: rp.state,
          subStageText: rp.subStageText,
          stepNum: rp.stepNum,
          activeCodeLine: rp.activeCodeLine,
          distanceCm: Number(rp.distanceCm.toFixed(1)),
          echoUs: rp.echoUs,
          gripAngle: Math.round(rp.gripAngle),
          servoPulseMs: Number((1.0 + (rp.gripAngle / 180) * 1.0).toFixed(2)),
          hasCylinder: rp.hasCylinder,
          leftPwm: rp.leftPwm,
          rightPwm: rp.rightPwm,
          in1: rp.in1,
          in2: rp.in2,
          in3: rp.in3,
          in4: rp.in4,
        });

        const w = container.clientWidth;
        const h = container.clientHeight;
        const project = (v3: THREE.Vector3) => {
          const p = v3.clone().project(camera);
          if (p.z > 1) return null;
          return { x: ((p.x + 1) * w) / 2, y: ((-p.y + 1) * h) / 2 };
        };

        if (isXray) {
          setWorldTags([]);
          const xt: ProjectedTag[] = [];
          Object.entries(partGroups).forEach(([key, grp]) => {
            const mod = HARDWARE_MODULES.find((m) => m.id === key);
            if (!mod) return;
            const wv = new THREE.Vector3();
            grp.getWorldPosition(wv);
            wv.y += 0.52;
            const sc = project(wv);
            if (sc) {
              xt.push({
                id: key,
                code: mod.code,
                title: mod.shortName,
                sub: mod.slideRef,
                border: "border-[#ffb300]",
                accent: "text-[#ffb300]",
                x: sc.x,
                y: sc.y,
              });
            }
          });
          setXrayTags(xt);
        } else {
          setXrayTags([]);
          const tags: ProjectedTag[] = [];

          const sPt = project(new THREE.Vector3(-6.4, 0.25, -1.1));
          if (sPt) {
            tags.push({
              id: "t-start",
              code: "ZONE_01",
              title: "START DOCK",
              sub: "Boot & Init (90° Open)",
              border: "border-[#3a3834]",
              accent: "text-[#88857e]",
              x: sPt.x,
              y: sPt.y,
            });
          }

          if (!rp.hasCylinder && rp.state !== "DONE") {
            const cPt = project(new THREE.Vector3(cur.cylinderPos.x, 0.9, cur.cylinderPos.z));
            if (cPt) {
              tags.push({
                id: "t-cyl",
                code: "ZONE_02",
                title: "PICK OBJECT",
                sub: "Grip at d ≤ 5cm [Drag]",
                border: "border-[#ffb300]",
                accent: "text-[#ffb300]",
                x: cPt.x,
                y: cPt.y,
              });
            }
          }

          cur.obstacles.forEach((o, idx) => {
            const oPt = project(new THREE.Vector3(o.x, o.h + 0.35, o.z));
            if (oPt) {
              tags.push({
                id: `t-obs-${o.id}`,
                code: `OBS_0${idx + 1}`,
                title: o.label,
                sub: "Avoid ≤ 20cm [Drag]",
                border: "border-[#ff2a2a]",
                accent: "text-[#ff2a2a]",
                x: oPt.x,
                y: oPt.y,
              });
            }
          });

          const tPt = project(new THREE.Vector3(cur.targetPos.x, 0.3, cur.targetPos.z - 1.05));
          if (tPt) {
            tags.push({
              id: "t-target",
              code: "ZONE_03",
              title: "TARGET DROP",
              sub: "Release at 90°",
              border: "border-[#00e676]",
              accent: "text-[#00e676]",
              x: tPt.x,
              y: tPt.y,
            });
          }

          const rPt = project(new THREE.Vector3(rp.x, 1.28, rp.z));
          if (rPt) {
            tags.push({
              id: "t-robot",
              code: rp.state,
              title: `d = ${rp.distanceCm.toFixed(1)} cm`,
              sub: `Grip: ${Math.round(rp.gripAngle)}° · PWM: ${rp.leftPwm}`,
              border: "border-[#ffb300]",
              accent: "text-[#ffb300]",
              x: rPt.x,
              y: rPt.y,
            });
          }

          setWorldTags(tags);
        }

        // YOLOv8 Vision Bounding Boxes (Slide 27 Future Scope)
        if (cur.yoloEnabled) {
          const boxes: {
            id: string;
            label: string;
            color: string;
            x: number;
            y: number;
            w: number;
            h: number;
          }[] = [];
          const cSc = project(
            new THREE.Vector3(cylinderGroup.position.x, 0.3, cylinderGroup.position.z)
          );
          if (cSc) {
            boxes.push({
              id: "yolo-cyl",
              label: "CYLINDER_PAYLOAD 0.98",
              color: "#ffb300",
              x: cSc.x - 44,
              y: cSc.y - 44,
              w: 88,
              h: 88,
            });
          }
          cur.obstacles.forEach((o) => {
            const oSc = project(new THREE.Vector3(o.x, o.h / 2, o.z));
            if (oSc) {
              boxes.push({
                id: `yolo-${o.id}`,
                label: `OBSTACLE_${o.type.toUpperCase()} 0.95`,
                color: "#ff2a2a",
                x: oSc.x - 54,
                y: oSc.y - 50,
                w: 108,
                h: 100,
              });
            }
          });
          setYoloBoxes(boxes);
        } else {
          setYoloBoxes([]);
        }
      }
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
    };
  }, [onTelemetryUpdate, setCylinderPos, setObstacles, setSelectedPart]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      <div ref={mountRef} className="w-full h-full" />

      {/* Brutalist 3D World Callout Tags */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {worldTags.map((t) => (
          <div
            key={t.id}
            style={{
              transform: `translate(-50%, -100%) translate(${t.x}px, ${t.y}px)`,
            }}
            className={`absolute bg-[#080808]/90 border ${t.border} px-2 py-1 font-mono text-[10px] leading-tight whitespace-nowrap`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`${t.accent} font-bold`}>[{t.code}]</span>
              <span className="text-[#f2efe9] font-bold">{t.title}</span>
            </div>
            <div className="text-[#88857e] text-[9px]">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Interactive X-Ray Part Selection Tags */}
      {cameraMode === "xray" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {xrayTags.map((t) => {
            const active = selectedPart === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedPart(t.id)}
                style={{
                  transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px)`,
                }}
                className={`pointer-events-auto absolute px-2.5 py-1 border font-mono text-[10px] text-left transition ${
                  active
                    ? "bg-[#ffb300] text-[#080808] border-[#f2efe9] font-bold z-30"
                    : "bg-[#080808]/95 text-[#f2efe9] border-[#ffb300] hover:bg-[#151515] z-20"
                }`}
              >
                <div className="font-bold whitespace-nowrap">
                  [{t.code}] {t.title}
                </div>
                <div className={active ? "text-[#080808]" : "text-[#88857e]"}>{t.sub}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* YOLOv8 Bounding Box Overlay */}
      {yoloEnabled && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {yoloBoxes.map((b) => (
            <div
              key={b.id}
              style={{
                transform: `translate(${b.x}px, ${b.y}px)`,
                width: `${b.w}px`,
                height: `${b.h}px`,
                borderColor: b.color,
              }}
              className="absolute border-2"
            >
              <div
                style={{ backgroundColor: b.color }}
                className="text-[9px] font-mono font-bold text-[#080808] px-1 py-0.5 whitespace-nowrap -mt-4 inline-block"
              >
                {b.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag Status Banner */}
      {dragNotice && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-[#ffb300] text-[#080808] px-3 py-1 font-mono text-[11px] font-bold tracking-wider uppercase border border-[#f2efe9]">
          {dragNotice}
        </div>
      )}
    </div>
  );
}
