import { randomBytes } from 'node:crypto';

// Tareas de las habitaciones 102–104 y de la salida. Todo se valida acá: el navegador sólo recibe
// los datos públicos (`publicData`) y nunca las respuestas.

const hex = (n) => randomBytes(n).toString('hex');

// Hash FNV-1a (32 bits) determinista: el mismo algoritmo corre en el worker del decodificador.
// Se le manda al cliente SÓLO el hash del PIN, nunca el PIN: por eso el decodificador debe
// probar los 10000 códigos (fuerza bruta offline), justo lo que el rate limiting del login evita.
export function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// ---------- 102 · Fuerza bruta: cerradura con teclado ----------
// La clave se deduce de las pistas de la habitación (diccionario + carta del conserje),
// o se rompe con el decodificador que se obtiene al terminar la 101.
// El servidor aplica rate limiting con backoff exponencial, igual que el apunte.
export const KEYPAD_CODE = '2580';
const FREE_ATTEMPTS = 3;
const MAX_LOCK_S = 32;

export function keypadAttempt(state, code) {
  const now = Date.now();
  if (state.lockedUntil > now) {
    return { status: 429, body: { ok: false, locked: true, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) } };
  }
  state.attempts++;
  if (String(code) === KEYPAD_CODE) {
    state.solved = true;
    const points = Math.max(100, 300 - 25 * state.fails);
    return { status: 200, body: { ok: true, points, attempts: state.attempts } };
  }
  state.fails++;
  let retryAfter = 0;
  if (state.fails >= FREE_ATTEMPTS) {
    retryAfter = Math.min(MAX_LOCK_S, 2 ** (state.fails - FREE_ATTEMPTS + 1));
    state.lockedUntil = now + retryAfter * 1000;
  }
  return { status: 200, body: { ok: false, fails: state.fails, retryAfter } };
}

// ---------- 103 · Inyección de comandos: análisis de logs ----------
const LOG_LINES = [
  { line: '[22:01:13] POST /diagnostico host=192.168.0.1 ip=10.0.0.23 200', bad: false },
  { line: '[22:01:40] POST /diagnostico host=127.0.0.1;ls ip=10.0.0.66 200', bad: true },
  { line: '[22:02:02] POST /diagnostico host=hotel-db.local ip=10.0.0.23 200', bad: false },
  { line: '[22:02:15] POST /diagnostico host=8.8.8.8|whoami ip=10.0.0.66 200', bad: true },
  { line: '[22:02:31] GET /habitaciones ip=10.0.0.41 200', bad: false },
  { line: '[22:03:05] POST /diagnostico host=localhost&&id ip=10.0.0.66 200', bad: true },
  { line: '[22:03:06] WARNING: salida de utilitario visible en respuesta', bad: true },
  { line: '[22:03:44] POST /diagnostico host=1.1.1.1 ip=10.0.0.23 200', bad: false },
];
const LOGS_EXPLANATION =
  'Las líneas con separadores de comandos (; | &&) en un parámetro que debería ser sólo un host son intentos de inyección, y todas vienen de la misma IP (10.0.0.66). El WARNING indica que la salida del comando se muestra en la respuesta: fuga de información. Un host común, aunque sea una IP externa, es tráfico normal.';

// ---------- 103 · Inyección de comandos: reparar el panel de ping ----------
const FIX_STEPS = [
  {
    title: 'Paso 1 · Validar la entrada',
    code: 'const host = req.body.host;',
    options: [
      'if (host.includes(";")) return res.status(400).end();',
      'const permitidos = ["hotel-db.local", "127.0.0.1"];\nif (!permitidos.includes(host)) return res.status(400).end();',
      '// el formulario ya valida el host con un <input type="text">',
    ],
    answer: 1,
    explanation: 'Lista blanca: sólo se aceptan valores conocidos. Prohibir ";" es una lista negra y se evade con | o &&; la validación del formulario se saltea fácilmente.',
  },
  {
    title: 'Paso 2 · Ejecutar el comando',
    code: 'exec("ping -c 3 " + host, callback);',
    options: [
      'exec(`ping -c 3 ${host}`, { shell: true }, callback);',
      'exec("ping -c 3 \'" + host + "\'", callback);',
      "spawn('ping', ['-c', '3', host], { shell: false });",
    ],
    answer: 2,
    explanation: 'Con spawn, argumentos separados en un array y shell:false, el host nunca pasa por un shell que interprete operadores. Concatenar (con o sin comillas, con template string) sigue armando una línea de comando.',
  },
  {
    title: 'Paso 3 · Desplegar el servicio',
    code: '# ¿con qué permisos y dónde corre el panel?',
    options: [
      'Correrlo como root para que ping nunca falle por permisos',
      'Correrlo en un contenedor con un usuario sin privilegios y mostrar errores genéricos (detalles sólo en logs)',
      'Mostrar el stack trace completo al usuario para depurar más rápido',
    ],
    answer: 1,
    explanation: 'Menor privilegio y aislamiento limitan el daño si algo falla. Los errores detallados (rutas, stack traces) le dan información al atacante: van a los logs, no a la pantalla.',
  },
];

// ---------- 104 · CSRF: el servidor de la conserjería ----------
function buildCsrf() {
  const token = hex(3);
  const ORIGIN = 'https://hotel-zeroday.local';
  const requests = [
    { method: 'POST', origin: ORIGIN, csrf: token, body: 'nueva=G4t0-N3gr0-77', accept: true,
      why: 'Método POST, origen del hotel y token correcto: es el formulario legítimo.' },
    { method: 'POST', origin: 'https://premios-gratis.xyz', csrf: '(ausente)', body: 'nueva=1234', accept: false,
      why: 'Viene de otro sitio y sin token: el navegador del conserje envió su cookie, pero la página maliciosa no puede conocer el token.' },
    { method: 'GET', origin: ORIGIN, csrf: '(ausente)', body: '?nueva=0000', accept: false,
      why: 'Un GET nunca debe cambiar estado: alcanza con una <img src="..."> en cualquier página para dispararlo.' },
    { method: 'POST', origin: ORIGIN, csrf: hex(3), body: 'nueva=abcd', accept: false,
      why: 'El token no coincide con el emitido por el formulario: hay que rechazarla aunque el origen parezca correcto.' },
    { method: 'POST', origin: 'https://hotel-zeroday.local.premios.xyz', csrf: '(ausente)', body: 'nueva=9999', accept: false,
      why: 'El dominio real es premios.xyz. Por eso comparar Origin con startsWith() es un error, y por eso el token es la defensa principal.' },
    { method: 'POST', origin: ORIGIN, csrf: token, body: 'nueva=L1nt3rn4-R0ta', accept: true,
      why: 'Cumple las tres reglas: POST, origen exacto y token válido.' },
  ];
  return { token, origin: ORIGIN, requests };
}

// ---------- Salida · Auditoría con la checklist ----------
const AUDIT = {
  config: [
    "cookie: { httpOnly: true, secure: true, sameSite: 'lax' }",
    'password = await bcrypt.hash(plain, 12)',
    'app.post("/login", login)            // sin límite de intentos',
    'if (!user) res.send("Usuario inexistente")',
    'db.query("SELECT * FROM reservas WHERE id=" + req.params.id)',
    'usuario inicial: admin / admin',
  ],
  items: [
    { text: 'Cookies de sesión con HttpOnly, Secure y SameSite', ok: true },
    { text: 'Contraseñas con hash robusto y salt (bcrypt/Argon2)', ok: true },
    { text: 'Protección anti fuerza bruta en el login', ok: false },
    { text: 'Mensajes de error de login genéricos', ok: false },
    { text: 'Consultas SQL parametrizadas', ok: false },
    { text: 'Sin credenciales por defecto', ok: false },
  ],
  explanation:
    'Bien: cookies con las tres banderas y bcrypt con salt. Mal: el login no limita intentos, el mensaje permite enumerar usuarios, la consulta concatena req.params.id (inyección SQL) y queda la cuenta admin/admin de fábrica.',
};

// ---------- Estado por sesión ----------
export function createTaskState() {
  return {
    keypad: { attempts: 0, fails: 0, lockedUntil: 0, solved: false },
    logs: { tries: 0, solved: false },
    fix: { step: 0, firstTry: true, solved: false },
    csrf: { ...buildCsrf(), tries: 0, solved: false },
    audit: { tries: 0, solved: false },
  };
}

export function publicTasks(t) {
  return {
    keypad: { hash: fnv(KEYPAD_CODE) },
    logs: { lines: LOG_LINES.map((l) => l.line) },
    fix: { steps: FIX_STEPS.map(({ title, code, options }) => ({ title, code, options })) },
    csrf: {
      token: t.csrf.token,
      origin: t.csrf.origin,
      requests: t.csrf.requests.map(({ method, origin, csrf, body }) => ({ method, origin, csrf, body })),
    },
    audit: { config: AUDIT.config, items: AUDIT.items.map((i) => i.text) },
  };
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/** Valida una respuesta. Devuelve { status, body } y suma puntos en `session.score`. */
export function checkTask(session, taskId, answer) {
  const t = session.tasks;
  switch (taskId) {
    case 'keypad': {
      if (t.keypad.solved) return { status: 409, body: { error: 'La cerradura ya está abierta' } };
      const res = keypadAttempt(t.keypad, answer);
      if (res.body.ok) session.score += res.body.points;
      return res;
    }
    case 'logs': {
      if (t.logs.solved) return { status: 409, body: { error: 'Ya resuelto' } };
      const expected = LOG_LINES.flatMap((l, i) => (l.bad ? [i] : []));
      const picked = Array.isArray(answer) ? answer.map(Number) : [];
      const ok = sameSet(picked, expected);
      let points = 0;
      if (ok) {
        t.logs.solved = true;
        points = Math.max(50, 200 - 50 * t.logs.tries);
        session.score += points;
      }
      t.logs.tries++;
      return { status: 200, body: { ok, points, expected: ok ? expected : undefined, explanation: ok ? LOGS_EXPLANATION : undefined,
        hint: ok ? undefined : `Marcaste ${picked.length} líneas; hay ${expected.length} señales. Fijate en los parámetros que no son sólo un host.` } };
    }
    case 'fix': {
      if (t.fix.solved) return { status: 409, body: { error: 'Ya resuelto' } };
      const step = FIX_STEPS[t.fix.step];
      const ok = Number(answer) === step.answer;
      let points = 0;
      if (ok) {
        if (t.fix.firstTry) points = 100;
        session.score += points;
        t.fix.step++;
        t.fix.firstTry = true;
        t.fix.solved = t.fix.step >= FIX_STEPS.length;
      } else {
        t.fix.firstTry = false;
      }
      return { status: 200, body: { ok, points, step: t.fix.step, done: t.fix.solved, explanation: step.explanation } };
    }
    case 'csrf': {
      if (t.csrf.solved) return { status: 409, body: { error: 'Ya resuelto' } };
      const decisions = Array.isArray(answer) ? answer.map(Boolean) : [];
      const results = t.csrf.requests.map((r, i) => ({ correct: decisions[i] === r.accept, why: r.why }));
      const correctCount = results.filter((r) => r.correct).length;
      const ok = correctCount === results.length;
      const points = t.csrf.tries === 0 ? correctCount * 50 : 0;
      session.score += points;
      t.csrf.tries++;
      if (ok) t.csrf.solved = true;
      return { status: 200, body: { ok, points, results } };
    }
    case 'audit': {
      if (t.audit.solved) return { status: 409, body: { error: 'Ya resuelto' } };
      const marks = Array.isArray(answer) ? answer.map(Boolean) : [];
      const results = AUDIT.items.map((it, i) => marks[i] === it.ok);
      const correctCount = results.filter(Boolean).length;
      const ok = correctCount === results.length;
      const points = t.audit.tries === 0 ? correctCount * 50 : 0;
      session.score += points;
      t.audit.tries++;
      if (ok) t.audit.solved = true;
      return { status: 200, body: { ok, points, results, explanation: ok ? AUDIT.explanation : undefined } };
    }
    default:
      return { status: 404, body: { error: 'Tarea inexistente' } };
  }
}

export const isTaskSolved = (session, taskId) => Boolean(session.tasks[taskId]?.solved);
