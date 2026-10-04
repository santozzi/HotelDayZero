import * as THREE from 'three';

// Todas las texturas se generan con canvas: el juego no necesita descargar assets.

let seed = 1337;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTexture(w: number, h: number, draw: Draw): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(g: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

function stains(g: CanvasRenderingContext2D, w: number, h: number, count: number, color: string, maxR: number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 6 + rand() * maxR;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

export function wallpaper() {
  return canvasTexture(256, 384, (g, w, h) => {
    g.fillStyle = '#6b5a44';
    g.fillRect(0, 0, w, h);
    // franjas verticales
    for (let x = 0; x < w; x += 32) {
      g.fillStyle = 'rgba(40,28,18,0.35)';
      g.fillRect(x, 0, 10, h);
      g.fillStyle = 'rgba(160,140,100,0.12)';
      g.fillRect(x + 14, 0, 3, h);
    }
    // ornamentos tipo damasco
    g.fillStyle = 'rgba(50,35,22,0.3)';
    for (let y = 20; y < h; y += 48) {
      for (let x = 21; x < w; x += 32) {
        g.beginPath();
        g.ellipse(x + 6, y + ((x / 32) % 2) * 24, 4, 9, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    // zócalo
    g.fillStyle = '#2a1d14';
    g.fillRect(0, h - 40, w, 40);
    g.fillStyle = '#3b291c';
    g.fillRect(0, h - 44, w, 5);
    // humedad que sube desde el piso
    const damp = g.createLinearGradient(0, h, 0, h * 0.45);
    damp.addColorStop(0, 'rgba(20,18,10,0.75)');
    damp.addColorStop(1, 'rgba(20,18,10,0)');
    g.fillStyle = damp;
    g.fillRect(0, 0, w, h);
    stains(g, w, h, 14, 'rgba(25,18,8,0.45)', 50);
    // papel despegado
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(150,140,115,0.55)';
      g.beginPath();
      const x = rand() * w;
      const y = rand() * h * 0.7;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) g.lineTo(x + (rand() - 0.3) * 40, y + (rand() - 0.3) * 40);
      g.fill();
    }
    noise(g, w, h, 28);
  });
}

export function woodFloor() {
  return canvasTexture(256, 256, (g, w, h) => {
    const plank = 32;
    for (let y = 0; y < h; y += plank) {
      const base = 40 + rand() * 18;
      g.fillStyle = `rgb(${base + 22},${base + 8},${base - 6})`;
      g.fillRect(0, y, w, plank);
      for (let k = 0; k < 24; k++) {
        g.strokeStyle = `rgba(20,10,4,${0.1 + rand() * 0.2})`;
        g.beginPath();
        const yy = y + rand() * plank;
        g.moveTo(0, yy);
        g.bezierCurveTo(w * 0.3, yy + rand() * 4 - 2, w * 0.6, yy + rand() * 4 - 2, w, yy);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(0, y, w, 2);
      g.fillRect(((y / plank) * 97) % w, y, 2, plank);
    }
    stains(g, w, h, 10, 'rgba(10,8,4,0.5)', 40);
    noise(g, w, h, 22);
  });
}

export function carpet() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#4a1414';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(180,140,60,0.35)';
    g.lineWidth = 3;
    g.strokeRect(10, 0, w - 20, h);
    g.lineWidth = 2;
    for (let y = 32; y < h; y += 64) {
      g.beginPath();
      g.moveTo(w / 2, y - 18);
      g.lineTo(w / 2 + 18, y);
      g.lineTo(w / 2, y + 18);
      g.lineTo(w / 2 - 18, y);
      g.closePath();
      g.stroke();
    }
    stains(g, w, h, 18, 'rgba(15,6,4,0.55)', 45);
    noise(g, w, h, 40);
  });
}

export function ceiling() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5e5a52';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i <= w; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
    }
    stains(g, w, h, 12, 'rgba(60,45,20,0.45)', 55);
    noise(g, w, h, 20);
  });
}

export function doorTexture(label: string, color = '#3d2618') {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = 4;
    g.strokeRect(14, 16, w - 28, h * 0.42);
    g.strokeRect(14, h * 0.52, w - 28, h * 0.42);
    // placa con número
    g.fillStyle = '#8d7440';
    g.fillRect(w / 2 - 26, 48, 52, 24);
    g.fillStyle = '#1b130b';
    g.font = 'bold 20px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, w / 2, 61);
    // picaporte
    g.fillStyle = '#9a8a5a';
    g.beginPath();
    g.arc(w - 22, h * 0.52, 5, 0, Math.PI * 2);
    g.fill();
    stains(g, w, h, 6, 'rgba(0,0,0,0.4)', 30);
    noise(g, w, h, 26);
  });
}

export function signTexture(text: string) {
  const t = canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#1a0000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff2a1a';
    g.shadowColor = '#ff2a1a';
    g.shadowBlur = 12;
    g.font = 'bold 40px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
  return t;
}

export function noteTexture(title: string, poster: boolean) {
  return canvasTexture(192, 256, (g, w, h) => {
    g.fillStyle = poster ? '#c9bc98' : '#d8d0bb';
    g.fillRect(0, 0, w, h);
    stains(g, w, h, 6, 'rgba(90,70,30,0.35)', 40);
    g.fillStyle = poster ? '#5a1a12' : '#2a2218';
    g.font = `bold ${poster ? 26 : 22}px "Special Elite", monospace`;
    g.textAlign = 'center';
    g.fillText(title, w / 2, 40, w - 20);
    // renglones garabateados
    g.strokeStyle = 'rgba(40,30,20,0.55)';
    g.lineWidth = 2;
    for (let y = 70; y < h - 20; y += 18) {
      g.beginPath();
      g.moveTo(18, y);
      let x = 18;
      while (x < w - 18 - rand() * 40) {
        x += 6 + rand() * 10;
        g.lineTo(x, y + (rand() - 0.5) * 3);
      }
      g.stroke();
    }
    noise(g, w, h, 18);
  });
}

export function drawKeypad(tex: THREE.CanvasTexture, display: string, color: string) {
  const c = tex.image as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;
  g.fillStyle = '#15171a';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#020804';
  g.fillRect(16, 14, w - 32, 54);
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 10;
  g.font = 'bold 36px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(display, w / 2, 42);
  g.shadowBlur = 0;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
  const bw = (w - 48) / 3;
  const bh = (h - 100) / 4;
  keys.forEach((k, i) => {
    const x = 16 + (i % 3) * (bw + 8);
    const y = 84 + Math.floor(i / 3) * bh;
    g.fillStyle = '#3a3e44';
    g.fillRect(x, y, bw, bh - 8);
    g.fillStyle = '#c8ccd2';
    g.font = 'bold 26px monospace';
    g.fillText(k, x + bw / 2, y + (bh - 8) / 2);
  });
  tex.needsUpdate = true;
}

function wrapText(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Pizarra de corcho con recortes de diario clavados (los titulares se leen de cerca). */
export function corkBoard(items: { outlet: string; date: string; headline: string; wanted?: boolean }[], title?: string) {
  const W = 768;
  const H = 512;
  return canvasTexture(W, H, (g) => {
    // marco de madera
    g.fillStyle = '#4a2f1a';
    g.fillRect(0, 0, W, H);
    // corcho
    g.fillStyle = '#b98b55';
    g.fillRect(22, 22, W - 44, H - 44);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = rand() < 0.5 ? 'rgba(90,55,25,0.35)' : 'rgba(225,185,130,0.3)';
      g.fillRect(22 + rand() * (W - 44), 22 + rand() * (H - 44), 1 + rand() * 2, 1 + rand() * 2);
    }
    // cartel con el título, clavado arriba
    const top = title ? 86 : 40;
    if (title) {
      g.save();
      g.translate(W / 2, 52);
      g.rotate(-0.012);
      g.fillStyle = '#f4f0e4';
      g.shadowColor = 'rgba(0,0,0,0.45)';
      g.shadowBlur = 6;
      g.fillRect(-W / 2 + 60, -24, W - 120, 46);
      g.shadowColor = 'transparent';
      g.fillStyle = '#8f1a12';
      g.font = 'bold 24px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(title, 0, 0, W - 150);
      g.restore();
    }
    // recortes
    const n = items.length;
    const cols = n <= 3 ? n : 2;
    const rows = Math.ceil(n / cols);
    const cw = (W - 80) / cols;
    const ch = (H - top - 40) / rows;
    const pins: [number, number][] = [];
    items.forEach((it, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const pw = cw - 34;
      const ph = ch - 30;
      const x = 40 + col * cw + 17;
      const y = top + row * ch + 14;
      g.save();
      g.translate(x + pw / 2, y + ph / 2);
      g.rotate((rand() - 0.5) * 0.12);
      g.shadowColor = 'rgba(0,0,0,0.45)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 4;
      g.fillStyle = it.wanted ? '#e7cf8a' : '#efe8d6';
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.shadowColor = 'transparent';
      g.fillStyle = '#5a5246';
      g.font = 'bold 14px Georgia, serif';
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillText(`${it.outlet.toUpperCase()} · ${it.date}`, -pw / 2 + 10, -ph / 2 + 10, pw - 20);
      g.fillStyle = it.wanted ? '#7a1a10' : '#111';
      g.font = `bold ${it.wanted ? 22 : 18}px Georgia, serif`;
      const lines = wrapText(g, it.headline, pw - 20).slice(0, 5);
      lines.forEach((l, k) => g.fillText(l, -pw / 2 + 10, -ph / 2 + 32 + k * 22));
      // renglones de texto "chico"
      g.fillStyle = 'rgba(80,72,60,0.35)';
      for (let yy = -ph / 2 + 40 + lines.length * 22; yy < ph / 2 - 10; yy += 9) g.fillRect(-pw / 2 + 10, yy, pw - 20 - rand() * 30, 4);
      g.restore();
      pins.push([x + pw / 2, y + 4]);
    });
    // hilo rojo uniendo los recortes, estilo investigación
    g.strokeStyle = 'rgba(170,20,15,0.85)';
    g.lineWidth = 2;
    g.beginPath();
    pins.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();
    for (const [px, py] of pins) {
      g.fillStyle = '#c0261c';
      g.beginPath();
      g.arc(px, py, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.beginPath();
      g.arc(px - 2, py - 2, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  });
}

// Tapa de la carpeta de la cátedra: negra con nombre en dorado tipo imprenta.
export function folderCover(name: string) {
  return canvasTexture(256, 320, (g, w, h) => {
    g.fillStyle = '#0c0c0e';
    g.fillRect(0, 0, w, h);
    // textura sutil de cuero
    stains(g, w, h, 20, 'rgba(255,255,255,0.03)', 30);
    // marco dorado
    g.strokeStyle = '#b8942f';
    g.lineWidth = 3;
    g.strokeRect(16, 16, w - 32, h - 32);
    g.lineWidth = 1;
    g.strokeStyle = '#8a6f24';
    g.strokeRect(22, 22, w - 44, h - 44);
    // nombre en dorado, imprenta/mayúsculas
    const parts = name.toUpperCase().split(' ');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(184,148,47,0.5)';
    g.shadowBlur = 6;
    g.fillStyle = '#d4af37';
    g.font = 'bold 30px "Times New Roman", Georgia, serif';
    parts.forEach((p, i) => g.fillText(p, w / 2, h / 2 - 20 + i * 40, w - 56));
    g.shadowBlur = 0;
    // filete dorado bajo el nombre
    g.strokeStyle = '#b8942f';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(w / 2 - 70, h / 2 + 46);
    g.lineTo(w / 2 + 70, h / 2 + 46);
    g.stroke();
    // etiqueta inferior
    g.fillStyle = '#9a7d28';
    g.font = 'italic 15px Georgia, serif';
    g.fillText('CÁTEDRA · PROGRAMACIÓN IV', w / 2, h - 44, w - 56);
  });
}

export function screenTexture(width = 256, height = 192) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function drawScreen(tex: THREE.CanvasTexture, lines: string[], color: string, cursor: boolean) {
  const c = tex.image as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  g.fillStyle = '#020804';
  g.fillRect(0, 0, c.width, c.height);
  g.font = '20px monospace';
  g.textBaseline = 'top';
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 8;
  lines.forEach((l, i) => g.fillText(l + (cursor && i === lines.length - 1 ? '_' : ''), 14, 18 + i * 28));
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1);
  const vig = g.createRadialGradient(c.width / 2, c.height / 2, 40, c.width / 2, c.height / 2, 160);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.7)');
  g.fillStyle = vig;
  g.fillRect(0, 0, c.width, c.height);
  tex.needsUpdate = true;
}
