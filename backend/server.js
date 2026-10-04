import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUIZ } from './questions.js';
import { checkTask, createTaskState, isTaskSolved, publicTasks } from './tasks.js';
import { openDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const QUESTIONS = 3;
const POINTS = 100;
const TASK_IDS = ['keypad', 'logs', 'fix', 'csrf', 'audit'];
// 3 preguntas (300) + teclado (300) + logs (200) + reparación (300) + CSRF (300) + auditoría (300)
const MAX_SCORE = 1700;
const MIN_SCORE = Math.ceil(MAX_SCORE * 0.6); // hace falta el 60% para salir del hotel
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

const app = Fastify({ logger: { level: 'info' } });
const db = openDb(DATA_DIR);

// Sesiones activas en memoria: las respuestas correctas nunca salen del servidor.
const sessions = new Map();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getSession(id, reply) {
  const s = sessions.get(id);
  if (!s || s.finished) {
    reply.code(404).send({ error: 'Sesión inválida' });
    return null;
  }
  return s;
}

/** Habitaciones completas, en orden (101 → 104). */
function roomsDone(s) {
  const quizDone = [...s.answers.values()].every((q) => q.answered);
  const steps = [quizDone, isTaskSolved(s, 'keypad'), isTaskSolved(s, 'logs') && isTaskSolved(s, 'fix'), isTaskSolved(s, 'csrf')];
  let n = 0;
  while (n < steps.length && steps[n]) n++;
  return n;
}

/** Estado que necesita el cliente para reconstruir la partida al continuar una guardada. */
function progressOf(s) {
  return {
    score: s.score,
    quiz: s.questions.map((q) => {
      const a = s.answers.get(q.id);
      return { answered: a.answered, correct: Boolean(a.wasCorrect) };
    }),
    tasks: {
      keypad: isTaskSolved(s, 'keypad'),
      logs: isTaskSolved(s, 'logs'),
      fix: { step: s.tasks.fix.step, solved: s.tasks.fix.solved },
      csrf: isTaskSolved(s, 'csrf'),
      audit: isTaskSolved(s, 'audit'),
    },
  };
}

function sessionPayload(sessionId, s) {
  return {
    sessionId,
    saveId: s.saveId ?? null,
    quiz: { id: QUIZ.id, topic: QUIZ.topic, questions: s.questions },
    tasks: publicTasks(s.tasks),
    pointsPerQuestion: POINTS,
    maxScore: MAX_SCORE,
    minScore: MIN_SCORE,
  };
}

app.post('/api/session', async (req) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 20) || 'Anónimo';
  const answers = new Map();
  const questions = shuffle([...QUIZ.questions])
    .slice(0, QUESTIONS)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      const id = randomUUID();
      answers.set(id, { correct: order.indexOf(q.answer), explanation: q.explanation, answered: false, wasCorrect: false });
      return { id, text: q.text, options: order.map((i) => q.options[i]), theory: q.theory };
    });
  const sessionId = randomUUID();
  const s = { name, created: Date.now(), started: Date.now(), questions, answers, tasks: createTaskState(), score: 0, correct: 0, finished: false, flags: 0, flagLog: [] };
  sessions.set(sessionId, s);
  return sessionPayload(sessionId, s);
});

app.post('/api/answer', async (req, reply) => {
  const { sessionId, questionId, choice } = req.body ?? {};
  const s = getSession(sessionId, reply);
  if (!s) return;
  const q = s.answers.get(questionId);
  if (!q) return reply.code(404).send({ error: 'Pregunta inválida' });
  if (q.answered) return reply.code(409).send({ error: 'Esa pregunta ya fue respondida' });
  q.answered = true;
  const correct = choice === q.correct;
  q.wasCorrect = correct;
  if (correct) {
    s.score += POINTS;
    s.correct++;
  }
  return { correct, correctIndex: q.correct, explanation: q.explanation, score: s.score };
});

app.post('/api/task', async (req, reply) => {
  const { sessionId, taskId, answer } = req.body ?? {};
  const s = getSession(sessionId, reply);
  if (!s) return;
  const { status, body } = checkTask(s, taskId, answer);
  return reply.code(status).send({ ...body, score: s.score });
});

// Registra un intento de trampa (pegar código, capturar pantalla, salir de la pestaña).
app.post('/api/flag', async (req, reply) => {
  const s = getSession(req.body?.sessionId, reply);
  if (!s) return;
  const reason = String(req.body?.reason ?? 'desconocido').slice(0, 60);
  s.flags++;
  if (s.flagLog.length < 200) s.flagLog.push({ reason, at: new Date().toISOString() });
  return { flags: s.flags };
});

// ---------- Partidas guardadas ----------
app.post('/api/save', async (req, reply) => {
  const s = getSession(req.body?.sessionId, reply);
  if (!s) return;
  s.saveId ??= randomUUID();
  const rooms = roomsDone(s);
  const tasks = { ...s.tasks, keypad: { ...s.tasks.keypad, lockedUntil: 0 } };
  const data = {
    name: s.name,
    elapsed: Math.round((Date.now() - s.started) / 1000),
    questions: s.questions,
    answers: [...s.answers.entries()],
    tasks,
    score: s.score,
    correct: s.correct,
    flags: s.flags,
    flagLog: s.flagLog,
  };
  db.saveGame(s.saveId, s.name, s.score, rooms, data);
  return { saveId: s.saveId, rooms, score: s.score };
});

app.get('/api/save/:id', async (req, reply) => {
  const row = db.loadGame(String(req.params.id));
  if (!row) return reply.code(404).send({ error: 'No hay partida guardada' });
  return { name: row.name, score: row.score, rooms: row.rooms, updated: row.updated };
});

app.post('/api/load', async (req, reply) => {
  const saveId = String(req.body?.saveId ?? '');
  const row = db.loadGame(saveId);
  if (!row) return reply.code(404).send({ error: 'No hay partida guardada' });
  const d = row.data;
  const s = {
    name: d.name,
    created: Date.now(),
    started: Date.now() - d.elapsed * 1000,
    questions: d.questions,
    answers: new Map(d.answers),
    tasks: d.tasks,
    score: d.score,
    correct: d.correct,
    finished: false,
    flags: d.flags ?? 0,
    flagLog: d.flagLog ?? [],
    saveId,
  };
  const sessionId = randomUUID();
  sessions.set(sessionId, s);
  return { ...sessionPayload(sessionId, s), name: s.name, progress: progressOf(s) };
});

// ---------- Final ----------
app.post('/api/finish', async (req, reply) => {
  const s = getSession(req.body?.sessionId, reply);
  if (!s) return;
  const pending = [...s.answers.values()].some((q) => !q.answered) || TASK_IDS.some((id) => !isTaskSolved(s, id));
  if (pending) return reply.code(400).send({ error: 'Todavía quedan tareas sin resolver' });
  if (s.score < MIN_SCORE) {
    return reply.code(403).send({ error: `Hace falta al menos ${MIN_SCORE} puntos (60%) para salir del hotel` });
  }
  s.finished = true;
  const seconds = Math.round((Date.now() - s.started) / 1000);
  const entry = { name: s.name, score: s.score, maxScore: MAX_SCORE, seconds, flags: s.flags, date: new Date().toISOString() };
  const rank = db.addScore(entry);
  if (s.saveId) db.deleteGame(s.saveId);
  return { ...entry, rank, leaderboard: db.top(10) };
});

app.get('/api/leaderboard', async () => db.top(10));

app.get('/api/health', async () => ({ ok: true }));

if (existsSync(PUBLIC_DIR)) {
  await app.register(fastifyStatic, { root: PUBLIC_DIR });
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) if (s.created < cutoff) sessions.delete(id);
}, 10 * 60 * 1000).unref();

await app.listen({ port: PORT, host: '0.0.0.0' });
