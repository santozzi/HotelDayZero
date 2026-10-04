import * as THREE from 'three';
import * as tex from './textures';
import { buildRobot, poseSitting, poseStanding, type Robot } from './robot';
import { BOARDS, CONTROL_BOARDS, CONTROL_TITLE, type Clipping } from './boards';

export const CELL = 2;
export const WALL_H = 3;

// Leyenda:  # pared   . piso   S inicio   1-4 puertas de habitaciones   X salida
// Los objetos de cada habitación (terminales, notas, teclado) se ubican por código en buildLevel.
const MAP = [
  '#########################',
  '#.....#.....#.....#.....#',
  '#.....#.....#.....#.....#',
  '#.....#.....#.....#.....#',
  '#.....#.....#.....#.....#',
  '###1#####2#####3#####4###',
  '#.......................#',
  '#S......................X',
  '#.......................#',
  '#########################',
];

export const ROOM_COUNT = 4;
export const EXIT = 4; // índice de "habitación" de la salida

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  active: boolean;
}

export type StationKind = 'quiz' | 'keypad' | 'note' | 'logs' | 'fix' | 'csrf' | 'audit' | 'folder' | 'board';

export interface Station {
  kind: StationKind;
  room: number;
  index: number; // posición dentro de su tipo (sólo importa para quiz)
  done: boolean;
  result?: 'ok' | 'bad';
  noteId?: string;
  link?: number; // carpeta → índice de la terminal de quiz que tiene al lado; pizarra → habitación
  screen?: THREE.CanvasTexture;
}

export interface Door {
  room: number; // 0..3 habitaciones, 4 = salida
  label: string;
  pivot: THREE.Group;
  collider: Box;
  unlocked: boolean;
  open: boolean;
  amount: number;
}

export interface Bulb {
  light: THREE.PointLight;
  bulb: THREE.Mesh;
  base: number;
  mode: 'steady' | 'flicker' | 'dying';
  level: number;
  timer: number;
  burst: number;
}

export interface Level {
  colliders: Box[];
  stations: Station[];
  doors: Door[];
  bulbs: Bulb[];
  interactables: THREE.Object3D[];
  occluders: THREE.Object3D[];
  spawn: THREE.Vector3;
  spawnYaw: number;
  size: THREE.Vector3;
  /** Límites interiores (x/z) de cada habitación, para saber dónde está el jugador. */
  roomBounds: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  /** Robot de la 102: roto contra la pared y la versión malvada que aparece al perder. */
  robotBroken: Robot;
  robotEvil: Robot;
  /** Contenido de cada pizarra; la estación 'board' guarda el índice en `link`. */
  boards: { title?: string; clips: Clipping[] }[];
}

const cx = (c: number) => c * CELL + CELL / 2;
const cz = (r: number) => r * CELL + CELL / 2;

function box(minX: number, maxX: number, minZ: number, maxZ: number): Box {
  return { minX, maxX, minZ, maxZ, active: true };
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function buildLevel(scene: THREE.Scene): Level {
  const rows = MAP.length;
  const cols = MAP[0].length;
  const W = cols * CELL;
  const D = rows * CELL;

  const colliders: Box[] = [];
  const stations: Station[] = [];
  const doors: Door[] = [];
  const bulbs: Bulb[] = [];
  const interactables: THREE.Object3D[] = [];
  const occluders: THREE.Object3D[] = [];
  const spawn = new THREE.Vector3(cx(1), 0, cz(7));

  const wallMat = new THREE.MeshStandardMaterial({ map: tex.wallpaper(), roughness: 0.95 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 });
  const plasticMat = new THREE.MeshStandardMaterial({ color: 0x8a8270, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: 0.5, metalness: 0.6 });
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0x9c968a, roughness: 1 });

  // --- Piso, alfombra y techo ---
  const floorTex = tex.woodFloor();
  floorTex.repeat.set(cols, rows);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, D / 2);
  scene.add(floor);

  const carpetTex = tex.carpet();
  carpetTex.repeat.set(1, 18);
  const carpetGeo = new THREE.PlaneGeometry(2.6, W - 5).rotateX(-Math.PI / 2).rotateY(Math.PI / 2);
  scene.add(mesh(carpetGeo, new THREE.MeshStandardMaterial({ map: carpetTex, roughness: 1 }), W / 2, 0.01, cz(7)));

  const ceilTex = tex.ceiling();
  ceilTex.repeat.set(cols / 2, rows / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(W / 2, WALL_H, D / 2);
  scene.add(ceil);

  // --- Paredes y puertas desde el mapa ---
  const wallCells: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = MAP[r][c];
      if (ch === '#') {
        wallCells.push([c, r]);
        colliders.push(box(c * CELL, c * CELL + CELL, r * CELL, r * CELL + CELL));
      } else if ('1234X'.includes(ch)) {
        makeDoor(ch, c, r);
      } else if (ch === 'S') {
        spawn.set(cx(c), 0, cz(r));
      }
    }
  }

  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), wallMat, wallCells.length);
  const m4 = new THREE.Matrix4();
  wallCells.forEach(([c, r], i) => walls.setMatrixAt(i, m4.makeTranslation(cx(c), WALL_H / 2, cz(r))));
  scene.add(walls);
  occluders.push(walls);

  function makeDoor(ch: string, c: number, r: number) {
    const x = cx(c);
    const z = cz(r);
    const alongX = MAP[r][c - 1] === '#' && MAP[r][c + 1] === '#';
    const isExit = ch === 'X';
    const room = isExit ? EXIT : Number(ch) - 1;
    const label = isExit ? 'SALIDA' : String(101 + room);

    // Marco construido en coordenadas locales (puerta a lo largo de X) y rotado si la pared corre en Z.
    const frame = new THREE.Group();
    frame.position.set(x, 0, z);
    if (!alongX) frame.rotation.y = -Math.PI / 2;
    const jambGeo = new THREE.BoxGeometry(0.4, WALL_H, CELL);
    frame.add(mesh(jambGeo, wallMat, -0.8, WALL_H / 2, 0));
    frame.add(mesh(jambGeo, wallMat, 0.8, WALL_H / 2, 0));
    frame.add(mesh(new THREE.BoxGeometry(1.2, WALL_H - 2.2, CELL), wallMat, 0, 2.2 + (WALL_H - 2.2) / 2, 0));

    const pivot = new THREE.Group();
    pivot.position.set(-0.6, 0, 0);
    const doorMat = new THREE.MeshStandardMaterial({
      map: tex.doorTexture(isExit ? 'EXIT' : label, isExit ? '#2e3430' : '#3d2618'),
      roughness: 0.75,
    });
    const panel = mesh(new THREE.BoxGeometry(1.2, 2.2, 0.08), doorMat, 0.6, 1.1, 0);
    pivot.add(panel);
    frame.add(pivot);
    scene.add(frame);
    occluders.push(frame);

    const span = (a: number, b: number, d: number) =>
      alongX ? box(x + a, x + b, z - d, z + d) : box(x - d, x + d, z + a, z + b);
    colliders.push(span(-1, -0.6, 1), span(0.6, 1, 1));
    const collider = span(-0.6, 0.6, 0.1);
    colliders.push(collider);

    const door: Door = { room, label, pivot, collider, unlocked: room === 0, open: false, amount: 0 };
    panel.userData.door = door;
    interactables.push(panel);
    doors.push(door);

    if (isExit) {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.22),
        new THREE.MeshBasicMaterial({ map: tex.signTexture('SALIDA'), toneMapped: false }),
      );
      sign.position.set(x - CELL / 2 - 0.01, 2.6, z);
      sign.rotation.y = -Math.PI / 2;
      scene.add(sign);
      const red = new THREE.PointLight(0xff2a1a, 1.2, 6, 2);
      red.position.set(x - CELL / 2 - 0.3, 2.5, z);
      scene.add(red);
    }
  }

  function addStation(kind: StationKind, room: number, obj: THREE.Object3D[], extra: Partial<Station> = {}) {
    const index = stations.filter((s) => s.kind === kind).length;
    const station: Station = { kind, room, index, done: false, ...extra };
    for (const o of obj) {
      o.userData.station = station;
      interactables.push(o);
    }
    stations.push(station);
    return station;
  }

  function makeDesk(x: number, z: number) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(mesh(new THREE.BoxGeometry(1.5, 0.06, 0.75), woodMat, 0, 0.74, 0));
    const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.06);
    for (const [lx, lz] of [[-0.68, -0.32], [0.68, -0.32], [-0.68, 0.32], [0.68, 0.32]]) {
      g.add(mesh(legGeo, woodMat, lx, 0.36, lz));
    }
    scene.add(g);
    colliders.push(box(x - 0.75, x + 0.75, z - 0.4, z + 0.4));
    return g;
  }

  /** Escritorio con monitor CRT mirando hacia +z (hacia la puerta). */
  function makeTerminal(kind: StationKind, room: number, x: number, z: number) {
    const g = makeDesk(x, z);
    const body = mesh(new THREE.BoxGeometry(0.56, 0.46, 0.5), plasticMat, 0, 1.0, -0.1);
    const screenTex = tex.screenTexture();
    const screen = mesh(
      new THREE.PlaneGeometry(0.44, 0.33),
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
      0, 1.01, 0.152,
    );
    g.add(body, screen);
    g.add(mesh(new THREE.BoxGeometry(0.46, 0.03, 0.16), darkMat, 0, 0.785, 0.22));
    const glow = new THREE.PointLight(0x40ff70, 0.35, 2.2, 2);
    glow.position.set(0, 1.05, 0.45);
    g.add(glow);
    return addStation(kind, room, [body, screen], { screen: screenTex });
  }

  /** Papel o afiche legible. `rotY` orienta la cara visible; `flat` lo apoya sobre una superficie. */
  function makeNote(noteId: string, room: number, title: string, x: number, y: number, z: number, rotY: number, flat: boolean) {
    const w = flat ? 0.24 : 0.6;
    const h = flat ? 0.32 : 0.8;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex.noteTexture(title, !flat), roughness: 1, side: THREE.DoubleSide, emissive: 0x2a2416 }),
    );
    m.position.set(x, y, z);
    if (flat) {
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rotY;
    } else {
      m.rotation.y = rotY;
    }
    scene.add(m);
    return addStation('note', room, [m], { noteId, done: true });
  }

  /** Panel de pared con pantalla (teclado de la cerradura o panel de auditoría). */
  function makeWallPanel(kind: StationKind, room: number, x: number, y: number, z: number, rotY: number, w: number, h: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    const body = mesh(new THREE.BoxGeometry(w, h, 0.06), metalMat, 0, 0, 0.03);
    const screenTex = tex.screenTexture(256, Math.round((256 * h) / w));
    const screen = mesh(
      new THREE.PlaneGeometry(w * 0.82, h * 0.82),
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
      0, 0, 0.061,
    );
    g.add(body, screen);
    const glow = new THREE.PointLight(0x40ff70, 0.3, 1.8, 2);
    glow.position.set(0, 0, 0.35);
    g.add(glow);
    scene.add(g);
    return addStation(kind, room, [body, screen], { screen: screenTex });
  }

  // Carpeta negra de la cátedra sobre la mesa, al lado del monitor. Al abrirla da la teoría.
  function makeFolder(room: number, link: number, deskX: number, deskZ: number) {
    const fx = deskX + 0.5;
    const fy = 0.79; // sobre la tapa del escritorio
    const fz = deskZ + 0.06;
    const g = new THREE.Group();
    g.position.set(fx, fy, fz);
    g.rotation.y = -0.35;
    const folderMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.55, metalness: 0.1 });
    const body = mesh(new THREE.BoxGeometry(0.3, 0.045, 0.4), folderMat, 0, 0, 0);
    const cover = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.38),
      new THREE.MeshStandardMaterial({ map: tex.folderCover('Gustavo Ramoscelli'), roughness: 0.5, emissive: 0x161008 }),
    );
    cover.rotation.x = -Math.PI / 2;
    cover.position.y = 0.024;
    g.add(body, cover);
    scene.add(g);
    addStation('folder', room, [body, cover], { link, done: true });
  }

  // Pizarras de corcho con recortes. `rotY` orienta la cara hacia el interior.
  const boards: Level['boards'] = [];
  function makeBoardAt(room: number, x: number, z: number, rotY: number, clips: Clipping[], title?: string) {
    const g = new THREE.Group();
    g.position.set(x, 1.72, z);
    g.rotation.y = rotY;
    const back = mesh(new THREE.BoxGeometry(1.56, 1.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x3b2614, roughness: 0.9 }), 0, 0, 0);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.0),
      new THREE.MeshStandardMaterial({ map: tex.corkBoard(clips, title), roughness: 0.95, emissive: 0x1a1208 }),
    );
    face.position.z = 0.022;
    g.add(back, face);
    scene.add(g);
    boards.push({ title, clips });
    addStation('board', room, [back, face], { link: boards.length - 1, done: true });
  }
  // noticias en la pared oeste de cada habitación
  const makeBoard = (room: number) => makeBoardAt(room, 12 * room + CELL + 0.03, 5.7, Math.PI / 2, BOARDS[room]);

  function makeBed(x: number, z: number) {
    scene.add(mesh(new THREE.BoxGeometry(1.6, 0.35, 2.1), woodMat, x, 0.175, z));
    const mattress = mesh(new THREE.BoxGeometry(1.5, 0.2, 2.0), sheetMat, x, 0.45, z);
    mattress.rotation.z = 0.03;
    scene.add(mattress);
    scene.add(mesh(new THREE.BoxGeometry(0.6, 0.12, 0.35), sheetMat, x - 0.3, 0.6, z - 0.75));
    scene.add(mesh(new THREE.BoxGeometry(1.6, 0.9, 0.08), woodMat, x, 0.45, z - 1.07));
    colliders.push(box(x - 0.8, x + 0.8, z - 1.1, z + 1.05));
  }

  // --- Contenido de cada habitación ---
  // Columnas de la habitación i: L (izquierda), M (centro, frente a la puerta), R (derecha).
  const roomBounds: Level['roomBounds'] = [];
  const NORTH_WALL_Z = CELL + 0.01; // cara interior de la pared norte
  const SOUTH_WALL_Z = 5 * CELL - 0.01; // cara interior de la pared de las puertas
  const BED_Z = 8.4;

  for (let i = 0; i < ROOM_COUNT; i++) {
    const L = cx(1 + 6 * i);
    const M = cx(3 + 6 * i);
    const R = cx(5 + 6 * i);
    roomBounds.push({ minX: L - 1, maxX: R + 1, minZ: CELL, maxZ: 5 * CELL });
    makeBed(R, BED_Z);
    makeBoard(i);

    if (i === 0) {
      // 101 · Teoría: tres terminales, cada una con su carpeta de la cátedra al lado
      const tA = makeTerminal('quiz', 0, L, cz(1));
      const tB = makeTerminal('quiz', 0, R, cz(1));
      const tC = makeTerminal('quiz', 0, M, cz(3));
      makeFolder(0, tA.index, L, cz(1));
      makeFolder(0, tB.index, R, cz(1));
      makeFolder(0, tC.index, M, cz(3));
    } else if (i === 1) {
      // 102 · Fuerza bruta: la puerta se cierra y hay que deducir la clave del teclado
      makeWallPanel('keypad', 1, M + 1.25, 1.35, SOUTH_WALL_Z, Math.PI, 0.26, 0.36);
      makeNote('manual', 1, 'MANUAL', M, 1.7, NORTH_WALL_Z, 0, false);
      makeDesk(L, cz(1));
      makeNote('diccionario', 1, 'TOP 6', L + 0.3, 0.775, cz(1), 0.25, true);
      makeNote('carta', 1, 'Carta', R - 0.15, 0.56, BED_Z + 0.25, -0.4, true);
    } else if (i === 2) {
      // 103 · Inyección de comandos: leer logs y reparar el panel de diagnóstico
      makeTerminal('logs', 2, L, cz(1));
      makeTerminal('fix', 2, M, cz(3));
      makeFolder(2, -1, L, cz(1));
      makeFolder(2, -1, M, cz(3));
      makeNote('regla', 2, 'REGLA DE ORO', M, 1.7, NORTH_WALL_Z, 0, false);
    } else {
      // 104 · CSRF: filtrar las peticiones que llegan al servidor de la conserjería
      makeTerminal('csrf', 3, M, cz(3));
      makeFolder(3, -1, M, cz(3));
      makeNote('politica', 3, 'POLÍTICA', M, 1.7, NORTH_WALL_Z, 0, false);
      makeDesk(L, cz(1));
      makeNote('volante', 3, '¡GANASTE!', L - 0.25, 0.775, cz(1), -0.2, true);
    }
  }

  // --- Robot de la 102: sentado en el piso contra la pared opuesta a la puerta, como roto ---
  const robotBroken = buildRobot(false);
  poseSitting(robotBroken);
  const rbX = cx(9) + 1.4; // a la derecha del centro, lejos de la nota del manual
  const rbZ = CELL + 0.62;
  robotBroken.group.position.set(rbX, 0, rbZ);
  robotBroken.group.rotation.y = 0.15;
  scene.add(robotBroken.group);
  colliders.push(box(rbX - 0.5, rbX + 0.5, CELL, rbZ + 1.0));
  // restos de blindaje en el piso
  const scrapMat = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.6, metalness: 0.75 });
  for (const [dx, dz, ry] of [[-0.7, 0.9, 0.4], [0.6, 1.3, -0.9], [-0.3, 1.6, 1.7]]) {
    const scrap = mesh(new THREE.BoxGeometry(0.12, 0.012, 0.09), scrapMat, rbX + dx, 0.008, rbZ + dz);
    scrap.rotation.y = ry;
    scene.add(scrap);
  }

  // --- Robot "despierto": oculto hasta que el jugador pierde en la 102 ---
  const robotEvil = buildRobot(true);
  poseStanding(robotEvil);
  robotEvil.group.visible = false;
  scene.add(robotEvil.group);

  // --- Pasillo: pizarras de control poblacional en la pared norte, entre las puertas ---
  [13, 25, 37].forEach((x, k) => makeBoardAt(EXIT, x, 6 * CELL + 0.03, 0, CONTROL_BOARDS[k], CONTROL_TITLE));

  // --- Salida: panel de auditoría junto a la puerta ---
  makeWallPanel('audit', EXIT, W - CELL - 0.01, 1.4, cz(6) - 0.3, -Math.PI / 2, 0.5, 0.4);

  // --- Valijas abandonadas en el pasillo ---
  const suitcaseMat = new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 0.9 });
  for (const [x, z, rot] of [[13.5, 17.3, 0.3], [30, 12.8, -0.5], [30.7, 13.1, 1.2], [41.5, 17.2, 0.1]]) {
    const s = mesh(new THREE.BoxGeometry(0.7, 0.45, 0.25), suitcaseMat, x, 0.225, z);
    s.rotation.y = rot;
    scene.add(s);
    colliders.push(box(x - 0.4, x + 0.4, z - 0.4, z + 0.4));
  }

  // --- Papeles tirados (decoración) ---
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xbab3a2, roughness: 1, side: THREE.DoubleSide });
  const paperGeo = new THREE.PlaneGeometry(0.21, 0.29).rotateX(-Math.PI / 2);
  for (let i = 0; i < 50; i++) {
    const p = mesh(paperGeo, paperMat, 2 + Math.random() * (W - 4), 0.015 + i * 0.0003, 2 + Math.random() * (D - 4));
    p.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p);
  }

  // --- Grafitis en la pared sur del pasillo ---
  for (const [x, text] of [[11, 'NO HAGAS CLICK'], [27, '¿QUIÉN TIENE TU CONTRASEÑA?'], [41, 'NO CONFÍES EN EL USUARIO']] as const) {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 0.8),
      new THREE.MeshStandardMaterial({ map: graffiti(text), transparent: true, roughness: 1 }),
    );
    decal.position.set(x, 1.7, cz(9) - CELL / 2 - 0.01);
    decal.rotation.y = Math.PI;
    scene.add(decal);
  }

  // --- Lamparitas colgantes: una por habitación y una por tramo de pasillo ---
  const modes: Bulb['mode'][] = ['steady', 'flicker', 'dying', 'flicker'];
  const hallModes: Bulb['mode'][] = ['dying', 'flicker', 'steady', 'dying'];
  const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.4);
  const bulbGeo = new THREE.SphereGeometry(0.06, 12, 8);
  const addBulb = (x: number, z: number, mode: Bulb['mode'], base: number) => {
    const light = new THREE.PointLight(0xffc27a, base, 12, 1.7);
    light.position.set(x, 2.5, z);
    const bulb = mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), x, 2.55, z);
    scene.add(light, bulb, mesh(cordGeo, darkMat, x, 2.8, z));
    bulbs.push({ light, bulb, base, mode, level: 1, timer: Math.random() * 3, burst: 0 });
  };
  for (let i = 0; i < ROOM_COUNT; i++) {
    addBulb(cx(3 + 6 * i), 6, modes[i], 12);
    addBulb(cx(3 + 6 * i), cz(7), hallModes[i], 11);
  }

  return {
    colliders,
    stations,
    doors: doors.sort((a, b) => a.room - b.room),
    bulbs,
    interactables,
    occluders,
    spawn,
    spawnYaw: -Math.PI / 2,
    size: new THREE.Vector3(W, WALL_H, D),
    roomBounds,
    robotBroken,
    robotEvil,
    boards,
  };
}

function graffiti(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'bold 40px "Special Elite", monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(120,10,8,0.85)';
  g.fillText(text, 256, 56, 500);
  for (let i = 0; i < 18; i++) {
    const x = 40 + Math.random() * 432;
    g.fillRect(x, 62 + Math.random() * 10, 2 + Math.random() * 2, 10 + Math.random() * 45);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mueve un círculo (aprox. cuadrado de lado 2r) resolviendo colisiones eje por eje. */
export function moveWithCollisions(pos: THREE.Vector3, dx: number, dz: number, r: number, colliders: Box[]) {
  pos.x += dx;
  for (const b of colliders) {
    if (!b.active || dx === 0) continue;
    if (pos.x + r > b.minX && pos.x - r < b.maxX && pos.z + r > b.minZ && pos.z - r < b.maxZ) {
      pos.x = dx > 0 ? b.minX - r : b.maxX + r;
    }
  }
  pos.z += dz;
  for (const b of colliders) {
    if (!b.active || dz === 0) continue;
    if (pos.x + r > b.minX && pos.x - r < b.maxX && pos.z + r > b.minZ && pos.z - r < b.maxZ) {
      pos.z = dz > 0 ? b.minZ - r : b.maxZ + r;
    }
  }
}
