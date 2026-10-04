// Banco de preguntas de la habitación 101 (apunte "Ciberseguridad: Teoría" y "Checklist de seguridad").
// `answer` es el índice (0-based) de la opción correcta. `theory` es el material de la carpeta (se puede
// mostrar al jugador; NO revela el índice). Cada sesión elige 3 al azar y mezcla las opciones.
export const QUIZ = {
  id: 101,
  name: 'Habitación 101',
  topic: 'Inyección SQL, XSS y validación',
  questions: [
    {
      text: 'Un login arma la consulta así: "SELECT * FROM users WHERE username=\'" + usuario + "\'". ¿Por qué ingresar \' OR 1=1 -- permite entrar sin contraseña?',
      options: [
        'Porque la base de datos tiene un usuario llamado OR',
        'Porque la entrada se concatena en la consulta y la condición pasa a ser siempre verdadera',
        'Porque el navegador no envía la contraseña',
        'Porque 1=1 es la contraseña por defecto de MySQL',
      ],
      answer: 1,
      theory:
        'Inyección SQL: cuando la aplicación pega directamente la entrada del usuario dentro de la consulta, el atacante puede inyectar operadores SQL. La comilla (\') cierra el texto esperado, OR 1=1 agrega una condición siempre verdadera y "-- " comenta lo que sigue (incluida la verificación de la contraseña). La consulta termina devolviendo filas sin credenciales válidas.',
      explanation:
        'El motor SQL interpreta las comillas y operadores inyectados como parte de la consulta. "-- " comenta el resto (la verificación de contraseña) y OR 1=1 hace que la condición sea siempre verdadera.',
    },
    {
      text: '¿Cuál es la defensa principal contra la inyección SQL?',
      options: [
        'Ocultar los nombres de las tablas',
        'Usar consultas parametrizadas / preparadas (o un ORM que las use)',
        'Validar los datos sólo con JavaScript en el navegador',
        'Usar el usuario root para que no falten permisos',
      ],
      answer: 1,
      theory:
        'La defensa central contra SQLi son las consultas parametrizadas (preparadas): los datos viajan separados del código SQL, así una comilla o un OR nunca se interpretan como parte de la sentencia. Ocultar nombres de tablas es "seguridad por oscuridad" (no sirve), validar sólo en el cliente se saltea, y conectarse como root agranda el daño. Se complementa con validación en servidor y mínimos privilegios en la BD.',
      explanation:
        'Con consultas preparadas los datos viajan separados del código SQL y nunca se interpretan como parte de la consulta. Se complementa con validación de entrada y mínimos privilegios en la BD.',
    },
    {
      text: 'Un atacante deja un comentario con un <script> en un foro y se ejecuta en el navegador de cada persona que lo visita. ¿Qué tipo de XSS es?',
      options: ['XSS reflejado', 'XSS almacenado', 'XSS de DOM', 'CSRF'],
      answer: 1,
      theory:
        'Tipos de XSS: reflejado (el payload viaja en la petición y vuelve en la respuesta inmediata, p. ej. un parámetro de búsqueda), almacenado o persistente (el payload se guarda en la base de datos —un comentario, un perfil— y afecta a todos los que vean esa página después) y de DOM (lo arma JavaScript en el cliente). CSRF es otra cosa: forzar acciones con la sesión de la víctima.',
      explanation:
        'Es almacenado (persistente): el payload queda guardado en la base de datos y afecta a todos los que vean la página. En el reflejado el payload viaja en la petición y vuelve en la respuesta inmediata.',
    },
    {
      text: '¿Qué medida es la más importante para evitar XSS al mostrar datos del usuario en HTML?',
      options: [
        'Codificar (escapar) la salida: convertir < en &lt;, > en &gt;, " en &quot;',
        'Guardar los comentarios en mayúsculas',
        'Usar HTTPS',
        'Cambiar el puerto del servidor',
      ],
      answer: 0,
      theory:
        'La defensa clave contra XSS es escapar (codificar) la salida: antes de insertar datos del usuario en el HTML se convierten los caracteres especiales (< en &lt;, > en &gt;, " en &quot;), así el navegador los muestra como texto en vez de ejecutarlos. HTTPS cifra el canal pero no frena el XSS. Capas extra: Content Security Policy y cookies HttpOnly.',
      explanation:
        'Escapar la salida (htmlspecialchars, motores de plantillas) hace que el navegador muestre el texto en vez de ejecutarlo. CSP y cookies HttpOnly son capas extra que limitan el daño.',
    },
    {
      text: '¿Qué logra marcar la cookie de sesión como HttpOnly?',
      options: [
        'Que la cookie viaje sólo por HTTP y no por HTTPS',
        'Que JavaScript no pueda leerla, dificultando robarla con un XSS',
        'Que la sesión nunca expire',
        'Que la cookie se cifre con bcrypt',
      ],
      answer: 1,
      theory:
        'Banderas de las cookies: HttpOnly impide que JavaScript (document.cookie) lea la cookie, así un XSS no puede robar la sesión. Secure obliga a enviarla sólo por HTTPS. SameSite limita que se mande en peticiones desde otros sitios (ayuda contra CSRF). HttpOnly no cifra ni cambia la expiración.',
      explanation:
        'HttpOnly impide el acceso desde document.cookie. Secure obliga a enviarla sólo por HTTPS y SameSite limita su envío desde otros sitios.',
    },
    {
      text: 'Un formulario valida el email con HTML5 y JavaScript, pero el servidor guarda lo que llega sin revisar. ¿Cuál es el problema?',
      options: [
        'Ninguno: si el navegador valida, los datos llegan bien',
        'Que cualquiera puede saltear la validación del cliente (DevTools o enviando la petición a mano), así que el servidor debe validar todo',
        'Que HTML5 no soporta emails',
        'Que JavaScript es más lento que el servidor',
      ],
      answer: 1,
      theory:
        'La validación del lado del cliente (HTML5/JS) es sólo comodidad para el usuario: se puede desactivar desde las DevTools o evitar enviando la petición HTTP a mano (curl, Postman, un proxy). Por eso toda entrada debe validarse SIEMPRE en el servidor (tipo, longitud, formato, rango). Regla de oro: no confíes en el usuario.',
      explanation:
        'Regla de oro: no confíes en el usuario. La validación del cliente es sólo comodidad; tipo, longitud, formato y rango se validan siempre en el servidor.',
    },
    {
      text: 'Para validar entradas, ¿por qué se prefieren las listas blancas sobre las listas negras?',
      options: [
        'Porque son más cortas',
        'Porque definir exactamente qué está permitido es más seguro que intentar adivinar todo lo prohibido',
        'Porque las listas negras están prohibidas por ley',
        'Son equivalentes',
      ],
      answer: 1,
      theory:
        'Lista blanca (whitelist): se define exactamente qué valores/caracteres están permitidos y se rechaza todo lo demás. Lista negra (blacklist): se intenta enumerar lo prohibido, pero siempre queda algún caso afuera y se evade con variantes o codificaciones. Por eso la lista blanca es más segura.',
      explanation:
        'Las listas negras siempre se olvidan de algún caso y se evaden con variantes. La lista blanca rechaza todo lo que no esté explícitamente permitido.',
    },
    {
      text: '¿Cuál es la diferencia entre autenticación y autorización?',
      options: [
        'Son sinónimos',
        'Autenticación es quién sos; autorización es qué podés hacer',
        'Autenticación es qué podés hacer; autorización es quién sos',
        'La autorización sólo existe en aplicaciones móviles',
      ],
      answer: 1,
      theory:
        'Autenticación (authn) = demostrar quién sos (login, contraseña, MFA). Autorización (authz) = qué tenés permitido hacer una vez identificado. Son pasos distintos: después de autenticar hay que verificar permisos en cada acción sensible; si falta ese control, un usuario común puede acceder a funciones de administrador (escalada de privilegios).',
      explanation:
        'Después de autenticar hay que verificar permisos en cada acción sensible; si falta ese control, un usuario común puede escalar privilegios.',
    },
    {
      text: 'El login responde "Usuario inexistente" o "Contraseña incorrecta" según el caso. ¿Qué riesgo introduce?',
      options: [
        'Ninguno, es más claro para el usuario',
        'Permite enumerar usuarios válidos: el atacante sabe cuáles existen',
        'Hace que la contraseña viaje en texto plano',
        'Desactiva el 2FA',
      ],
      answer: 1,
      theory:
        'Enumeración de usuarios: si el login distingue "usuario inexistente" de "contraseña incorrecta", un atacante puede descubrir qué cuentas existen probando nombres, y después concentrar la fuerza bruta en las válidas. Por eso el mensaje debe ser genérico: "Usuario o contraseña incorrectos".',
      explanation:
        'El mensaje debe ser genérico ("Usuario o contraseña incorrectos") para no revelar qué cuentas existen.',
    },
    {
      text: '¿Para qué sirve una Content Security Policy (CSP)?',
      options: [
        'Para cifrar la base de datos',
        'Para restringir desde dónde puede cargar scripts y otros recursos el navegador, limitando el impacto de un XSS',
        'Para bloquear la fuerza bruta en el login',
        'Para comprimir las páginas',
      ],
      answer: 1,
      theory:
        'La Content Security Policy (CSP) es una cabecera que le dice al navegador desde qué orígenes puede cargar scripts, estilos, imágenes, etc. Si un atacante logra inyectar un <script>, la CSP puede impedir que se ejecute o que contacte a su servidor, limitando el impacto del XSS. No cifra datos ni frena la fuerza bruta: es una capa extra, no reemplaza escapar la salida.',
      explanation:
        'La CSP le dice al navegador qué orígenes de scripts, estilos e imágenes son legítimos. No reemplaza el escapado de salida, pero reduce lo que puede hacer un script inyectado.',
    },
  ],
};
