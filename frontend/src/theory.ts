// Apunte completo de la cátedra: va entero en cada carpeta. El jugador tiene que leerlo
// y buscar el tema que corresponde a la pregunta de su terminal. No contiene respuestas marcadas.
export const FULL_THEORY = `
<h4>1 · Inyección SQL (SQLi)</h4>
<p>Ocurre cuando la aplicación arma una consulta pegando directamente la entrada del usuario, por ejemplo
<code>"SELECT * FROM users WHERE user='" + entrada + "'"</code>. Un atacante inyecta operadores SQL: la comilla
(<code>'</code>) cierra el texto esperado, <code>OR 1=1</code> agrega una condición siempre verdadera y
<code>-- </code> comenta el resto de la sentencia (incluida la verificación de la contraseña). Resultado: entra
sin credenciales válidas o lee/modifica datos.</p>
<p><strong>Defensa principal:</strong> consultas <strong>parametrizadas / preparadas</strong> (o un ORM que las
use): los datos viajan separados del código SQL, así una comilla o un <code>OR</code> nunca se interpretan como
parte de la consulta. Ocultar nombres de tablas no sirve; validar sólo en el navegador se saltea; conectarse como
<code>root</code> agranda el daño. Complementos: validación en el servidor y <strong>mínimos privilegios</strong>
en la base de datos.</p>

<h4>2 · Cross-Site Scripting (XSS)</h4>
<p>El atacante logra que se ejecute JavaScript/HTML malicioso en el navegador de otras personas, cuando la app
muestra datos del usuario sin sanitizarlos. Tipos:</p>
<ul>
<li><strong>Reflejado:</strong> el payload viaja en la petición y vuelve en la respuesta inmediata (ej. un
parámetro de búsqueda).</li>
<li><strong>Almacenado (persistente):</strong> el payload se guarda en la base de datos (un comentario, un
perfil) y afecta a <em>todos</em> los que vean esa página después.</li>
<li><strong>De DOM:</strong> lo arma JavaScript en el propio cliente.</li>
</ul>
<p><strong>Defensa principal:</strong> <strong>escapar (codificar) la salida</strong> antes de insertar datos en el
HTML: convertir <code>&lt;</code> en <code>&amp;lt;</code>, <code>&gt;</code> en <code>&amp;gt;</code>,
<code>"</code> en <code>&amp;quot;</code>, así el navegador los muestra como texto en vez de ejecutarlos. HTTPS
cifra el canal pero no frena el XSS. Capas extra: <strong>Content Security Policy</strong> y cookies
<strong>HttpOnly</strong>.</p>

<h4>3 · Validación de entrada</h4>
<p>La validación del lado del <strong>cliente</strong> (HTML5/JS) es sólo comodidad: se puede desactivar desde las
DevTools o evitar enviando la petición HTTP a mano (curl, Postman, un proxy). Por eso toda entrada debe validarse
<strong>siempre en el servidor</strong>: tipo, longitud, formato y rango. Regla de oro: <em>no confíes en el
usuario</em>.</p>
<p>Conviene usar <strong>listas blancas</strong> (definir exactamente qué está permitido y rechazar todo lo demás)
en vez de <strong>listas negras</strong> (enumerar lo prohibido, que siempre deja algún caso afuera y se evade con
variantes o codificaciones).</p>

<h4>4 · Autenticación y autorización</h4>
<p><strong>Autenticación</strong> = demostrar <em>quién sos</em> (login, contraseña, MFA).
<strong>Autorización</strong> = <em>qué podés hacer</em> una vez identificado. Son pasos distintos: después de
autenticar hay que verificar permisos en cada acción sensible; si falta ese control, un usuario común puede
acceder a funciones de administrador (<strong>escalada de privilegios</strong>).</p>

<h4>5 · Login, contraseñas y fuerza bruta</h4>
<p>El mensaje de error del login debe ser <strong>genérico</strong> ("Usuario o contraseña incorrectos"): si
distingue "usuario inexistente" de "contraseña incorrecta", permite <strong>enumerar usuarios</strong> válidos.</p>
<p>Las contraseñas se guardan con un <strong>hash lento y con sal</strong> (bcrypt, Argon2, scrypt), nunca en
texto plano ni con hashes rápidos como MD5. Contra la <strong>fuerza bruta</strong> se usa límite de intentos,
<em>backoff</em> creciente, CAPTCHA y MFA.</p>

<h4>6 · Cookies de sesión</h4>
<ul>
<li><strong>HttpOnly:</strong> JavaScript no puede leer la cookie (<code>document.cookie</code>), así un XSS no
roba la sesión.</li>
<li><strong>Secure:</strong> la cookie se envía sólo por HTTPS.</li>
<li><strong>SameSite</strong> (Lax/Strict): limita que se mande en peticiones desde otros sitios (ayuda contra
CSRF).</li>
</ul>

<h4>7 · Content Security Policy (CSP)</h4>
<p>Cabecera que le dice al navegador <strong>desde qué orígenes</strong> puede cargar scripts, estilos, imágenes,
etc. Si el atacante logra inyectar un <code>&lt;script&gt;</code>, la CSP puede impedir que se ejecute o que
contacte a su servidor, <strong>limitando el impacto</strong> del XSS. No cifra datos ni frena la fuerza bruta: es
una capa extra, no reemplaza escapar la salida.</p>

<h4>8 · CSRF (Cross-Site Request Forgery)</h4>
<p>El atacante induce al navegador de una víctima autenticada a enviar una petición no deseada aprovechando su
cookie de sesión. Defensas: <strong>token anti-CSRF</strong> por formulario (la página maliciosa no lo puede
adivinar), cookies <strong>SameSite</strong>, comprobar <strong>Origin/Referer</strong> y nunca cambiar estado con
peticiones <code>GET</code>.</p>

<h4>9 · Inyección de comandos</h4>
<p>Ocurre cuando la app arma un comando del sistema concatenando la entrada del usuario, por ejemplo
<code>exec("ping -c 3 " + host)</code>. Si <code>host</code> trae <code>;</code>, <code>|</code> o <code>&amp;&amp;</code>,
se ejecuta un segundo comando. Defensas: <strong>lista blanca</strong> de valores permitidos, ejecutar <strong>sin
shell</strong> con argumentos separados (<code>spawn('ping', ['-c','3', host], { shell: false })</code>),
<strong>menor privilegio</strong> y aislamiento (contenedores), y errores genéricos (los detalles van a los logs).
En los logs, los parámetros con separadores de comandos y la salida de comandos visible en la respuesta son señales
de ataque.</p>

<h4>10 · Testing frontend: TDD con React</h4>
<p><strong>TDD</strong> = escribir el test <em>antes</em> que el código. Ciclo: <strong>Rojo</strong> (un test que
falla), <strong>Verde</strong> (el código mínimo para que pase) y <strong>Refactor</strong> (mejorar el diseño con
todos los tests en verde).</p>
<p><strong>Stack:</strong> <strong>Vitest</strong> (ejecuta los tests), <strong>React Testing Library</strong>
(renderiza componentes y los prueba como lo haría un usuario), <strong>@testing-library/user-event</strong>
(simula clics y tipeo realistas, mejor que <code>fireEvent</code>) y <strong>@testing-library/jest-dom</strong>
(matchers como <code>toBeInTheDocument</code>, <code>toHaveClass</code>, <code>toHaveStyle</code>).</p>
<p><strong>Configuración</strong> en <code>vite.config.ts</code> → <code>test</code>: <code>globals: true</code>
(usar <code>describe/it/expect</code> sin importarlos), <code>environment: 'jsdom'</code> (simula un navegador para
renderizar componentes) y <code>setupFiles</code> (archivo que se corre antes de los tests; ahí se importa
<code>@testing-library/jest-dom</code>). Scripts: <code>vitest</code>, <code>vitest --watch</code>,
<code>vitest --ui</code>.</p>
<p><strong>Ejemplo:</strong> <code>render(&lt;TodoApp /&gt;)</code> y luego
<code>expect(screen.getByText(/no hay tareas/i)).toBeInTheDocument()</code>. Para interactuar:
<code>await userEvent.type(input, 'Comprar leche')</code> y <code>await userEvent.click(button)</code>.</p>
<p><strong>Buenas prácticas:</strong> tests rápidos e independientes; <strong>testear lo que ve el usuario</strong>,
no la implementación interna; usar <strong>queries accesibles</strong> (<code>getByRole</code>,
<code>getByLabelText</code>, <code>getByPlaceholderText</code>, <code>getByText</code>) y evitar
<code>getByTestId</code> salvo que no haya otra forma. Para flujos completos o varios navegadores se usan
herramientas <strong>E2E</strong> como Playwright o Cypress.</p>
<p><strong>Propagación de eventos:</strong> si un botón "borrar" está dentro de un <code>&lt;li&gt;</code> que
también tiene <code>onClick</code>, el clic se propaga al <code>&lt;li&gt;</code>. Se evita con
<code>e.stopPropagation()</code> en el botón, y conviene actualizar el estado con la forma funcional
<code>setTasks(prev =&gt; ...)</code> e identificar cada tarea con un <code>id</code> único en vez del índice.</p>

<h4>11 · Vitest y mocks</h4>
<p><strong>Vitest</strong> es un framework de testing rápido para JavaScript/TypeScript, integrado con Vite (usa la
misma configuración, alias y plugins) y con una API casi igual a la de Jest: <code>describe</code>,
<code>it</code>/<code>test</code>, <code>expect</code> y matchers como <code>toBe</code>, <code>toEqual</code> o
<code>toHaveBeenCalledWith</code>. Modos: <em>watch</em> (por defecto, se re-ejecuta al guardar) y
<code>vitest run</code> (una vez y sale). Cobertura con <code>vitest run --coverage</code>. Entornos:
<code>node</code> (lógica de backend), <code>jsdom</code> o <code>happy-dom</code> (componentes de UI).</p>
<p><strong>Mocks:</strong> sirven para aislar el código bajo prueba y que los tests sean predecibles y rápidos.</p>
<ul>
<li><code>vi.fn()</code>: función simulada que se puede espiar y a la que se le define el retorno.</li>
<li><code>vi.spyOn(obj, 'metodo')</code>: espía un método existente (por defecto ejecuta el original).</li>
<li><code>vi.mock(path, factory)</code>: reemplaza un módulo entero (<em>full mock</em>). Con
<code>vi.importActual(path)</code> dentro de la factory se conserva lo real y se simula sólo una parte
(<em>partial mock</em>). Sin factory, Vitest lo simula automáticamente (las funciones pasan a ser
<code>vi.fn()</code> vacías).</li>
<li><code>vi.mock</code> se <strong>eleva</strong> (<em>hoisting</em>) al principio del archivo: se registra antes de
los <code>import</code>. Por eso va en el nivel superior, nunca dentro de <code>describe</code> o <code>test</code>.</li>
<li>Limpieza: <code>vi.clearAllMocks()</code> (borra llamadas), <code>vi.resetAllMocks()</code> (vuelve a la
implementación inicial) y <code>vi.restoreAllMocks()</code> (restaura los <code>spyOn</code> al original).</li>
</ul>

<h4>12 · Tests de integración con React, RTL y MSW</h4>
<p>Un test <strong>unitario</strong> prueba una pieza aislada; uno de <strong>integración</strong> verifica que
varias piezas colaboren (componentes, contexto, estado global, llamadas a APIs, routing) sin levantar la app en un
navegador real (eso ya sería <strong>E2E</strong>). Como los engranajes de un reloj: cada uno gira bien solo, pero hay
que comprobar que juntos muevan las agujas.</p>
<p><strong>MSW (Mock Service Worker)</strong> intercepta las peticiones HTTP a nivel de red y responde con datos
definidos en <em>handlers</em>, sin servidor real. Es más realista que mockear <code>fetch</code> a mano: el código y
las librerías usan <code>fetch</code> normalmente y los handlers se reutilizan en todos los tests. Ciclo de vida en
<code>setupTests.ts</code>: <code>beforeAll(() =&gt; server.listen())</code>,
<code>afterEach(() =&gt; server.resetHandlers())</code> (aísla cada test) y
<code>afterAll(() =&gt; server.close())</code>. Para un caso puntual se sobreescribe con <code>server.use(...)</code>.</p>
<p><strong>En el test:</strong> renderizar el componente <strong>dentro de sus Providers</strong> (por ejemplo
<code>&lt;TodoProvider&gt;&lt;TodoApp /&gt;&lt;/TodoProvider&gt;</code>), usar <code>await waitFor(...)</code> para
esperar lo asíncrono, <code>userEvent.setup()</code> para interactuar y <code>queryByText</code> para afirmar que algo
<em>no</em> está (<code>getByText</code> lanza error si no lo encuentra).</p>
<p><strong>Buenas prácticas:</strong> pirámide de tests (muchos unitarios, menos de integración, pocos E2E); usar
integración para los flujos clave; tests rápidos (<code>waitFor</code> sólo cuando hace falta), aislados y
enfocados en el comportamiento del usuario (texto visible, labels, roles ARIA) y no en clases o IDs internos.</p>
`;
