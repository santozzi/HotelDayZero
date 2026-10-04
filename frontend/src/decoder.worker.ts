import { transform } from 'sucrase';

// Ejecuta el código TypeScript del jugador en un worker aislado: si hace un bucle infinito,
// el hilo principal termina el worker sin congelar la pestaña.

// Mismo FNV-1a que el backend. `probar(codigo)` compara el hash del candidato con el del PIN.
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

self.onmessage = (e: MessageEvent<{ code: string; hash: string }>) => {
  const { code, hash } = e.data;
  let calls = 0;
  const probar = (codigo: unknown): boolean => {
    if (++calls > 50000) throw new Error('Demasiados intentos: ¿el bucle no termina nunca?');
    return fnv(String(codigo)) === hash;
  };

  // 1) Compilar: el jugador escribe TypeScript (el cuerpo de decodificar). Sucrase quita los tipos.
  let js: string;
  try {
    const src = `function __decodificar(probar: (codigo: string) => boolean): string | null {\n${code}\n}`;
    js = transform(src, { transforms: ['typescript'] }).code;
  } catch (err) {
    // la línea 1 es el envoltorio de la función: se corrige para que coincida con el editor
    const msg = (err as Error).message.replace(/\((\d+):(\d+)\)/, (_, l, c) => `(línea ${Number(l) - 1}, columna ${c})`);
    (self as unknown as Worker).postMessage({ error: `sintaxis TypeScript: ${msg}` });
    return;
  }

  // 2) Ejecutar y comprobar que lo devuelto sea realmente el PIN.
  try {
    const fn = new Function('probar', `${js}\nreturn __decodificar(probar);`) as (p: typeof probar) => unknown;
    const result = fn(probar);
    const found = result == null ? null : String(result);
    const ok = found != null && fnv(found) === hash;
    (self as unknown as Worker).postMessage({ found, ok, calls });
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: (err as Error).message });
  }
};
