// Ejecuta el código del jugador en un worker aislado: si hace un bucle infinito,
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
  try {
    // El jugador escribe el cuerpo de decodificar(probar); debe devolver el código hallado.
    const fn = new Function('probar', code) as (p: typeof probar) => unknown;
    const result = fn(probar);
    const found = result == null ? null : String(result);
    const ok = found != null && fnv(found) === hash;
    (self as unknown as Worker).postMessage({ found, ok, calls });
  } catch (err) {
    (self as unknown as Worker).postMessage({ error: (err as Error).message });
  }
};
