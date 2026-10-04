import * as THREE from 'three';
import './style.css';
import * as api from './api';
import { Sfx } from './audio';
import { buildLevel, moveWithCollisions, EXIT, ROOM_COUNT, type Door, type Station } from './level';
import { drawScreen, drawKeypad } from './textures';
import { NOTES } from './notes';
import { FULL_THEORY } from './theory';
import { startComic, isComicOpen } from './comic';

const $ = (id: string) => document.getElementById(id) as HTMLElement;

const EYE = 1.6;
const RADIUS = 0.3;
const WALK = 2.6;
const RUN = 4.6;
const REACH = 2.4;
const MOUSE_SENS = 0.0022;

// --- Motor ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
$('app').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x020203, 0.045);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight(0x8090a8, 0x201510, 0.45));

const flashlight = new THREE.SpotLight(0xfff0d0, 14, 14, Math.PI / 6.5, 0.5, 1.5);
flashlight.position.set(0.18, -0.12, 0.05);
flashlight.target.position.set(0, -0.05, -1);
camera.add(flashlight, flashlight.target);

const level = buildLevel(scene);
const sfx = new Sfx();

// Polvo flotando en el aire
const dust = (() => {
  const n = 1800;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = Math.random() * level.size.x;
    pos[i * 3 + 1] = Math.random() * level.size.y;
    pos[i * 3 + 2] = Math.random() * level.size.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfb6a0, size: 0.015, transparent: true, opacity: 0.6 }));
  scene.add(pts);
  return pts;
})();

// --- Estado ---
type Mode = 'menu' | 'play' | 'paused' | 'panel' | 'scare' | 'end';
let mode: Mode = 'menu';
let session: api.Session | null = null;
let score = 0;
const player = level.spawn.clone();
let yaw = level.spawnYaw;
let pitch = 0;
let bob = 0;
let stepAcc = 0;
const keys: Record<string, boolean> = {};
let focused: { station?: Station; door?: Door } | null = null;
let currentRoom = -1;
let trapArmed = false; // la puerta 102 se cierra al entrar hasta resolver el teclado
let hasDecoder = false; // se obtiene al terminar la 101
let quizIdByStation: Map<Station, string> = new Map();

const ROOM_LABELS = ['101 · Teoría', '102 · Fuerza bruta', '103 · Inyección de comandos', '104 · CSRF'];

// --- Estado de las pantallas de las estaciones ---
function stationScreenLines(s: Station): { lines: string[]; color: string } {
  const tag = `${101 + s.room}`;
  if (s.result === 'ok') return { lines: [`> ${tag}`, '> ACCESO', '> CONCEDIDO'], color: '#5dff7a' };
  if (s.result === 'bad') return { lines: [`> ${tag}`, '> REINTENTAR'], color: '#ffd24a' };
  const label: Record<string, string> = {
    quiz: '> [E] RESPONDER', keypad: '> [E] TECLADO', logs: '> [E] VER LOGS',
    fix: '> [E] REPARAR', csrf: '> [E] REVISAR', audit: '> [E] AUDITAR',
  };
  return { lines: [`> TERM ${tag}`, '> PENDIENTE', label[s.kind] ?? '> [E]'], color: '#5dff7a' };
}

function renderStation(s: Station, blink = false) {
  if (!s.screen) return;
  if (s.kind === 'keypad') {
    drawKeypad(s.screen, s.done ? 'OK' : '----', s.done ? '#5dff7a' : '#8ff59b');
    return;
  }
  if (s.kind === 'audit') {
    drawScreen(s.screen, s.done ? ['> AUDITORÍA', '> COMPLETA'] : ['> AUDITORÍA', '> [E] REVISAR', '> CHECKLIST'], s.done ? '#5dff7a' : '#ffd24a', blink && !s.done);
    return;
  }
  const { lines, color } = stationScreenLines(s);
  drawScreen(s.screen, lines, color, blink && !s.done && s.result !== 'ok');
}
level.stations.forEach((s) => renderStation(s));

// --- HUD ---
let msgTimer = 0;
function showMsg(text: string, ms = 5000) {
  const el = $('msg');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer = window.setTimeout(() => el.classList.remove('show'), ms);
}

let toastTimer = 0;
function toast(text: string) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 3500);
}

const roomStations = (room: number) =>
  level.stations.filter((s) => s.room === room && s.kind !== 'note' && s.kind !== 'folder' && s.kind !== 'board');
const roomDone = (room: number) => roomStations(room).every((s) => s.done);
const auditStation = () => level.stations.find((s) => s.kind === 'audit')!;

function updateHud() {
  $('score').textContent = session ? `${score}  ·  mínimo para salir: ${session.minScore}` : String(score);
  $('savehint').classList.toggle('hidden', !session || roomsComplete() <= roomsSaved);
  const next = [0, 1, 2, 3].find((r) => !roomDone(r));
  if (next === undefined) {
    const audit = auditStation();
    $('objective').textContent = audit.done ? 'OBJETIVO: salir del hotel' : 'OBJETIVO: auditoría final junto a la SALIDA';
  } else {
    const st = roomStations(next);
    const done = st.filter((s) => s.done).length;
    $('objective').textContent = `OBJETIVO: habitación ${ROOM_LABELS[next]} (${done}/${st.length})`;
  }
}

// --- Pointer lock / pausa ---
function lock() {
  const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
  p?.catch?.(() => showPause());
}

function showPause() {
  if (mode === 'play' || mode === 'paused') {
    mode = 'paused';
    $('pause').classList.remove('hidden');
  }
}

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    if (mode === 'paused') mode = 'play';
    $('pause').classList.add('hidden');
  } else if (mode === 'play') {
    showPause();
  }
});
document.addEventListener('pointerlockerror', showPause);
$('resume').addEventListener('click', lock);

// --- Input ---
document.addEventListener('mousemove', (e) => {
  if (mode !== 'play' || document.pointerLockElement !== canvas) return;
  yaw -= e.movementX * MOUSE_SENS;
  pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * MOUSE_SENS));
});

// --- Modo DEV: tecla º/` para activarlo (o ?dev en la URL) ---
// Da el decodificador, destraba todas las puertas y permite saltar de habitación con 1-5.
let devMode = false;
const DEV_SPOTS: [number, number, number][] = [
  [7, 8.6, 0], // 101
  [19, 8.6, 0], // 102
  [31, 8.6, 0], // 103
  [43, 8.6, 0], // 104
  [45.5, 15, -Math.PI / 2], // pasillo de salida (auditoría)
];

function setDev(on: boolean) {
  devMode = on;
  $('dev').classList.toggle('hidden', !on);
  if (on) {
    hasDecoder = true;
    level.doors.forEach((d) => (d.unlocked = true));
    toast('MODO DEV activado: decodificador + puertas destrabadas');
  } else {
    toast('MODO DEV desactivado');
  }
}

function devTeleport(n: number) {
  const spot = DEV_SPOTS[n];
  if (!spot) return;
  player.set(spot[0], 0, spot[1]);
  yaw = spot[2];
  pitch = 0;
  // la trampa de la 102 no tiene sentido si saltás con el modo dev
  trapArmed = false;
  level.doors.forEach((d) => (d.unlocked = true));
  toast(n < 4 ? `DEV → habitación ${101 + n}` : 'DEV → salida');
}

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!$('disclaimer').classList.contains('hidden')) {
    if (e.code === 'Enter' || e.code === 'Space') acceptDisclaimer();
    return;
  }
  if (e.code === 'Backquote' && session && mode !== 'scare' && mode !== 'end') {
    setDev(!devMode);
    return;
  }
  if (mode === 'play') {
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyF') {
      flashlight.visible = !flashlight.visible;
      sfx.beep();
    }
    if (devMode && /^Digit[1-5]$/.test(e.code)) devTeleport(Number(e.code.slice(5)) - 1);
    if (e.code === 'KeyG') saveGame();
  } else if (mode === 'menu' && e.code === 'Enter' && !isComicOpen()) {
    startGame();
  } else if (mode === 'panel' && (e.code === 'KeyE' || e.code === 'Escape') && (activePanel === 'note' || activePanel === 'folder' || activePanel === 'board')) {
    leavePanel();
  }
});
document.addEventListener('keyup', (e) => (keys[e.code] = false));
window.addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = false)));

// --- Inicio ---
async function startGame() {
  if (session) return;
  sfx.start();
  const name = ($('name') as HTMLInputElement).value.trim() || 'Anónimo';
  try {
    session = await api.createSession(name);
  } catch {
    $('start-error').textContent = 'No se pudo conectar con el servidor.';
    return;
  }
  beginSession();
  showMsg('Despertaste en el Hotel Zero-Day. Entrá a la 101 y respondé las terminales para avanzar.', 6500);
}

function beginSession() {
  // Asignar un id de pregunta a cada terminal de quiz
  const quizStations = level.stations.filter((s) => s.kind === 'quiz');
  quizStations.forEach((s, i) => {
    const q = session!.quiz.questions[i];
    if (q) quizIdByStation.set(s, q.id);
  });
  buildCsrfPanel();
  $('start').classList.add('hidden');
  $('hud').classList.remove('hidden');
  updateHud();
  if (new URLSearchParams(location.search).has('dev')) setDev(true);
  mode = 'paused';
  lock();
}
$('enter').addEventListener('click', startGame);

// --- Partidas guardadas (se guardan al terminar cada habitación) ---
const SAVE_KEY = 'hzd-save';
const getSaveId = () => {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
};
const setSaveId = (id: string) => {
  try {
    localStorage.setItem(SAVE_KEY, id);
  } catch {
    /* sin almacenamiento local: la partida igual queda en el servidor */
  }
};
const clearSaveId = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nada */
  }
};
/** Habitaciones completas seguidas desde la 101. */
function roomsComplete() {
  let n = 0;
  while (n < ROOM_COUNT && roomDone(n)) n++;
  return n;
}
let roomsSaved = 0;
let saving = false;

async function saveGame() {
  if (!session || saving) return;
  if (roomsComplete() <= roomsSaved) {
    showMsg('Podés guardar la partida cada vez que terminás una habitación.');
    return;
  }
  saving = true;
  try {
    const r = await api.save(session.sessionId);
    setSaveId(r.saveId);
    roomsSaved = r.rooms;
    toast(`Partida guardada · ${r.rooms}/${ROOM_COUNT} habitaciones · ${r.score} pts`);
    sfx.beep();
  } catch {
    toast('No se pudo guardar la partida');
  } finally {
    saving = false;
    updateHud();
  }
}

async function continueGame() {
  if (session) return;
  const id = getSaveId();
  if (!id) return;
  sfx.start();
  try {
    const loaded = await api.loadGame(id);
    session = loaded;
    beginSession();
    applyProgress(loaded.progress);
    showMsg(`Bienvenido de vuelta, ${loaded.name}. Tu partida fue restaurada en el pasillo.`, 6000);
  } catch {
    clearSaveId();
    $('continue').classList.add('hidden');
    $('start-error').textContent = 'No se pudo recuperar la partida guardada.';
  }
}
$('continue').addEventListener('click', continueGame);

/** Reconstruye el estado del hotel a partir de lo que guardó el servidor. */
function applyProgress(p: api.Progress) {
  score = p.score;
  const quizStations = level.stations.filter((st) => st.kind === 'quiz');
  p.quiz.forEach((q, i) => {
    const st = quizStations[i];
    if (st && q.answered) {
      st.done = true;
      st.result = q.correct ? 'ok' : 'bad';
    }
  });
  const mark = (kind: Station['kind']) => {
    const st = level.stations.find((x) => x.kind === kind);
    if (st) {
      st.done = true;
      st.result = 'ok';
    }
  };
  if (p.tasks.keypad) mark('keypad');
  if (p.tasks.logs) mark('logs');
  if (p.tasks.fix.solved) mark('fix');
  if (p.tasks.csrf) mark('csrf');
  if (p.tasks.audit) mark('audit');
  fixStepStart = p.tasks.fix.step;
  hasDecoder = roomDone(0);
  for (let r = 0; r < ROOM_COUNT; r++) {
    if (!roomDone(r)) continue;
    const door = level.doors.find((d) => d.room === r + 1);
    if (door) door.unlocked = true;
  }
  roomsSaved = roomsComplete();
  level.stations.forEach((st) => renderStation(st));
  tryUnlockExit(true);
  updateHud();
}

// En la pantalla de inicio, ofrecer continuar si hay una partida guardada en este navegador.
(async () => {
  const id = getSaveId();
  if (!id) return;
  try {
    const info = await api.saveInfo(id);
    const b = $('continue');
    b.textContent = `CONTINUAR PARTIDA · ${info.name} · ${info.rooms}/${ROOM_COUNT} habitaciones · ${info.score} pts`;
    b.classList.remove('hidden');
  } catch {
    clearSaveId();
  }
})();

// Aviso de ficción → intro en cómic → pantalla de inicio. La intro se puede volver a ver.
const focusName = () => ($('name') as HTMLInputElement).focus();
function acceptDisclaimer() {
  $('disclaimer').classList.add('hidden');
  startComic(focusName);
}
$('disclaimer-ok').addEventListener('click', acceptDisclaimer);
$('replay-intro').addEventListener('click', () => startComic(focusName));

// --- Interacción ---
const ray = new THREE.Raycaster();
ray.far = REACH;
const rayTargets = [...level.interactables, ...level.occluders];
const screenCenter = new THREE.Vector2();

function updateFocus() {
  ray.setFromCamera(screenCenter, camera);
  const hit = ray.intersectObjects(rayTargets, true)[0];
  const ud = hit?.object.userData ?? {};
  focused = ud.station ? { station: ud.station } : ud.door ? { door: ud.door } : null;

  let prompt = '';
  if (focused?.station) {
    const s = focused.station;
    if (s.kind === 'note') prompt = '[E] Leer';
    else if (s.kind === 'folder') prompt = '[E] Abrir carpeta de la cátedra';
    else if (s.kind === 'board') prompt = '[E] Mirar los recortes';
    else if (s.done) prompt = 'Resuelto';
    else prompt = `[E] ${{ quiz: 'Responder', keypad: 'Usar teclado', logs: 'Ver logs', fix: 'Reparar código', csrf: 'Revisar peticiones', audit: 'Auditar' }[s.kind]}`;
  } else if (focused?.door && !focused.door.open) {
    const d = focused.door;
    if (d.room === EXIT) prompt = d.unlocked ? '[E] Escapar' : 'SALIDA (trabada)';
    else if (d.room === 1 && trapArmed) prompt = 'La cerradura pide un PIN';
    else prompt = d.unlocked ? `[E] Abrir ${d.label}` : `${d.label} (cerrada)`;
  }
  $('prompt').textContent = prompt;
}

function interact() {
  if (focused?.station) {
    openStation(focused.station);
    return;
  }
  const d = focused?.door;
  if (!d || d.open) return;
  if (d.room === 1 && trapArmed) {
    sfx.locked();
    showMsg('La puerta se trabó al entrar. Resolvé la cerradura (el teclado en la pared) para salir.');
    const kp = level.stations.find((s) => s.kind === 'keypad');
    if (kp) openStation(kp);
    return;
  }
  if (!d.unlocked) {
    sfx.locked();
    showMsg(d.room === EXIT ? `La salida no cede: falta la auditoría final, y hace falta al menos ${session?.minScore ?? 1020} puntos (60%).` : `Cerrada. Resolvé antes la habitación ${100 + d.room}.`);
    return;
  }
  d.open = true;
  d.collider.active = false;
  sfx.creak();
  if (d.room === EXIT) finishGame();
}

function openStation(s: Station) {
  if (s.kind === 'note') return openNote(s);
  if (s.kind === 'folder') return openFolder(s);
  if (s.kind === 'board') return openBoard(s);
  if (s.done) {
    showMsg('Esa estación ya está resuelta.');
    return;
  }
  if (s.kind === 'quiz') return openQuiz(s);
  if (s.kind === 'keypad') return openKeypad(s);
  if (s.kind === 'logs') return openLogs(s);
  if (s.kind === 'fix') return openFix(s);
  if (s.kind === 'csrf') return openCsrf(s);
  if (s.kind === 'audit') return openAudit(s);
}

// --- Gestión de paneles ---
type Panel = 'note' | 'folder' | 'board' | 'question' | 'keypad' | 'logs' | 'fix' | 'csrf' | 'audit' | 'decoder';
let activePanel: Panel | null = null;
let panelStation: Station | null = null;

function enterPanel(id: Panel, s: Station | null) {
  activePanel = id;
  panelStation = s;
  mode = 'panel';
  document.exitPointerLock();
  $(id === 'question' ? 'question' : id).classList.remove('hidden');
  sfx.beep();
}

function leavePanel() {
  if (activePanel) $(activePanel === 'question' ? 'question' : activePanel).classList.add('hidden');
  activePanel = null;
  panelStation = null;
  mode = 'paused';
  lock();
}

function markSolved(s: Station) {
  s.done = true;
  s.result = 'ok';
  renderStation(s);
  updateHud();
  checkRoomProgress(s.room);
}

function checkRoomProgress(room: number) {
  if (!roomDone(room)) return;
  if (roomsComplete() > roomsSaved) setTimeout(() => toast('Habitación completada · [G] para guardar la partida'), 3800);
  updateHud();
  if (room === 0 && !hasDecoder) {
    hasDecoder = true;
    toast('Obtuviste el DECODIFICADOR ⚙');
    showMsg('Encontraste un DECODIFICADOR. Frente a una cerradura vas a poder usarlo para romper el PIN por fuerza bruta en vez de adivinarlo.', 6500);
  }
  if (room < ROOM_COUNT - 1) {
    const door = level.doors.find((d) => d.room === room + 1);
    if (door && !door.unlocked) {
      door.unlocked = true;
      toast(`Puerta ${102 + room} destrabada`);
      sfx.unlock();
    }
  } else {
    // última habitación lista: habilitar la auditoría final
    toast('Pasillo de salida habilitado. Buscá el panel de auditoría.');
    sfx.unlock();
    tryUnlockExit();
  }
}

function tryUnlockExit(silent = false) {
  if (!(roomDone(ROOM_COUNT - 1) && auditStation().done)) return;
  const exit = level.doors.find((d) => d.room === EXIT)!;
  if (session && score < session.minScore) {
    // Todo resuelto pero sin el 60%: ya no hay forma de sumar puntos, se pierde.
    setTimeout(lowScoreGameOver, silent ? 600 : 3800);
    return;
  }
  if (!exit.unlocked) {
    exit.unlocked = true;
    if (!silent) {
      toast('SALIDA destrabada');
      sfx.unlock();
    }
  }
}

function lowScoreGameOver() {
  if (mode === 'end' || !session) return;
  clearSaveId(); // la partida guardada ya no tiene salida posible
  mode = 'end';
  document.exitPointerLock();
  ['question', 'keypad', 'logs', 'fix', 'csrf', 'audit', 'note', 'folder', 'board', 'decoder'].forEach((id) => $(id)?.classList.add('hidden'));
  $('hud').classList.add('hidden');
  $('go-title').innerHTML = 'PUNTAJE<br />INSUFICIENTE';
  $('go-reason').textContent =
    `Para salir del hotel hace falta al menos ${session.minScore} puntos (60% de ${session.maxScore}). ` +
    `Hiciste ${score}. Vertrix no deja salir a quien todavía no sabe defenderse.`;
  $('gameover').classList.remove('hidden');
}

// ---------- Nota ----------
function openNote(s: Station) {
  const note = NOTES[s.noteId ?? ''];
  if (!note) return;
  $('note-body').innerHTML = note.html;
  $('note').querySelector('.paper')!.classList.toggle('poster', Boolean(note.poster));
  enterPanel('note', s);
}
function closeNote() {
  leavePanel();
}
$('note-close').addEventListener('click', closeNote);

// ---------- Carpeta de la cátedra: teoría (101) ----------
// Cada carpeta tiene el apunte completo: el jugador busca el tema que necesita.
function openFolder(s: Station) {
  const body = $('folder-body');
  body.innerHTML = `<div class="q">Apunte completo de la cátedra. Buscá el tema que necesitás para responder.</div>${FULL_THEORY}`;
  enterPanel('folder', s);
  ($('folder').querySelector('.dossier') as HTMLElement).scrollTop = 0;
}
$('folder-close').addEventListener('click', leavePanel);

// ---------- Pizarra de corcho con recortes de noticias ----------
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function openBoard(s: Station) {
  const board = level.boards[s.link ?? 0];
  const clips = board?.clips ?? [];
  $('board-title').textContent = board?.title ?? '';
  $('board-title').classList.toggle('hidden', !board?.title);
  $('board-list').innerHTML = clips
    .map(
      (c) =>
        `<div class="clip${c.wanted ? ' wanted' : ''}">` +
        `<div class="meta">${esc(c.outlet)} · ${esc(c.date)}</div>` +
        `<div class="hl">${esc(c.headline)}</div>` +
        `<div class="sm">${esc(c.summary)}</div>` +
        (c.url ? `<div class="src">${esc(c.url)}</div>` : '') +
        `</div>`,
    )
    .join('');
  enterPanel('board', s);
  ($('board').querySelector('.cork') as HTMLElement).scrollTop = 0;
}
$('board-close').addEventListener('click', leavePanel);

// ---------- Quiz (101) ----------
let answering = false;
function openQuiz(s: Station) {
  const qid = quizIdByStation.get(s);
  const q = session!.quiz.questions.find((x) => x.id === qid);
  if (!q) return;
  $('q-header').textContent = `> TERMINAL 101 · ${session!.quiz.topic.toUpperCase()}`;
  $('q-text').textContent = q.text;
  const opts = $('q-options');
  opts.replaceChildren(
    ...q.options.map((text, i) => {
      const b = document.createElement('button');
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = `[${i + 1}]`;
      b.append(key, document.createTextNode(' ' + text));
      b.addEventListener('click', () => answerQuiz(s, q.id, i, b));
      return b;
    }),
  );
  $('q-result').classList.add('hidden');
  enterPanel('question', s);
}

async function answerQuiz(s: Station, qid: string, i: number, _btn: HTMLButtonElement) {
  if (answering) return;
  answering = true;
  const buttons = [...$('q-options').querySelectorAll('button')] as HTMLButtonElement[];
  buttons.forEach((b) => (b.disabled = true));
  const verdict = $('q-verdict');
  try {
    const res = await api.answer(session!.sessionId, qid, i);
    buttons[res.correctIndex]?.classList.add('right');
    if (!res.correct) buttons[i]?.classList.add('wrong');
    verdict.textContent = res.correct ? `✔ CORRECTO  +${session!.pointsPerQuestion}` : '✖ INCORRECTO';
    verdict.className = res.correct ? 'ok' : 'bad';
    $('q-explanation').textContent = res.explanation;
    score = res.score;
    res.correct ? sfx.correct() : sfx.wrong();
    s.done = true;
    s.result = res.correct ? 'ok' : 'bad';
    renderStation(s);
    updateHud();
    checkRoomProgress(s.room);
  } catch (err) {
    verdict.textContent = `ERROR: ${(err as Error).message}`;
    verdict.className = 'bad';
  } finally {
    answering = false;
  }
  $('q-result').classList.remove('hidden');
  ($('q-continue') as HTMLButtonElement).focus();
}
$('q-continue').addEventListener('click', leavePanel);

// Quiz keyboard shortcuts (1-4, Enter)
document.addEventListener('keydown', (e) => {
  if (mode !== 'panel' || activePanel !== 'question') return;
  if (!$('q-result').classList.contains('hidden')) {
    if (e.code === 'Enter') leavePanel();
    return;
  }
  const n = Number(e.key);
  const buttons = [...$('q-options').querySelectorAll('button')] as HTMLButtonElement[];
  if (n >= 1 && n <= buttons.length) buttons[n - 1].click();
});

// ---------- Teclado / fuerza bruta (102) ----------
let kpEntry = '';
let kpLockTimer = 0;
function openKeypad(s: Station) {
  kpEntry = '';
  $('kp-display').textContent = '----';
  $('kp-msg').textContent = 'Ingresá el código de 4 dígitos.';
  $('kp-lock').classList.add('hidden');
  const pad = $('kp-pad');
  pad.replaceChildren(
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => {
      const b = document.createElement('button');
      b.textContent = k;
      b.addEventListener('click', () => kpPress(k));
      return b;
    }),
  );
  $('kp-decoder').classList.toggle('hidden', !hasDecoder);
  enterPanel('keypad', s);
}

function kpPress(k: string) {
  if (kpLockTimer > Date.now()) return;
  sfx.beep();
  if (k === 'C') kpEntry = '';
  else if (k === 'OK') return kpSubmit();
  else if (kpEntry.length < 4) kpEntry += k;
  $('kp-display').textContent = (kpEntry + '----').slice(0, 4);
  if (kpEntry.length === 4) kpSubmit();
}

async function kpSubmit() {
  if (kpEntry.length !== 4 || !panelStation) return;
  const code = kpEntry;
  kpEntry = '';
  try {
    const res = await api.task(session!.sessionId, 'keypad', code);
    score = res.score;
    updateHud();
    if (res.ok) {
      $('kp-msg').textContent = `✔ Cerradura abierta  +${res.points}`;
      sfx.unlock();
      markSolved(panelStation);
      trapArmed = false;
      const door1 = level.doors.find((d) => d.room === 1)!;
      door1.unlocked = true;
      setTimeout(leavePanel, 1200);
    } else if ((res.fails ?? 0) >= 3) {
      triggerRobot('keypad'); // 3 errores a mano → despierta el robot
    } else if (res.locked) {
      startKpLock(res.retryAfter ?? 2);
    } else {
      sfx.wrong();
      $('kp-display').textContent = '----';
      $('kp-msg').textContent = '✖ Código incorrecto.';
    }
  } catch (err) {
    $('kp-msg').textContent = `ERROR: ${(err as Error).message}`;
  }
}

function startKpLock(seconds: number) {
  sfx.locked();
  const lock = $('kp-lock');
  lock.classList.remove('hidden');
  let left = seconds;
  const tick = () => {
    kpLockTimer = Date.now() + left * 1000;
    $('kp-msg').textContent = 'Demasiados intentos (backoff exponencial).';
    lock.textContent = `BLOQUEADO ${left}s`;
    if (left <= 0) {
      lock.classList.add('hidden');
      $('kp-msg').textContent = 'Probá de nuevo.';
      return;
    }
    left--;
    setTimeout(tick, 1000);
  };
  tick();
}

// ---------- Decodificador: editor de código (102) ----------
// El editor arranca VACÍO: el código lo escribe el jugador.
let decoderCode = '';
let decoderWorker: Worker | null = null;
const decCode = () => document.getElementById('dec-code') as HTMLTextAreaElement;

// --- Integridad: detectar pegado y captura de pantalla mientras el editor está abierto ---
let integrityFlags = 0;
const flagReasons = new Map<string, number>();
let antiCheatArmed = false;

function raiseFlag(reason: string) {
  integrityFlags++;
  flagReasons.set(reason, (flagReasons.get(reason) ?? 0) + 1);
  if (session) api.flag(session.sessionId, reason);
  sfx.wrong();
  const warn = $('dec-warn');
  warn.classList.remove('hidden');
  const lines = [...flagReasons.entries()].map(([r, n]) => `• ${r}${n > 1 ? ` ×${n}` : ''}`);
  warn.innerHTML = `⚠ INTEGRIDAD: se registraron ${integrityFlags} evento(s). Quedan en tu sesión.<br>${lines.join('<br>')}`;
}

const onPaste = (e: Event) => { e.preventDefault(); triggerRobot('paste'); };
const onDrop = (e: Event) => { e.preventDefault(); triggerRobot('paste'); };
const onContext = (e: Event) => { e.preventDefault(); raiseFlag('Menú contextual'); };
const onCopyCut = (e: Event) => { e.preventDefault(); raiseFlag('Copiar/cortar el código'); };
const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'PrintScreen') {
    raiseFlag('Tecla PrintScreen');
    navigator.clipboard?.writeText?.('').catch(() => {});
  }
};
const onKeyDown = (e: KeyboardEvent) => {
  // Win+Shift+S (recorte de Windows) y Cmd+Shift+ (capturas de macOS)
  if (e.shiftKey && (e.metaKey || e.ctrlKey) && ['S', 's', '3', '4', '5'].includes(e.key)) {
    raiseFlag('Atajo de captura de pantalla');
  }
};
const onVisibility = () => { if (document.hidden && antiCheatArmed) raiseFlag('Saliste de la pestaña'); };
const onBlur = () => { if (antiCheatArmed) raiseFlag('La ventana perdió el foco'); };

function armAntiCheat() {
  if (antiCheatArmed) return;
  antiCheatArmed = true;
  const ta = decCode();
  ta.addEventListener('paste', onPaste);
  ta.addEventListener('drop', onDrop);
  ta.addEventListener('contextmenu', onContext);
  ta.addEventListener('copy', onCopyCut);
  ta.addEventListener('cut', onCopyCut);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
}

function disarmAntiCheat() {
  if (!antiCheatArmed) return;
  antiCheatArmed = false;
  const ta = decCode();
  ta.removeEventListener('paste', onPaste);
  ta.removeEventListener('drop', onDrop);
  ta.removeEventListener('contextmenu', onContext);
  ta.removeEventListener('copy', onCopyCut);
  ta.removeEventListener('cut', onCopyCut);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('blur', onBlur);
}

$('kp-decoder').addEventListener('click', openDecoder);

function openDecoder() {
  if (!hasDecoder) return;
  $('keypad').classList.add('hidden');
  decCode().value = decoderCode;
  $('dec-msg').textContent = '';
  $('dec-msg').className = 't-sub';
  activePanel = 'decoder';
  $('decoder').classList.remove('hidden');
  armAntiCheat();
  sfx.beep();
}

function closeDecoder() {
  decoderWorker?.terminate();
  decoderWorker = null;
  decoderCode = decCode().value;
  disarmAntiCheat();
  $('decoder').classList.add('hidden');
  activePanel = 'keypad';
  $('keypad').classList.remove('hidden');
}
$('dec-close').addEventListener('click', closeDecoder);
$('dec-clear').addEventListener('click', () => {
  decCode().value = '';
  decoderCode = '';
  decCode().focus();
});

function runDecoder() {
  const code = decCode().value;
  decoderCode = code;
  const msg = $('dec-msg');
  if (!code.trim()) {
    msg.className = 't-sub bad';
    msg.textContent = '✖ El editor está vacío: escribí el código del bucle.';
    return;
  }
  msg.className = 't-sub';
  msg.textContent = '⏳ Ejecutando sobre la copia offline (10000 códigos)...';
  decoderWorker?.terminate();
  decoderWorker = new Worker(new URL('./decoder.worker.ts', import.meta.url), { type: 'module' });

  const timeout = window.setTimeout(() => {
    decoderWorker?.terminate();
    decoderWorker = null;
    msg.className = 't-sub bad';
    msg.textContent = '✖ Se cortó la ejecución (¿bucle infinito?). Revisá que el for llegue a 9999 y uses return.';
  }, 3000);

  decoderWorker.onmessage = (e: MessageEvent<{ found?: string | null; ok?: boolean; calls?: number; error?: string }>) => {
    clearTimeout(timeout);
    decoderWorker?.terminate();
    decoderWorker = null;
    const d = e.data;
    if (d.error) {
      msg.className = 't-sub bad';
      msg.textContent = `✖ Error: ${d.error}`;
    } else if (d.ok && d.found) {
      msg.className = 't-sub ok';
      msg.textContent = `✔ ¡Código hallado tras ${d.calls} intentos: ${d.found}!\nAhora cerrá el decodificador y tipeá ${d.found} en el teclado.`;
      sfx.correct();
    } else {
      msg.className = 't-sub bad';
      msg.textContent = `✖ Tu código terminó sin encontrar el PIN (devolvió ${d.found ?? 'null'}). ¿Probaste los 10000 y devolviste el acertado?`;
      sfx.wrong();
    }
  };
  decoderWorker.postMessage({ code, hash: session!.tasks.keypad.hash });
}
$('dec-run').addEventListener('click', runDecoder);

// ---------- Logs (103) ----------
let logsSel = new Set<number>();
function openLogs(s: Station) {
  logsSel = new Set();
  $('logs-msg').textContent = '';
  const list = $('logs-list');
  list.replaceChildren(
    ...session!.tasks.logs.lines.map((line, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      const cb = document.createElement('span');
      cb.className = 'cb';
      const code = document.createElement('code');
      code.textContent = line;
      row.append(cb, code);
      row.addEventListener('click', () => {
        if (row.classList.contains('good') || row.classList.contains('bad')) return;
        if (logsSel.has(i)) logsSel.delete(i);
        else logsSel.add(i);
        row.classList.toggle('on');
        cb.textContent = logsSel.has(i) ? '✓' : '';
      });
      return row;
    }),
  );
  enterPanel('logs', s);
}

async function logsSubmit() {
  if (!panelStation) return;
  try {
    const res = await api.task(session!.sessionId, 'logs', [...logsSel]);
    score = res.score;
    updateHud();
    if (res.ok) {
      const rows = [...$('logs-list').children] as HTMLElement[];
      res.expected?.forEach((i) => rows[i].classList.add('good'));
      $('logs-msg').textContent = `✔ +${res.points}. ${res.explanation ?? ''}`;
      sfx.correct();
      markSolved(panelStation);
      setTimeout(leavePanel, 2600);
    } else {
      $('logs-msg').textContent = `✖ ${res.hint ?? 'Revisá de nuevo.'}`;
      sfx.wrong();
    }
  } catch (err) {
    $('logs-msg').textContent = `ERROR: ${(err as Error).message}`;
  }
}
$('logs-submit').addEventListener('click', logsSubmit);
$('logs-close').addEventListener('click', leavePanel);

// ---------- Reparar código (103) ----------
let fixStepStart = 0; // paso de la reparación donde quedó el jugador (para partidas guardadas)
function openFix(s: Station) {
  renderFixStep(fixStepStart);
  $('fix-result').classList.add('hidden');
  enterPanel('fix', s);
}

function renderFixStep(stepIndex: number) {
  const step = session!.tasks.fix.steps[stepIndex];
  if (!step) return;
  $('fix-step').textContent = `${stepIndex + 1}/${session!.tasks.fix.steps.length}`;
  $('fix-title').textContent = step.title;
  $('fix-code').textContent = step.code;
  const opts = $('fix-options');
  opts.replaceChildren(
    ...step.options.map((text, i) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.addEventListener('click', () => answerFix(i, b));
      return b;
    }),
  );
  $('fix-result').classList.add('hidden');
}

async function answerFix(i: number, _btn: HTMLButtonElement) {
  if (!panelStation) return;
  const buttons = [...$('fix-options').querySelectorAll('button')] as HTMLButtonElement[];
  buttons.forEach((b) => (b.disabled = true));
  try {
    const res = await api.task(session!.sessionId, 'fix', i);
    score = res.score;
    updateHud();
    const verdict = $('fix-verdict');
    verdict.textContent = res.ok ? (res.points ? `✔ Correcto  +${res.points}` : '✔ Correcto') : '✖ Inseguro';
    verdict.className = res.ok ? 'ok' : 'bad';
    $('fix-expl').textContent = res.explanation ?? '';
    res.ok ? sfx.correct() : sfx.wrong();
    $('fix-result').classList.remove('hidden');
    const next = $('fix-next');
    if (res.done) {
      next.textContent = 'TERMINAR';
      next.onclick = () => {
        markSolved(panelStation!);
        leavePanel();
      };
    } else if (res.ok) {
      next.textContent = 'SIGUIENTE PASO';
      fixStepStart = res.step ?? 0;
      next.onclick = () => renderFixStep(res.step ?? 0);
    } else {
      next.textContent = 'REINTENTAR';
      next.onclick = () => renderFixStep(res.step ?? 0);
    }
  } catch (err) {
    $('fix-verdict').textContent = `ERROR: ${(err as Error).message}`;
    $('fix-result').classList.remove('hidden');
  }
}

// ---------- CSRF (104) ----------
const csrfDecisions: (boolean | null)[] = [];
function buildCsrfPanel() {
  const info = session!.tasks.csrf;
  $('csrf-info').innerHTML = `El formulario legítimo usa <code>POST</code>, origen <code>${info.origin}</code> y token <code>${info.token}</code>. Decidí cada petición.`;
}
function openCsrf(s: Station) {
  const info = session!.tasks.csrf;
  csrfDecisions.length = 0;
  $('csrf-msg').textContent = '';
  const list = $('csrf-list');
  list.replaceChildren(
    ...info.requests.map((r, i) => {
      csrfDecisions.push(null);
      const row = document.createElement('div');
      row.className = 'req';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<strong>${r.method}</strong> /cambiar-clave · origin <code>${r.origin}</code> · token <code>${r.csrf}</code> · <code>${r.body}</code>`;
      const btns = document.createElement('div');
      btns.className = 'buttons';
      const acc = document.createElement('button');
      acc.textContent = 'Aceptar';
      const rej = document.createElement('button');
      rej.textContent = 'Rechazar';
      acc.addEventListener('click', () => { csrfDecisions[i] = true; acc.classList.add('sel'); rej.classList.remove('sel'); });
      rej.addEventListener('click', () => { csrfDecisions[i] = false; rej.classList.add('sel'); acc.classList.remove('sel'); });
      btns.append(acc, rej);
      row.append(meta, btns);
      return row;
    }),
  );
  enterPanel('csrf', s);
}

async function csrfSubmit() {
  if (!panelStation) return;
  if (csrfDecisions.includes(null)) {
    $('csrf-msg').textContent = 'Decidí todas las peticiones antes de procesar.';
    return;
  }
  try {
    const res = await api.task(session!.sessionId, 'csrf', csrfDecisions);
    score = res.score;
    updateHud();
    const rows = [...$('csrf-list').children] as HTMLElement[];
    (res.results as { correct: boolean; why: string }[])?.forEach((r, i) => {
      rows[i].classList.add(r.correct ? 'good' : 'bad');
      const why = document.createElement('div');
      why.className = 'why';
      why.textContent = (r.correct ? '✔ ' : '✖ ') + r.why;
      rows[i].appendChild(why);
    });
    if (res.ok) {
      $('csrf-msg').textContent = `✔ Servidor protegido  +${res.points}`;
      sfx.correct();
      markSolved(panelStation);
      setTimeout(leavePanel, 3200);
    } else {
      $('csrf-msg').textContent = '✖ Dejaste pasar o bloqueaste mal alguna. Revisá las marcadas en rojo y reintentá.';
      sfx.wrong();
      setTimeout(() => openCsrf(panelStation!), 3200);
    }
  } catch (err) {
    $('csrf-msg').textContent = `ERROR: ${(err as Error).message}`;
  }
}
$('csrf-submit').addEventListener('click', csrfSubmit);
$('csrf-close').addEventListener('click', leavePanel);

// ---------- Auditoría (salida) ----------
const auditSel = new Set<number>();
function openAudit(s: Station) {
  auditSel.clear();
  $('audit-msg').textContent = '';
  $('audit-config').textContent = session!.tasks.audit.config.join('\n');
  const list = $('audit-list');
  list.replaceChildren(
    ...session!.tasks.audit.items.map((item, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      const cb = document.createElement('span');
      cb.className = 'cb';
      const code = document.createElement('span');
      code.textContent = item;
      row.append(cb, code);
      row.addEventListener('click', () => {
        if (row.classList.contains('good') || row.classList.contains('bad')) return;
        if (auditSel.has(i)) auditSel.delete(i);
        else auditSel.add(i);
        row.classList.toggle('on');
        cb.textContent = auditSel.has(i) ? '✓' : '';
      });
      return row;
    }),
  );
  enterPanel('audit', s);
}

async function auditSubmit() {
  if (!panelStation) return;
  const marks = session!.tasks.audit.items.map((_, i) => auditSel.has(i));
  try {
    const res = await api.task(session!.sessionId, 'audit', marks);
    score = res.score;
    updateHud();
    const rows = [...$('audit-list').children] as HTMLElement[];
    (res.results as boolean[])?.forEach((correct, i) => rows[i].classList.add(correct ? 'good' : 'bad'));
    if (res.ok) {
      $('audit-msg').textContent = `✔ +${res.points}. ${res.explanation ?? ''}`;
      sfx.correct();
      markSolved(panelStation);
      tryUnlockExit();
      setTimeout(leavePanel, 3600);
    } else {
      $('audit-msg').textContent = '✖ Alguna marca está mal (en rojo). Acordate: marcá SÓLO lo que está bien implementado.';
      sfx.wrong();
      setTimeout(() => openAudit(panelStation!), 3200);
    }
  } catch (err) {
    $('audit-msg').textContent = `ERROR: ${(err as Error).message}`;
  }
}
$('audit-submit').addEventListener('click', auditSubmit);
$('audit-close').addEventListener('click', leavePanel);

// --- Final ---
async function finishGame() {
  mode = 'end';
  $('hud').classList.add('hidden');
  document.exitPointerLock();
  $('fade').classList.add('on');
  const [res] = await Promise.all([
    api.finish(session!.sessionId).catch(() => null),
    new Promise((r) => setTimeout(r, 2000)),
  ]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const stats = $('end-stats');
  const board = $('end-board');
  if (res) {
    clearSaveId();
    stats.textContent = `${res.name} · ${res.score}/${res.maxScore} puntos · ${fmt(res.seconds)}` +
      (res.rank ? ` · puesto #${res.rank}` : '') +
      (res.flags ? ` · ⚠ ${res.flags} alerta(s) de integridad` : '');
    board.replaceChildren(
      ...res.leaderboard.map((e, i) => {
        const li = document.createElement('li');
        if (i + 1 === res.rank) li.className = 'me';
        const pts = document.createElement('span');
        pts.className = 'pts';
        pts.textContent = `${e.score} · ${fmt(e.seconds)}${e.flags ? ' ⚠' : ''}`;
        li.append(e.name, pts);
        return li;
      }),
    );
  } else {
    stats.textContent = `Puntaje: ${score} (no se pudo guardar en el ranking)`;
  }
  $('end').classList.remove('hidden');
  $('fade').classList.remove('on');
}
$('again').addEventListener('click', () => location.reload());

// --- Robot guardián: secuencia de game over (102) ---
let robotTriggered = false;
let scareFromYaw = 0;
let scareToYaw = 0;
let scareFromPitch = 0;
let scareT = 0;
let scareRevealed = false;
let goReason = '';
const SCARE_TURN = 0.4; // giro brusco hacia atrás

function triggerRobot(reason: string) {
  if (robotTriggered) return;
  robotTriggered = true;
  goReason =
    reason === 'paste'
      ? 'Intentaste pegar código ajeno. Una unidad de Vertrix despertó: los humanos ya no pueden usar código que no escriben.'
      : 'Fallaste el código tres veces. Una unidad de Vertrix despertó y te encontró.';

  // cerrar cualquier panel / editor abierto
  disarmAntiCheat();
  decoderWorker?.terminate();
  decoderWorker = null;
  if (activePanel) $(activePanel).classList.add('hidden');
  activePanel = null;
  document.exitPointerLock();
  if (session) api.flag(session.sessionId, 'GAME OVER: ' + reason);

  // el robot malvado aparece justo donde el jugador va a quedar mirando al darse vuelta
  const nx = Math.sin(yaw);
  const nz = Math.cos(yaw);
  const rx = player.x + nx * 1.5;
  const rz = player.z + nz * 1.5;
  const ev = level.robotEvil;
  ev.group.position.set(rx, 0, rz);
  ev.group.rotation.y = Math.atan2(player.x - rx, player.z - rz); // mira al jugador
  ev.group.visible = true;
  level.robotBroken.group.visible = false; // "se levantó"

  scareFromYaw = yaw;
  scareToYaw = yaw + Math.PI;
  scareFromPitch = pitch;
  scareT = 0;
  scareRevealed = false;
  mode = 'scare';
  $('hud').classList.add('hidden');
  $('redflash').classList.add('on');
  sfx.siren();
}

function revealRobot() {
  sfx.stinger();
  const line = $('scareline');
  line.textContent = '«EL CÓDIGO YA NO TE PERTENECE»';
  line.classList.add('show');
  setTimeout(() => {
    $('redflash').classList.remove('on');
    $('scareline').classList.remove('show');
    mode = 'end';
    $('go-reason').textContent = goReason;
    $('gameover').classList.remove('hidden');
  }, 2800);
}
$('go-again').addEventListener('click', () => location.reload());

// --- Loop ---
let blinkT = 0;
let blink = false;

function updateBulbs(dt: number) {
  for (const b of level.bulbs) {
    b.timer -= dt;
    if (b.timer <= 0) {
      const r = Math.random();
      if (b.mode === 'steady') {
        b.level = 0.9 + r * 0.1;
        b.timer = 0.1 + Math.random() * 0.3;
      } else if (b.mode === 'flicker') {
        if (b.burst > 0) {
          b.burst--;
          b.level = r < 0.5 ? 0.08 : 1;
          b.timer = 0.03 + Math.random() * 0.08;
        } else {
          b.level = 1;
          b.timer = 0.8 + Math.random() * 2.5;
          if (Math.random() < 0.6) b.burst = 3 + Math.floor(Math.random() * 9);
        }
      } else {
        b.level = r < 0.35 ? 0.5 + Math.random() * 0.5 : 0.04;
        b.timer = 0.04 + Math.random() * (b.level > 0.3 ? 0.25 : 0.6);
      }
      const dist = b.light.position.distanceTo(camera.position);
      if (b.mode !== 'steady' && b.level < 0.3 && dist < 5 && Math.random() < 0.3) sfx.buzz();
    }
    b.light.intensity = b.base * b.level;
    (b.bulb.material as THREE.MeshBasicMaterial).color.setRGB(b.level, 0.85 * b.level, 0.62 * b.level);
  }
}

function checkRoomTransition() {
  let inRoom = -1;
  for (let i = 0; i < level.roomBounds.length; i++) {
    const b = level.roomBounds[i];
    if (player.x > b.minX && player.x < b.maxX && player.z > b.minZ && player.z < b.maxZ) {
      inRoom = i;
      break;
    }
  }
  if (inRoom === currentRoom) return;
  currentRoom = inRoom;
  // Trampa de la 102: al entrar, la puerta se cierra hasta resolver el teclado
  if (inRoom === 1 && !roomDone(1) && !devMode) {
    const door1 = level.doors.find((d) => d.room === 1)!;
    if (door1.open || door1.amount > 0.1) {
      door1.open = false;
      door1.collider.active = true;
      door1.unlocked = false;
      trapArmed = true;
      sfx.creak();
      showMsg('¡La puerta se cerró de golpe! Deducí el PIN de las pistas del cuarto y abrí el teclado de la pared.', 6000);
    }
  }
}

function update(dt: number, time: number) {
  if (mode === 'play') {
    const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    let mx = -Math.sin(yaw) * fwd + Math.cos(yaw) * side;
    let mz = -Math.cos(yaw) * fwd - Math.sin(yaw) * side;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      const speed = keys.ShiftLeft || keys.ShiftRight ? RUN : WALK;
      mx = (mx / len) * speed * dt;
      mz = (mz / len) * speed * dt;
      moveWithCollisions(player, mx, mz, RADIUS, level.colliders);
      bob += dt * (speed === RUN ? 12 : 8.5);
      stepAcc += speed * dt;
      if (stepAcc > (speed === RUN ? 1.1 : 0.75)) {
        stepAcc = 0;
        sfx.step();
      }
    }
    checkRoomTransition();
    updateFocus();
  }

  if (mode === 'scare') {
    scareT += dt;
    const k = Math.min(1, scareT / SCARE_TURN);
    const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
    yaw = scareFromYaw + (scareToYaw - scareFromYaw) * e;
    pitch = scareFromPitch + (0.18 - scareFromPitch) * e; // levanta la vista hacia la cara del robot
    const ev = level.robotEvil;
    if (ev.eyeLight) ev.eyeLight.intensity = 2.6 + Math.sin(time * 11) * 1.4; // ojos palpitando
    if (k >= 1 && !scareRevealed) {
      scareRevealed = true;
      revealRobot();
    }
  }

  camera.position.set(player.x, EYE + Math.sin(bob) * 0.035, player.z);
  camera.rotation.set(pitch, yaw, mode === 'scare' ? 0 : Math.sin(bob * 0.5) * 0.004);

  flashlight.intensity = 14 * (0.96 + Math.sin(time * 13) * 0.02 + Math.random() * 0.02);

  for (const d of level.doors) {
    d.amount += ((d.open ? 1 : 0) - d.amount) * Math.min(1, dt * 1.8);
    d.pivot.rotation.y = d.amount * Math.PI * 0.46;
  }

  updateBulbs(dt);
  dust.position.y = Math.sin(time * 0.15) * 0.15;

  blinkT += dt;
  if (blinkT > 0.5) {
    blinkT = 0;
    blink = !blink;
    level.stations.filter((s) => !s.done && s.kind !== 'note').forEach((s) => renderStation(s, blink));
  }
}

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt, clock.elapsedTime);
  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});





