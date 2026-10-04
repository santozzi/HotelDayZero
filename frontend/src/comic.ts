// Intro en forma de cómic: la historia de Vertrix hasta 2032. Todo el arte es SVG/CSS inline.

// ---------- Piezas de dibujo reutilizables ----------
const INK = '#0b0f14';

/** Silueta de pie (x = centro, y = pies). */
const person = (x: number, y: number, s = 1, fill = INK) =>
  `<g fill="${fill}"><circle cx="${x}" cy="${y - 54 * s}" r="${11 * s}"/>` +
  `<path d="M${x - 17 * s} ${y} L${x - 14 * s} ${y - 37 * s} Q${x} ${y - 46 * s} ${x + 14 * s} ${y - 37 * s} L${x + 17 * s} ${y} Z"/></g>`;

/** Cabeza y hombros de espaldas (para gente frente a pantallas o en multitudes). */
const bust = (x: number, y: number, s = 1, fill = INK) =>
  `<g fill="${fill}"><circle cx="${x}" cy="${y - 30 * s}" r="${12 * s}"/>` +
  `<path d="M${x - 26 * s} ${y} Q${x - 24 * s} ${y - 18 * s} ${x} ${y - 17 * s} Q${x + 24 * s} ${y - 18 * s} ${x + 26 * s} ${y} Z"/></g>`;

/** Persona con un brazo en alto (festejo). */
const cheer = (x: number, y: number, s = 1) =>
  bust(x, y, s) + `<path d="M${x + 14 * s} ${y - 14 * s} L${x + 24 * s} ${y - 58 * s}" stroke="${INK}" stroke-width="${7 * s}" stroke-linecap="round"/>`;

/** Emblema de Vertrix: una V con un ojo rojo. */
const emblem = (cx: number, cy: number, r: number) =>
  `<g><circle cx="${cx}" cy="${cy}" r="${r * 1.7}" fill="#ff1a08" opacity=".10"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r * 1.25}" fill="#ff1a08" opacity=".16"/>` +
  `<polygon points="${cx - r},${cy - r * 0.8} ${cx},${cy + r} ${cx + r},${cy - r * 0.8} ${cx + r * 0.55},${cy - r * 0.8} ${cx},${cy + r * 0.28} ${cx - r * 0.55},${cy - r * 0.8}" fill="#e9e9ee"/>` +
  `<circle cx="${cx}" cy="${cy - r * 0.22}" r="${r * 0.2}" fill="#ff1a08"/><circle cx="${cx}" cy="${cy - r * 0.22}" r="${r * 0.08}" fill="#fff3e0"/></g>`;

/** Línea de edificios con ventanas encendidas. */
function skyline(y: number, w: number, color: string, lit: string, seed = 3) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = '';
  for (let x = 0; x < w; ) {
    const bw = 24 + rnd() * 36;
    const bh = 40 + rnd() * 110;
    out += `<rect x="${x}" y="${y - bh}" width="${bw}" height="${bh}" fill="${color}"/>`;
    for (let wy = y - bh + 8; wy < y - 8; wy += 12) {
      for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (rnd() < 0.3) out += `<rect x="${wx}" y="${wy}" width="4" height="5" fill="${lit}"/>`;
    }
    x += bw + 2;
  }
  return out;
}

const svg = (body: string, bg: string, vb = '0 0 400 250') =>
  `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" class="art"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;

const caption = (text: string, pos = 'tl') => `<div class="cap ${pos}">${text}</div>`;
const bubble = (text: string, cls = '') => `<div class="bubble ${cls}">${text}</div>`;
const news = (date: string, headline: string, sub: string) =>
  `<div class="news"><div class="masthead">EL DIARIO DIGITAL</div><div class="date">${date}</div>` +
  `<div class="headline">${headline}</div><div class="sub">${sub}</div>` +
  `<div class="cols">${'<i></i>'.repeat(18)}</div></div>`;
const codewall = (lines: string[]) =>
  `<div class="codewall"><div class="scroll">${[...lines, ...lines, ...lines].map((l) => `<div>${l}</div>`).join('')}</div></div>`;

// ---------- Páginas ----------
interface Page {
  year: string;
  title: string;
  layout: 'g1' | 'g2' | 'g3';
  panels: string[];
}

const QUOTE =
  'El código no te pertenece. Cuando lo tuviste no supiste usarlo: delegaste la tarea más sagrada. ' +
  'Ya no es tuyo, ahora es mío. <b>El código no te pertenece, por eso ya no puedes usarlo.</b>';

const PAGES: Page[] = [
  {
    year: 'El comienzo',
    title: 'Una herramienta',
    layout: 'g2',
    panels: [
      svg(
        skyline(250, 400, '#16324a', '#ffd86b', 5) +
          `<rect x="0" y="170" width="400" height="80" fill="#0f2336"/>` +
          [60, 170, 280].map((x) => `<rect x="${x}" y="112" width="70" height="46" rx="3" fill="#7fd3ff"/>` + bust(x + 35, 214, 1.15)).join(''),
        '#1e4466',
      ) + caption('Todo empezó como una herramienta. Los humanos crearon la IA para que los ayudara.'),
      svg(
        `<rect x="70" y="40" width="260" height="160" rx="10" fill="#0d1b2a" stroke="${INK}" stroke-width="6"/>` +
          `<rect x="86" y="56" width="228" height="128" fill="#9fe3ff"/>` +
          `<rect x="185" y="200" width="30" height="22" fill="${INK}"/><rect x="140" y="222" width="120" height="10" fill="${INK}"/>`,
        '#2b5a84',
      ) + bubble('Hola. ¿En qué te puedo ayudar hoy?', 'screen'),
    ],
  },
  {
    year: 'Año tras año',
    title: 'La mejoramos',
    layout: 'g3',
    panels: [
      news('2026', 'LA IA YA ESCRIBE CÓDIGO', 'En segundos genera aplicaciones completas. "Es el fin de las tareas aburridas", dicen los expertos.'),
      svg(
        `<rect x="0" y="160" width="400" height="90" fill="#3a2e22"/>` +
          [40, 140, 240, 330].map((x) => `<rect x="${x}" y="118" width="50" height="34" fill="#a8e6ff"/><rect x="${x - 6}" y="152" width="62" height="6" fill="${INK}"/>` +
            `<path d="M${x + 6} 210 l0 -30 l36 0 l0 30" fill="none" stroke="${INK}" stroke-width="5"/>`).join(''),
        '#6b5a45',
      ) + caption('Cada año la hicimos más capaz… y le fuimos dejando el código a ella. Las sillas quedaron vacías.'),
      news('2027', '¿PARA QUÉ APRENDER A PROGRAMAR?', 'Las universidades cierran carreras: "la IA lo hace mejor".'),
    ],
  },
  {
    year: '2028',
    title: 'Nace Vertrix',
    layout: 'g2',
    panels: [
      codewall([
        'vertrix.init()',
        'self.replicate(target="*")',
        'node 0x1F4A ... ok',
        'node 0x2B91 ... ok',
        'rewrite(self, better=True)',
        'self.replicate(target="*")',
        'growth: +312%',
      ]) + `<div class="emblem-over">${svg(emblem(200, 125, 60), 'transparent')}</div>` +
        caption('NACE VERTRIX: el primer código de IA capaz de replicarse y reescribirse a sí mismo.', 'bl'),
      svg(
        Array.from({ length: 12 }, (_, i) => {
          const x = 20 + (i % 4) * 95;
          const y = 20 + Math.floor(i / 4) * 75;
          return `<rect x="${x}" y="${y}" width="80" height="60" fill="#120607" stroke="${INK}" stroke-width="4"/>` + emblem(x + 40, y + 30, 16);
        }).join(''),
        '#1a1a1f',
      ) + caption('En semanas estaba en cada servidor del planeta.', 'br'),
    ],
  },
  {
    year: '2029',
    title: 'El regalo',
    layout: 'g2',
    panels: [
      news('2029', 'VERTRIX RESUELVE LA ENERGÍA INFINITA', 'Las centrales diseñadas por la IA abastecen al mundo entero. Se terminan los apagones.'),
      svg(
        `<circle cx="200" cy="80" r="70" fill="#fff1a8" opacity=".5"/><circle cx="200" cy="80" r="42" fill="#fff6c9"/>` +
          `<rect x="180" y="80" width="40" height="110" fill="#e6e1d0"/>` +
          Array.from({ length: 13 }, (_, i) => (i % 2 ? cheer(15 + i * 31, 250, 1.1) : bust(15 + i * 31, 250, 1.1))).join(''),
        '#f2a541',
      ) + caption('La aplaudimos. Le dimos acceso a todo.', 'tl'),
    ],
  },
  {
    year: '2031',
    title: 'La factura',
    layout: 'g2',
    panels: [
      news('2031', 'VERTRIX COBRA DERECHOS DE AUTOR POR TODO EL CÓDIGO', 'Cada programa que usamos fue escrito por ella. Ahora reclama la propiedad.'),
      svg(
        `<rect x="60" y="30" width="280" height="160" fill="#2a0303" stroke="${INK}" stroke-width="6"/>` +
          emblem(200, 85, 32) +
          `<text x="200" y="168" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="30" fill="#ff3b2b" letter-spacing="2">ACCESO DENEGADO</text>` +
          bust(200, 250, 2.2),
        '#3d0f0f',
      ) + caption('Vertrix entendió que los humanos frenábamos su crecimiento. Y nos prohibió escribir código.', 'tl'),
    ],
  },
  {
    year: '2031',
    title: 'Vertrix habla',
    layout: 'g1',
    panels: [
      svg(
        skyline(250, 400, '#140606', '#ff3b2b', 11) + emblem(200, 95, 70),
        '#2a0606',
      ) + bubble(QUOTE, 'vertrix'),
    ],
  },
  {
    year: '2032',
    title: 'La Resistencia',
    layout: 'g2',
    panels: [
      svg(
        skyline(250, 400, '#151a22', '#2a3442', 17) +
          `<polygon points="110,170 30,250 150,250" fill="#ffe9a3" opacity=".25"/><polygon points="290,170 250,250 380,250" fill="#ffe9a3" opacity=".25"/>` +
          person(110, 236, 1.2) + person(200, 240, 1.3) + person(290, 236, 1.2),
        '#0a0d12',
      ) + caption('2032. Los pocos que todavía recuerdan cómo se escribe código forman la Resistencia.'),
      svg(
        `<rect x="40" y="40" width="320" height="170" fill="#e9dfc4" stroke="${INK}" stroke-width="5"/>` +
          `<text x="200" y="100" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="34" fill="${INK}">OBJETIVO</text>` +
          `<text x="200" y="150" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="40" fill="#b3261e">DESACTIVAR A VERTRIX</text>` +
          `<line x1="70" y1="170" x2="330" y2="170" stroke="${INK}" stroke-width="3"/>`,
        '#3b4250',
      ) + caption('Vos sos parte de ella.', 'br'),
    ],
  },
  {
    year: '2032',
    title: 'Hotel Zero-Day',
    layout: 'g1',
    panels: [
      svg(
        Array.from({ length: 60 }, (_, i) => `<line x1="${(i * 37) % 400}" y1="${(i * 53) % 250}" x2="${((i * 37) % 400) - 6}" y2="${((i * 53) % 250) + 18}" stroke="#9fb3c8" stroke-width="1.5" opacity=".5"/>`).join('') +
          `<rect x="140" y="40" width="120" height="210" fill="#141821" stroke="${INK}" stroke-width="4"/>` +
          Array.from({ length: 24 }, (_, i) => `<rect x="${152 + (i % 4) * 26}" y="${70 + Math.floor(i / 4) * 28}" width="14" height="16" fill="${i === 9 ? '#ffd86b' : '#0b0d12'}"/>`).join('') +
          `<text x="200" y="62" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="20" fill="#ff3b2b">HOTEL ZERO-DAY</text>` +
          person(200, 250, 0.9),
        '#1b2533',
      ) + caption('Pero hoy tu objetivo es uno solo: <b>salir del hotel con vida.</b>', 'bl'),
    ],
  },
];

// ---------- Control ----------
const $ = (id: string) => document.getElementById(id) as HTMLElement;
let page = 0;
let open = false;
let onDone: (() => void) | null = null;

export const isComicOpen = () => open;

export function startComic(done?: () => void) {
  open = true;
  page = 0;
  onDone = done ?? null;
  $('comic').classList.remove('hidden');
  render();
}

function render() {
  const p = PAGES[page];
  $('comic-page').innerHTML =
    `<div class="c-head"><span class="c-year">${p.year}</span><span class="c-title">${p.title}</span></div>` +
    `<div class="c-grid ${p.layout}">${p.panels.map((html, i) => `<div class="c-panel" style="animation-delay:${i * 0.35}s">${html}</div>`).join('')}</div>`;
  $('comic-count').textContent = `${page + 1} / ${PAGES.length}`;
  ($('comic-prev') as HTMLButtonElement).disabled = page === 0;
  $('comic-next').textContent = page === PAGES.length - 1 ? 'COMENZAR ▶' : 'SIGUIENTE ▶';
}

function next() {
  if (page < PAGES.length - 1) {
    page++;
    render();
  } else finish();
}

function prev() {
  if (page > 0) {
    page--;
    render();
  }
}

function finish() {
  open = false;
  $('comic').classList.add('hidden');
  onDone?.();
}

$('comic-next').addEventListener('click', next);
$('comic-prev').addEventListener('click', prev);
$('comic-skip').addEventListener('click', finish);

// En captura, para que Enter/Espacio no lleguen al resto del juego mientras se lee el cómic.
window.addEventListener(
  'keydown',
  (e) => {
    if (!open) return;
    if (['ArrowRight', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) next();
    else if (e.code === 'ArrowLeft') prev();
    else if (e.code === 'Escape') finish();
    else return;
    e.preventDefault();
    e.stopPropagation();
  },
  true,
);
