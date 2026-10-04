export interface Question {
  id: string;
  text: string;
  options: string[];
  theory: string;
}

export interface CsrfRequest {
  method: string;
  origin: string;
  csrf: string;
  body: string;
}

export interface PublicTasks {
  keypad: { hash: string };
  logs: { lines: string[] };
  fix: { steps: { title: string; code: string; options: string[] }[] };
  csrf: { token: string; origin: string; requests: CsrfRequest[] };
  audit: { config: string[]; items: string[] };
}

export interface Session {
  sessionId: string;
  quiz: { id: number; topic: string; questions: Question[] };
  tasks: PublicTasks;
  pointsPerQuestion: number;
  maxScore: number;
  minScore: number; // puntaje mínimo para poder salir del hotel (60%)
  saveId?: string | null;
}

export interface Progress {
  score: number;
  quiz: { answered: boolean; correct: boolean }[];
  tasks: { keypad: boolean; logs: boolean; fix: { step: number; solved: boolean }; csrf: boolean; audit: boolean };
}

export interface LoadedSession extends Session {
  name: string;
  progress: Progress;
}

export interface SaveInfo {
  name: string;
  score: number;
  rooms: number;
  updated: string;
}

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  score: number;
}

export interface BoardEntry {
  name: string;
  score: number;
  maxScore: number;
  seconds: number;
  flags?: number;
}

export interface FinishResult extends BoardEntry {
  rank: number | null;
  leaderboard: BoardEntry[];
}

/** Respuesta genérica de /api/task: cada tarea agrega sus propios campos. */
export interface TaskResult {
  ok: boolean;
  score: number;
  points?: number;
  error?: string;
  // teclado
  locked?: boolean;
  retryAfter?: number;
  fails?: number;
  attempts?: number;
  // logs / reparación / auditoría
  hint?: string;
  explanation?: string;
  expected?: number[];
  step?: number;
  done?: boolean;
  results?: (boolean | { correct: boolean; why: string })[];
}

async function post<T>(url: string, body: unknown, okStatuses: number[] = []): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !okStatuses.includes(res.status)) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export const createSession = (name: string) => post<Session>('/api/session', { name });

export const answer = (sessionId: string, questionId: string, choice: number) =>
  post<AnswerResult>('/api/answer', { sessionId, questionId, choice });

// 429 = cerradura bloqueada temporalmente (rate limiting): es una respuesta esperada, no un error.
export const task = (sessionId: string, taskId: string, answerValue: unknown) =>
  post<TaskResult>('/api/task', { sessionId, taskId, answer: answerValue }, [429]);

export const finish = (sessionId: string) => post<FinishResult>('/api/finish', { sessionId });

// Partidas guardadas (se guardan al terminar cada habitación)
export const save = (sessionId: string) => post<{ saveId: string; rooms: number; score: number }>('/api/save', { sessionId });
export const loadGame = (saveId: string) => post<LoadedSession>('/api/load', { saveId });
export async function saveInfo(saveId: string): Promise<SaveInfo> {
  const res = await fetch(`/api/save/${encodeURIComponent(saveId)}`);
  if (!res.ok) throw new Error('Sin partida');
  return res.json();
}

// Captura de pantalla detectada: el servidor descuenta puntos y devuelve el puntaje nuevo.
export const penalty = (sessionId: string, type: 'screenshot') =>
  post<{ score: number; flags: number; applied: boolean; penalty?: number }>('/api/penalty', { sessionId, type });

// Reporte de integridad (pegar código, captura de pantalla, salir de la pestaña). Fire-and-forget.
export function flag(sessionId: string, reason: string) {
  fetch('/api/flag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, reason }),
    keepalive: true,
  }).catch(() => {});
}
