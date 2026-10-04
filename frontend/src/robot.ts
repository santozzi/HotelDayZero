import * as THREE from 'three';

// Androide guardián de la 102 (diseño original): proporciones humanas, endoesqueleto metálico con placas
// de blindaje castigadas (rayones, quemaduras, impactos, placas faltantes, cables expuestos).
// Articulado para posarlo sentado/roto o parado. Ojos apagados salvo en la versión "despierta".

interface Limb {
  root: THREE.Group; // hombro / cadera
  mid: THREE.Group; // codo / rodilla
}

export interface Robot {
  group: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  eyeLight?: THREE.PointLight;
  rig: {
    hips: THREE.Group;
    torso: THREE.Group;
    jaw: THREE.Group;
    armL: Limb;
    armR: Limb;
    legL: Limb;
    legR: Limb;
    fingers: THREE.Group[];
  };
}

// ---------- Textura de metal castigado ----------
let damagedTex: THREE.CanvasTexture | null = null;
function battleMetal(): THREE.CanvasTexture {
  if (damagedTex) return damagedTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  g.fillStyle = '#6d7177';
  g.fillRect(0, 0, 256, 256);
  // manchas de quemado
  for (let i = 0; i < 9; i++) {
    const x = rnd() * 256, y = rnd() * 256, r = 18 + rnd() * 45;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(20,14,8,0.85)');
    grad.addColorStop(0.6, 'rgba(60,40,20,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // rayones
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(${200 + rnd() * 40},${200 + rnd() * 40},${205 + rnd() * 40},${0.25 + rnd() * 0.35})`;
    g.lineWidth = 0.5 + rnd() * 1.2;
    const x = rnd() * 256, y = rnd() * 256, a = rnd() * Math.PI, l = 10 + rnd() * 50;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // impactos: agujero oscuro con borde levantado
  for (let i = 0; i < 7; i++) {
    const x = 20 + rnd() * 216, y = 20 + rnd() * 216, r = 3 + rnd() * 4;
    g.fillStyle = 'rgba(190,190,195,0.6)';
    g.beginPath();
    g.arc(x, y, r + 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0a0a0b';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // óxido
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(${110 + rnd() * 40},${55 + rnd() * 20},20,${rnd() * 0.35})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  damagedTex = new THREE.CanvasTexture(c);
  damagedTex.colorSpace = THREE.SRGBColorSpace;
  damagedTex.wrapS = damagedTex.wrapT = THREE.RepeatWrapping;
  return damagedTex;
}

function add(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function node(x: number, y: number, z: number, parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function buildRobot(awake: boolean): Robot {
  const frame = new THREE.MeshStandardMaterial({ color: 0x4a4e55, roughness: 0.4, metalness: 0.85 });
  const joint = new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.5, metalness: 0.8 });
  const armor = new THREE.MeshStandardMaterial({ map: battleMetal(), roughness: 0.55, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9, metalness: 0.2 });
  const wireRed = new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: 0.6 });
  const wireBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: awake ? 0xff1a08 : 0x0d0d0d, toneMapped: false });

  const root = new THREE.Group();

  // ---------- Cadera ----------
  const hips = node(0, 1.0, 0, root);
  add(new THREE.BoxGeometry(0.36, 0.18, 0.22), armor, 0, 0.02, 0, hips);

  // ---------- Piernas ----------
  const makeLeg = (side: number): Limb => {
    const r = node(side * 0.11, -0.04, 0, hips);
    add(new THREE.SphereGeometry(0.065, 12, 10), joint, 0, 0, 0, r);
    add(new THREE.CylinderGeometry(0.075, 0.058, 0.44, 12), frame, 0, -0.23, 0, r);
    add(new THREE.BoxGeometry(0.13, 0.3, 0.04), armor, 0, -0.22, 0.075, r);
    const k = node(0, -0.46, 0, r);
    add(new THREE.SphereGeometry(0.055, 12, 10), joint, 0, 0, 0, k);
    add(new THREE.BoxGeometry(0.09, 0.08, 0.05), armor, 0, 0, 0.06, k);
    add(new THREE.CylinderGeometry(0.06, 0.045, 0.42, 12), frame, 0, -0.22, 0, k);
    add(new THREE.BoxGeometry(0.1, 0.28, 0.04), armor, 0, -0.2, 0.06, k);
    add(new THREE.BoxGeometry(0.12, 0.07, 0.26), joint, 0, -0.47, 0.06, k);
    return { root: r, mid: k };
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---------- Torso ----------
  const torso = node(0, 0.1, 0, hips);
  for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), joint, 0, 0.03 + i * 0.075, -0.03, torso);
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.26 - i * 0.02, 0.05, 0.15), armor, 0, 0.05 + i * 0.07, 0.02, torso);
  const chest = add(new THREE.BoxGeometry(0.44, 0.36, 0.24), armor, 0, 0.42, 0, torso);
  chest.rotation.z = 0.02;
  // placa del pecho arrancada: hueco oscuro con cables a la vista
  add(new THREE.BoxGeometry(0.14, 0.12, 0.02), dark, 0.1, 0.44, 0.121, torso);
  for (const [x, len, mat] of [[0.07, 0.16, wireRed], [0.1, 0.22, wireBlack], [0.13, 0.12, wireRed]] as const) {
    const w = add(new THREE.CylinderGeometry(0.006, 0.006, len, 6), mat, x, 0.42 - len / 2, 0.13, torso);
    w.rotation.z = (x - 0.1) * 3;
  }
  // abolladura y un par de impactos en relieve
  const dent = add(new THREE.SphereGeometry(0.04, 10, 8), dark, -0.12, 0.5, 0.11, torso);
  dent.scale.set(1, 0.6, 0.25);
  for (const [x, y] of [[-0.05, 0.36], [-0.15, 0.32], [0.16, 0.56]]) {
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 8), dark, x, y, 0.121, torso).rotation.x = Math.PI / 2;
  }
  // hombros
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(0.15, 0.1, 0.2), armor, side * 0.23, 0.6, 0, torso);

  // ---------- Brazos ----------
  const fingers: THREE.Group[] = [];
  const makeArm = (side: number, plated: boolean): Limb => {
    const r = node(side * 0.27, 0.56, 0, torso);
    add(new THREE.SphereGeometry(0.07, 12, 10), joint, 0, 0, 0, r);
    add(new THREE.CylinderGeometry(0.055, 0.045, 0.32, 12), frame, 0, -0.18, 0, r);
    add(new THREE.BoxGeometry(0.1, 0.22, 0.1), armor, side * 0.02, -0.17, 0, r);
    const e = node(0, -0.34, 0, r);
    add(new THREE.SphereGeometry(0.045, 10, 8), joint, 0, 0, 0, e);
    add(new THREE.CylinderGeometry(0.045, 0.038, 0.3, 12), frame, 0, -0.16, 0, e);
    // un antebrazo perdió la placa: queda el esqueleto y cables
    if (plated) add(new THREE.BoxGeometry(0.085, 0.22, 0.085), armor, 0, -0.15, 0, e);
    else add(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), wireRed, 0.03, -0.15, 0.03, e);
    const hand = node(0, -0.33, 0, e);
    add(new THREE.BoxGeometry(0.08, 0.1, 0.035), joint, 0, -0.05, 0, hand);
    for (let i = 0; i < 4; i++) {
      const f = node(-0.03 + i * 0.02, -0.1, 0, hand);
      add(new THREE.BoxGeometry(0.014, 0.05, 0.016), frame, 0, -0.025, 0, f);
      const tip = node(0, -0.05, 0, f);
      add(new THREE.BoxGeometry(0.012, 0.04, 0.014), frame, 0, -0.02, 0, tip);
      fingers.push(f, tip);
    }
    const thumb = node(side * -0.045, -0.06, 0.015, hand);
    add(new THREE.BoxGeometry(0.014, 0.045, 0.016), frame, 0, -0.02, 0, thumb);
    return { root: r, mid: e };
  };
  const armL = makeArm(-1, false);
  const armR = makeArm(1, true);

  // ---------- Cuello y cabeza ----------
  const neck = node(0, 0.64, 0, torso);
  for (const x of [-0.025, 0.025]) add(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), joint, x, 0.04, 0, neck);
  const head = node(0, 0.14, 0, neck);
  const skull = add(new THREE.SphereGeometry(0.11, 18, 14), armor, 0, 0.02, -0.01, head);
  skull.scale.set(0.9, 1.1, 1.0);
  add(new THREE.BoxGeometry(0.15, 0.13, 0.05), frame, 0, -0.01, 0.075, head);
  // grieta en la cara
  const crack = add(new THREE.BoxGeometry(0.006, 0.09, 0.006), dark, 0.03, 0.0, 0.102, head);
  crack.rotation.z = 0.4;
  // cuencas y ojos
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.045, 0.025, 0.02), dark, side * 0.038, 0.012, 0.096, head);
    eyes.push(add(new THREE.SphereGeometry(0.014, 10, 8), eyeMat, side * 0.038, 0.012, 0.102, head));
  }
  // mandíbula
  const jaw = node(0, -0.07, 0.04, head);
  add(new THREE.BoxGeometry(0.12, 0.04, 0.08), frame, 0, -0.01, 0.02, jaw);
  // costado de la cabeza dañado: placa faltante
  add(new THREE.BoxGeometry(0.02, 0.07, 0.07), dark, -0.095, 0.02, 0.0, head);

  let eyeLight: THREE.PointLight | undefined;
  if (awake) {
    eyeLight = new THREE.PointLight(0xff1a08, 0, 5, 2);
    eyeLight.position.set(0, 0.01, 0.3);
    head.add(eyeLight);
  }

  return { group: root, head, eyes, eyeLight, rig: { hips, torso, jaw, armL, armR, legL, legR, fingers } };
}

/** Sentado en el piso, recostado y ladeado, como apagado. */
export function poseSitting(r: Robot) {
  const k = r.rig;
  k.hips.position.y = 0.16;
  k.torso.rotation.set(-0.4, 0, 0.28);
  r.head.rotation.set(0.65, 0, -0.35);
  k.jaw.rotation.x = 0.12;
  k.legL.root.rotation.set(-Math.PI / 2 + 0.05, 0, -0.18);
  k.legL.mid.rotation.x = 0.12;
  k.legR.root.rotation.set(-Math.PI / 2 - 0.5, 0, 0.12);
  k.legR.mid.rotation.x = 1.3;
  k.armL.root.rotation.set(0.15, 0, -0.3);
  k.armL.mid.rotation.x = -0.25;
  k.armR.root.rotation.set(-0.6, 0, 0.2);
  k.armR.mid.rotation.x = -1.0;
  k.fingers.forEach((f) => (f.rotation.x = 0.25));
}

/** Parado frente al jugador, levemente inclinado hacia adelante, brazos al frente. */
export function poseStanding(r: Robot) {
  const k = r.rig;
  k.hips.position.y = 1.0;
  k.torso.rotation.set(0.15, 0, 0);
  r.head.rotation.set(0.12, 0, 0);
  k.jaw.rotation.x = 0.18;
  k.legL.root.rotation.set(-0.08, 0, -0.06);
  k.legL.mid.rotation.x = 0.12;
  k.legR.root.rotation.set(0.06, 0, 0.06);
  k.legR.mid.rotation.x = 0.05;
  k.armL.root.rotation.set(-0.55, 0, -0.25);
  k.armL.mid.rotation.x = -0.7;
  k.armR.root.rotation.set(-0.55, 0, 0.25);
  k.armR.mid.rotation.x = -0.7;
  k.fingers.forEach((f) => (f.rotation.x = -0.5));
}
