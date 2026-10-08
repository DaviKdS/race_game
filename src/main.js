import * as THREE from "three";
import "./styles.css";

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const gearEl = document.querySelector("#gear");
const scoreEl = document.querySelector("#score");
const nitroEl = document.querySelector("#nitro");
const wantedEl = document.querySelector("#wanted");
const nitroBar = document.querySelector("#nitroBar");
const miniPlayer = document.querySelector("#miniPlayer");
const miniPolice = document.querySelector("#miniPolice");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070913);
scene.fog = new THREE.FogExp2(0x070913, 0.014);

const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 900);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;

const hemi = new THREE.HemisphereLight(0xaedbff, 0x090b12, 0.82);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xb8d7ff, 1.35);
moon.position.set(-8, 24, 12);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
scene.add(moon);

const keys = new Set();
const game = {
  started: false,
  crashed: false,
  speed: 0,
  maxSpeed: 235,
  lane: 0,
  targetX: 0,
  nitro: 100,
  score: 0,
  shake: 0,
  wanted: 1,
  cameraMode: 0,
  paused: false
};

const roadWidth = 16;
const laneWidth = roadWidth / 4;
const clock = new THREE.Clock();
const obstacles = [];
const policeCars = [];
const roadside = [];
const roadMarks = [];

function mat(color, roughness = 0.58, metalness = 0.1, emissive = 0x000000, intensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity: intensity
  });
}

const asphalt = mat(0x161922, 0.92, 0.02);
const lineMat = mat(0xeef8ff, 0.4, 0.02, 0x8fdfff, 0.35);
const curbBlue = mat(0x00e5ff, 0.22, 0.05, 0x00e5ff, 1.7);
const curbPink = mat(0xff2f8d, 0.22, 0.05, 0xff2f8d, 1.7);
const black = mat(0x050509, 0.56, 0.2);
const glass = mat(0x6fe9ff, 0.22, 0.05, 0x00c8ff, 0.35);
const carPaint = mat(0xff1f63, 0.36, 0.55, 0x1a0010, 0.2);

function addBox({ size, position, material, cast = false, receive = false }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  return mesh;
}

const road = addBox({ size: [roadWidth, 0.18, 820], position: [0, -0.12, -250], material: asphalt, receive: true });
road.name = "road";

for (let i = 0; i < 64; i += 1) {
  const z = -i * 13;
  for (const x of [-laneWidth, 0, laneWidth]) {
    const mark = addBox({ size: [0.16, 0.035, 5.2], position: [x, 0.02, z], material: lineMat });
    roadMarks.push(mark);
  }
}

for (let i = 0; i < 82; i += 1) {
  const z = 8 - i * 10;
  const left = addBox({ size: [0.32, 0.28, 4.2], position: [-roadWidth / 2 - 0.2, 0.08, z], material: i % 2 ? curbPink : curbBlue });
  const right = addBox({ size: [0.32, 0.28, 4.2], position: [roadWidth / 2 + 0.2, 0.08, z], material: i % 2 ? curbBlue : curbPink });
  roadMarks.push(left, right);
}

function createCar(color = 0xff1f63, isPlayer = false) {
  const group = new THREE.Group();
  const paint = color === 0xff1f63 ? carPaint : mat(color, 0.42, 0.42);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.62, 4.35), paint);
  body.position.y = 0.62;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.42, 1.72), paint);
  hood.position.set(0, 0.95, -0.42);
  hood.castShadow = true;
  group.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.62, 1.35), glass);
  cabin.position.set(0, 1.18, 0.78);
  cabin.castShadow = true;
  group.add(cabin);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.12, 0.45), black);
  spoiler.position.set(0, 1.2, 2.12);
  spoiler.castShadow = true;
  group.add(spoiler);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.34, 18);
  const wheelPositions = [
    [-1.22, 0.38, -1.48],
    [1.22, 0.38, -1.48],
    [-1.22, 0.38, 1.42],
    [1.22, 0.38, 1.42]
  ];

  for (const pos of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, black);
    wheel.position.set(...pos);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    group.add(wheel);
  }

  const headColor = isPlayer ? 0x00e5ff : 0xffd36e;
  const tailColor = isPlayer ? 0xff2f8d : 0xff3045;
  const head = mat(headColor, 0.18, 0.1, headColor, 2.8);
  const tail = mat(tailColor, 0.18, 0.1, tailColor, 2.2);
  group.add(addLocalLightBar(0, 0.66, -2.24, 1.55, head));
  group.add(addLocalLightBar(-0.56, 0.68, 2.24, 0.52, tail));
  group.add(addLocalLightBar(0.56, 0.68, 2.24, 0.52, tail));

  return group;
}

function addPoliceRig(car, index) {
  const lightLeft = addLocalLightBar(-0.34, 1.54, 0.18, 0.46, mat(0x157cff, 0.18, 0.1, 0x157cff, 3.4));
  const lightRight = addLocalLightBar(0.34, 1.54, 0.18, 0.46, mat(0xff3045, 0.18, 0.1, 0xff3045, 3.4));
  const beacon = new THREE.PointLight(index % 2 ? 0xff3045 : 0x157cff, 1.2, 16);
  beacon.position.set(0, 2.1, 0);
  car.add(lightLeft, lightRight, beacon);
  car.userData.beacon = beacon;
  car.userData.lightLeft = lightLeft;
  car.userData.lightRight = lightRight;
  return car;
}

function addLocalLightBar(x, y, z, width, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.13, 0.08), material);
  mesh.position.set(x, y, z);
  return mesh;
}

const player = createCar(0xff1f63, true);
player.position.set(0, 0, 6);
scene.add(player);

const exhaust = new THREE.PointLight(0x00e5ff, 0, 10);
exhaust.position.set(0, 0.7, 8.6);
scene.add(exhaust);

function createObstacle(index) {
  const colors = [0x17d9ff, 0xf8d24c, 0x8bff67, 0xf0f4ff, 0xff6f3c];
  const car = createCar(colors[index % colors.length]);
  car.scale.setScalar(0.92 + Math.random() * 0.22);
  car.userData.speed = 58 + Math.random() * 46;
  resetObstacle(car, -80 - index * 42);
  scene.add(car);
  obstacles.push(car);
}

function resetObstacle(car, z = -280 - Math.random() * 360) {
  const lanes = [-1.5, -0.5, 0.5, 1.5];
  car.position.set(lanes[Math.floor(Math.random() * lanes.length)] * laneWidth, 0, z);
  car.rotation.y = 0;
  car.userData.speed = 54 + Math.random() * 66;
}

for (let i = 0; i < 11; i += 1) createObstacle(i);

function createPolice(index) {
  const car = addPoliceRig(createCar(0x0f1726), index);
  car.position.set((index ? -1.2 : 1.2) * laneWidth, 0, 28 + index * 12);
  car.userData.aggression = 0.75 + index * 0.22;
  scene.add(car);
  policeCars.push(car);
}

createPolice(0);
createPolice(1);

function createCityPiece(index) {
  const group = new THREE.Group();
  const side = index % 2 ? -1 : 1;
  const x = side * (13 + Math.random() * 14);
  const z = -index * 18 - 18;
  const height = 5 + Math.random() * 26;
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(4 + Math.random() * 6, height, 4 + Math.random() * 8),
    mat(0x111827, 0.74, 0.05)
  );
  building.position.set(x, height / 2 - 0.1, z);
  building.castShadow = true;
  building.receiveShadow = true;
  group.add(building);

  const signColor = index % 3 === 0 ? 0x00e5ff : index % 3 === 1 ? 0xff2f8d : 0xffe96b;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.34, 0.12), mat(signColor, 0.28, 0.05, signColor, 2.3));
  sign.position.set(x - side * 0.02, Math.min(height - 0.8, 7 + Math.random() * 8), z + 2.2);
  sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);

  const lamp = new THREE.PointLight(signColor, 0.45, 18);
  lamp.position.set(side * 8.2, 3.2, z);
  group.add(lamp);

  scene.add(group);
  roadside.push(group);
}

for (let i = 0; i < 58; i += 1) createCityPiece(i);

function startGame() {
  game.started = true;
  game.crashed = false;
  game.speed = 85;
  game.score = 0;
  game.nitro = 100;
  game.wanted = 1;
  game.paused = false;
  game.lane = 0;
  game.targetX = 0;
  player.position.x = 0;
  message.classList.add("hidden");
  obstacles.forEach((car, index) => resetObstacle(car, -80 - index * 44));
  policeCars.forEach((car, index) => car.position.set((index ? -1.2 : 1.2) * laneWidth, 0, 26 + index * 13));
}

function crash(title = "Bateu!", text = `Pontuacao: ${Math.floor(game.score)}. Clique para tentar outra corrida.`) {
  game.crashed = true;
  game.started = false;
  game.speed = 0;
  game.shake = 1.8;
  message.querySelector("strong").textContent = title;
  message.querySelector("span").textContent = text;
  startButton.textContent = "Reiniciar";
  message.classList.remove("hidden");
}

function togglePause() {
  if (!game.started) return;
  game.paused = !game.paused;
  message.querySelector("strong").textContent = game.paused ? "Pausado" : "Street Rush";
  message.querySelector("span").textContent = "Pressione Esc para voltar para a perseguição.";
  startButton.textContent = "Continuar";
  message.classList.toggle("hidden", !game.paused);
}

function updateInput(dt) {
  if (!game.started || game.paused) return;
  const accelerating = keys.has("KeyW") || keys.has("ArrowUp");
  const braking = keys.has("KeyS") || keys.has("ArrowDown");
  const nitroActive = (keys.has("ShiftLeft") || keys.has("ShiftRight")) && game.nitro > 0 && game.speed > 90;
  const drifting = keys.has("Space") && Math.abs(steeringAxis()) > 0;

  const target = accelerating ? game.maxSpeed : 124;
  game.speed += (target - game.speed) * dt * 0.62;
  if (braking) game.speed -= 145 * dt;
  if (drifting) game.speed -= 20 * dt;
  if (nitroActive) {
    game.speed += 155 * dt;
    game.nitro = Math.max(0, game.nitro - 26 * dt);
    exhaust.intensity = 5.5;
  } else {
    game.nitro = Math.min(100, game.nitro + 9 * dt);
    exhaust.intensity = 1.2 + game.speed / 120;
  }

  game.speed = THREE.MathUtils.clamp(game.speed, 42, 315);

  const steer = steeringAxis();
  const grip = drifting ? 1.55 : 1;
  game.targetX += steer * dt * grip * (7.8 + game.speed * 0.018);
  game.targetX = THREE.MathUtils.clamp(game.targetX, -roadWidth / 2 + 1.25, roadWidth / 2 - 1.25);
}

function steeringAxis() {
  return (keys.has("KeyA") || keys.has("ArrowLeft") ? -1 : 0) + (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
}

function updateWorld(dt) {
  const flow = (game.speed * dt) / 2.6;
  for (const mark of roadMarks) {
    mark.position.z += flow;
    if (mark.position.z > 18) mark.position.z -= 820;
  }

  for (const item of roadside) {
    item.position.z += flow;
    if (item.position.z > 42) item.position.z -= 1040;
  }

  for (const car of obstacles) {
    car.position.z += flow - (car.userData.speed * dt) / 3.1;
    if (car.position.z > 24) resetObstacle(car);
  }

  for (const police of policeCars) {
    const chase = game.started && !game.paused;
    const targetBehind = chase ? 7 + (3 - game.wanted) * 6 : 38;
    const zTarget = player.position.z + targetBehind + police.userData.aggression * 4;
    police.position.z += (zTarget - police.position.z) * dt * (0.55 + game.wanted * 0.22);
    police.position.x += (player.position.x - police.position.x) * dt * (0.75 + game.wanted * 0.2) * police.userData.aggression;
    police.position.x = THREE.MathUtils.clamp(police.position.x, -roadWidth / 2 + 1.1, roadWidth / 2 - 1.1);
    police.rotation.y = (player.position.x - police.position.x) * -0.035;
    const flash = Math.sin(clock.elapsedTime * 18 + police.userData.aggression * 4) > 0;
    police.userData.lightLeft.visible = flash;
    police.userData.lightRight.visible = !flash;
    police.userData.beacon.color.setHex(flash ? 0x157cff : 0xff3045);
  }
}

function updatePlayer(dt, elapsed) {
  player.position.x += (game.targetX - player.position.x) * Math.min(1, dt * 7.2);
  const drifting = keys.has("Space") && Math.abs(steeringAxis()) > 0 && game.started && !game.paused;
  player.rotation.z = (game.targetX - player.position.x) * -0.065 + (drifting ? steeringAxis() * -0.12 : 0);
  player.rotation.y = (game.targetX - player.position.x) * -0.018 + (drifting ? steeringAxis() * 0.16 : 0);
  player.position.y = Math.sin(elapsed * 18) * 0.025 + Math.max(0, game.speed - 220) * 0.0008;
}

function updateCollisions() {
  if (!game.started) return;
  for (const car of obstacles) {
    const dx = Math.abs(car.position.x - player.position.x);
    const dz = Math.abs(car.position.z - player.position.z);
    if (dx < 1.9 && dz < 3.25) {
      crash();
      break;
    }
  }
  for (const police of policeCars) {
    const dx = Math.abs(police.position.x - player.position.x);
    const dz = Math.abs(police.position.z - player.position.z);
    if (dx < 2.05 && dz < 3.05) {
      crash("Capturado", `A policia fechou sua fuga. Pontuacao: ${Math.floor(game.score)}.`);
      break;
    }
  }
}

function updateCamera(dt, elapsed) {
  game.shake = Math.max(0, game.shake - dt * 2.4);
  const speedLift = game.speed / 100;
  const shakeX = (Math.random() - 0.5) * game.shake * 0.18;
  const shakeY = (Math.random() - 0.5) * game.shake * 0.12;
  const desired =
    game.cameraMode === 1
      ? new THREE.Vector3(player.position.x * 0.62 + shakeX, 2.15 + shakeY, 5.1)
      : new THREE.Vector3(player.position.x * 0.28 + shakeX, 5.1 + speedLift * 0.22 + shakeY, 13.8 + speedLift * 0.34);
  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x * 0.45, 1.15 + Math.sin(elapsed * 2.4) * 0.08, game.cameraMode === 1 ? -16 : -10 - speedLift);
  camera.fov = THREE.MathUtils.lerp(camera.fov, 64 + Math.max(0, game.speed - 180) * 0.045, dt * 3);
  camera.updateProjectionMatrix();
}

function updateHud(dt) {
  if (game.started && !game.paused) {
    game.score += dt * game.speed * 0.35;
    const closestPolice = Math.min(...policeCars.map((car) => Math.hypot(car.position.x - player.position.x, car.position.z - player.position.z)));
    if (closestPolice < 16) game.wanted = Math.min(5, game.wanted + dt * 0.18);
    if (closestPolice > 36) game.wanted = Math.max(1, game.wanted - dt * 0.1);
  }
  speedEl.textContent = Math.round(game.speed);
  gearEl.textContent = game.speed < 4 ? "R" : Math.min(6, Math.max(1, Math.ceil(game.speed / 52)));
  scoreEl.textContent = Math.floor(game.score);
  nitroEl.textContent = Math.round(game.nitro);
  wantedEl.textContent = Math.ceil(game.wanted);
  nitroBar.style.width = `${game.nitro}%`;
  miniPlayer.style.left = `${THREE.MathUtils.mapLinear(player.position.x, -roadWidth / 2, roadWidth / 2, 16, 102)}px`;
  const leadPolice = policeCars[0];
  miniPolice.style.left = `${THREE.MathUtils.mapLinear(leadPolice.position.x, -roadWidth / 2, roadWidth / 2, 16, 102)}px`;
  miniPolice.style.bottom = `${THREE.MathUtils.clamp(30 + (leadPolice.position.z - player.position.z) * 1.8, 18, 148)}px`;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  updateInput(dt);
  updateWorld(dt);
  updatePlayer(dt, elapsed);
  updateCollisions();
  updateCamera(dt, elapsed);
  updateHud(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  if (event.code === "KeyR") startGame();
  if (event.code === "KeyC") game.cameraMode = (game.cameraMode + 1) % 2;
  if (event.code === "Escape") togglePause();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

startButton.addEventListener("click", () => {
  if (game.paused) {
    game.paused = false;
    message.classList.add("hidden");
  } else {
    message.querySelector("strong").textContent = "Street Rush";
    message.querySelector("span").textContent = "Fuja da polícia, desvie do tráfego e segure Shift para nitro na avenida noturna.";
    startButton.textContent = "Correr";
    startGame();
  }
});

if (new URLSearchParams(window.location.search).has("start")) {
  startGame();
}

tick();
