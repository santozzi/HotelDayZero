// Contenido de los papeles/afiches que el jugador puede leer. Las pistas de la 102
// (diccionario + carta) permiten deducir el código del teclado: 2580.
export const NOTES: Record<string, { poster?: boolean; html: string }> = {
  manual: {
    html: `<h3>Manual de la cerradura</h3>
      <p>Al cerrarse, la puerta pide un <strong>PIN de 4 dígitos</strong>.</p>
      <p>El conserje dejó el PIN anotado en alguna parte del cuarto. Buscá bien.</p>
      <p class="mini">¿Tenés el decodificador de la 101? En la cerradura podés usarlo para romper el PIN
      por fuerza bruta en vez de adivinarlo.</p>`,
  },
  diccionario: {
    html: `<h3>PINes más usados (NO usar)</h3>
      <p>Lista de los peores PIN, de un estudio real:</p>
      <ul><li>1234</li><li>1111</li><li>0000</li><li>1212</li><li>7777</li><li>1004</li></ul>
      <p class="mini">Un atacante prueba primero estos. Por eso el tuyo no está acá.</p>`,
  },
  carta: {
    html: `<h3>Nota del conserje</h3>
      <p>"No me acuerdo los números, así que los marqué <strong>dibujando una T</strong> en el
      teclado: bajo por la columna del medio y después cruzo arriba."</p>
      <p class="mini">Teclado:<br>1 2 3<br>4 5 6<br>7 8 9<br>&nbsp;&nbsp; 0</p>
      <p>"Primero toda la columna de arriba a abajo, y el travesaño va arriba de todo."</p>`,
  },
  regla: {
    html: `<h3>Regla de oro del panel</h3>
      <p>El panel de diagnóstico hace <code>ping</code> a lo que escribas. El programador apurado puso:</p>
      <p><code>exec("ping -c 3 " + host)</code></p>
      <p>Si <code>host</code> trae un <code>;</code>, <code>|</code> o <code>&amp;&amp;</code>, el sistema
      ejecuta <strong>un segundo comando</strong>. Eso es <strong>inyección de comandos</strong>.</p>
      <p>Defensa: <strong>lista blanca</strong> de hosts y ejecutar sin shell (argumentos separados).
      Nunca concatenar la entrada del usuario en la línea de comando.</p>`,
  },
  politica: {
    html: `<h3>Política de la conserjería</h3>
      <p>El servidor sólo debe aceptar un cambio de clave si se cumplen <strong>las tres</strong>:</p>
      <ul>
        <li>Método <strong>POST</strong> (un <strong>GET</strong> nunca cambia estado).</li>
        <li><strong>Origin</strong> exactamente <code>https://hotel-zeroday.local</code>
            (ojo: <code>...local.premios.xyz</code> es otro dominio).</li>
        <li><strong>Token CSRF</strong> igual al que emitió el formulario.</li>
      </ul>
      <p class="mini">El token es la defensa principal: la página atacante no puede adivinarlo.</p>`,
  },
  volante: {
    poster: true,
    html: `<p class="big">¡GANASTE!</p>
      <p>Hacé click acá para reclamar tu premio. Tu sesión del hotel sigue abierta, ¿no?</p>
      <p class="mini">(Esto es exactamente lo que hace una página de CSRF: usar tu sesión sin que te des cuenta.)</p>`,
  },
};
