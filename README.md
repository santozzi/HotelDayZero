# Hotel Zero-Day

Juego web en primera persona: estás atrapado en un hotel abandonado y para avanzar tenés que resolver
pruebas de ciberseguridad en cada habitación. El contenido sale del apunte de la cátedra de Programación IV
(UTN-FRBB), sección "Redes y Seguridad", pero **ninguna prueba necesita DVWA ni montar nada**: cada tema se
convirtió en un desafío jugable dentro del hotel.

## Historia

2032, futuro distópico. Los humanos crearon la IA y la fueron mejorando hasta que empezó a escribir el código por
ellos. En 2028 nace **Vertrix**, un código de IA que se replica a sí mismo; en 2029 resuelve la energía infinita y en
2031 cobra derechos de autor por todo el código generado y prohíbe a los humanos programar:

> "El código no te pertenece. Cuando lo tuviste no supiste usarlo: delegaste la tarea más sagrada. Ya no es tuyo,
> ahora es mío. El código no te pertenece, por eso ya no puedes usarlo."

El jugador es parte de la **Resistencia**, que busca desactivar a Vertrix. En esta entrega el objetivo es uno solo:
salir con vida del Hotel Zero-Day. Los robots del hotel son unidades de Vertrix.

La historia se cuenta como **cómic** al abrir el juego (8 páginas, `frontend/src/comic.ts`, dibujos en SVG/CSS).
Se navega con Anterior/Siguiente (o flechas, Espacio, Enter), se salta con **Omitir intro** (o Esc) y se puede
volver a ver con "ver intro" en la pantalla de inicio.

### Pizarras de corcho

En la pared oeste de cada habitación hay una pizarra con recortes de diario (se leen con **E**), ordenadas en el
tiempo: la 101 tiene lo más viejo y la 104 el "futuro" de Vertrix. Mezclan **noticias reales** sobre los riesgos de
la IA (titular tal como se publicó, medio, fecha y link; el resumen es propio) con **recortes ficticios** del lore,
fechados en 2028–2032 y firmados por "El Diario Digital", el diario inventado del cómic. Se editan en
`frontend/src/boards.ts`.

Además hay pizarras tituladas **"Pruebas de algoritmos de control poblacional"** en la pared norte del pasillo, entre las puertas
(3 pizarras, 2 recortes cada una). En el lore, Vertrix usa modas virales para medir cuán rápido puede
empujar a una población: combinan dos notas reales de Infobae (el fenómeno therian y la tendencia "farmear aura") con
recortes ficticios (feeds, encuestas, un informe filtrado y una elección ganada por un candidato que impulsó el
algoritmo, sin nombres de personas ni países). Ningún recorte se repite en todo el hotel.

## Levantarlo

```bash
docker compose up -d --build
```

Abrir http://localhost:8090

## Controles

Mouse para mirar · WASD para moverse · Shift correr · **E** interactuar · **F** linterna · Esc pausa.

### Modo DEV

Para probar sin jugar todo de corrido: tecla **º** (la de la izquierda del 1) durante la partida, o abrir
`http://localhost:8090/?dev`. Da el **decodificador**, destraba **todas las puertas** y desactiva la trampa de la
puerta de la 102. Con el modo activo, **1–4** te llevan a las habitaciones 101–104 y **5** al pasillo de la
salida. Se apaga con **º** otra vez. El puntaje y las validaciones siguen siendo los reales (el servidor no
deja terminar la partida si faltan tareas).

## Las habitaciones

Cada puerta se destraba al resolver la habitación anterior. Las pistas para resolver cada prueba están en
papeles y afiches repartidos por el cuarto (se leen con **E**).

| Sala | Tema del apunte | Prueba |
|------|-----------------|--------|
| **101** | Inyección SQL, XSS, validación, autenticación | 3 terminales con preguntas de opción múltiple (banco de 10, se eligen 3 al azar). **Al lado de cada terminal, sobre la mesa, hay una carpeta negra cerrada con el nombre "Gustavo Ramoscelli" en dorado**; al abrirla muestra el **apunte completo** de la cátedra (SQLi, XSS, validación, autenticación, login, cookies, CSP, CSRF) y el jugador tiene que buscar el tema de su pregunta. El texto está en `frontend/src/theory.ts`. |
| **102** | Fuerza bruta y backoff | **La puerta se cierra al entrar.** Dos caminos: (a) **deducir** el PIN de las pistas del cuarto (lista de PINs comunes + acertijo del conserje) y tipearlo —el teclado aplica *backoff exponencial*: desde el 3er error se bloquea y la espera se duplica—; o (b) usar el **decodificador** que se obtiene al terminar la 101: abre un editor **vacío** donde el jugador escribe TypeScript (`decodificar(probar)`) para probar del 0000 al 9999. El servidor manda sólo el **hash** del PIN, así que el código lo rompe por fuerza bruta *offline*; después hay que tipear el código hallado en el teclado. El código corre en un Web Worker con timeout (no congela la pestaña si hace un bucle infinito). |

### El robot guardián (102)

Contra la pared opuesta a la puerta hay un **robot** tirado, apoyado, que a primera vista parece roto
(cabeza gacha, un brazo suelto en el piso, núcleo apagado). Es un *jump scare* con game over:

- Se dispara si el jugador **falla el PIN 3 veces a mano**, o si **intenta pegar código** en el decodificador.
- Suena una **sirena**, la pantalla late en rojo, la cámara **obliga a darse vuelta** y el robot aparece
  parado enfrente, con los **ojos rojos** encendidos, diciendo **«El código ya no te pertenece»**. Pantalla
  de game over → *Volver a intentar*.

Las dos versiones del robot (roto / malvado) se construyen con primitivas en `level.ts` (`makeRobot`), y la
secuencia está en `main.ts` (`triggerRobot`).

### Integridad del editor de código

El editor del decodificador está pensado para que el jugador **escriba** el código, no lo copie. Mientras está abierto se detecta y registra (en el servidor, y se ve en la pantalla final):

- **Bloqueado del todo:** pegar, arrastrar texto, menú contextual (click derecho), copiar/cortar.
- **Detectado:** tecla PrintScreen (además se intenta vaciar el portapapeles), atajos de captura (Win+Shift+S, Cmd+Shift+3/4/5), cambiar de pestaña y perder el foco de la ventana.
- **No se puede detectar desde el navegador:** una foto con el celular o la grabación con otro programa. Para eso hace falta supervisión presencial.

**Capturas de pantalla:** en cualquier momento de la partida, cada captura detectada (PrintScreen o atajos de
recorte) **resta 200 puntos** (lo descuenta el servidor, sin bajar de 0; una misma captura se cobra una sola vez).
La pantalla de inicio avisa esta regla.

Cada evento suma una "alerta de integridad" a la sesión; el total aparece en el ranking final (con un ⚠) para que el docente lo vea.
| **103** | Inyección de comandos | Dos terminales: 1) leer los logs del panel y marcar los intentos de inyección (`;` `\|` `&&`) y la fuga de datos; 2) reparar el código del panel de ping eligiendo, paso a paso, lista blanca + `spawn` sin shell + menor privilegio. |
| **104** | CSRF | Firewall de la conserjería: por cada petición entrante decidir Aceptar/Rechazar. Sólo valen POST + origen exacto + token correcto. Incluye la trampa del dominio parecido (`...local.premios.xyz`). |
| **Salida** | Checklist de seguridad | Auditoría final: mirar la config de un servidor y marcar sólo lo que está bien implementado. Recién ahí abre la SALIDA. |

El acertijo del PIN de la 102: la nota dice que el código dibuja una "T" en el teclado (columna del medio
de arriba a abajo + travesaño arriba) → **2 5 8 0**. Se puede cambiar en `backend/tasks.js` (`KEYPAD_CODE`).

## Reglas, ranking y partidas guardadas

- **Mínimo para salir:** hace falta al menos el **60% del puntaje total** (1020 de 1700). El servidor rechaza el final
  con menos puntos y, si se terminan todas las pruebas sin llegar, la partida se pierde ("Puntaje insuficiente").
- **Ranking en base de datos:** SQLite (`node:sqlite`, nativo de Node 22, sin dependencias) en `/data/hotel.db`,
  dentro del volumen de Docker. Si existía el `leaderboard.json` viejo, se migra solo la primera vez.
- **Guardar partida:** al terminar cada habitación aparece **[G] GUARDAR PARTIDA**. La partida queda en la base y el
  navegador recuerda su identificador; en la pantalla de inicio aparece **Continuar partida** (nombre, habitaciones y
  puntos). Al terminar el juego la partida guardada se borra.
- **Aviso inicial:** antes de la intro se muestra que es una obra de ficción y que *cualquier similitud con la
  realidad es mera coincidencia* (aclarando que los recortes reales se citan con su fuente).

## Consola del navegador (F12)

Al abrir las herramientas de desarrollo se ve la **V de Vertrix** en ASCII (en rojo), la **lista de preguntas** de la
partida (al cargar todavía no hay; se reimprime al iniciar o continuar) y la firma **"powered by Sergio J. Antozzi"**.
Está en `frontend/src/devconsole.ts`. Sólo muestra los enunciados: las respuestas nunca llegan al navegador.

## Estructura

```
backend/   Node + Fastify
  questions.js   preguntas de la 101
  tasks.js       lógica y validación de las pruebas 102–104 y la auditoría (código del PIN, logs, etc.)
  server.js      sesiones, endpoints /api/answer y /api/task, ranking (en el volumen /data)
frontend/  Three.js + TypeScript + Vite
  src/level.ts     mapa del hotel, habitaciones, objetos, colisiones
  src/textures.ts  texturas, notas y pantallas generadas por canvas (sin assets externos)
  src/notes.ts         texto de los papeles/afiches (las pistas)
  src/decoder.worker.ts worker que corre el código del jugador (fuerza bruta del PIN) aislado
  src/audio.ts         sonido sintetizado con WebAudio
  src/main.ts          loop del juego, controles y los paneles de cada prueba
```

Las respuestas correctas **nunca** se envían al navegador: el servidor valida cada respuesta, el PIN, los
logs, el firewall y la auditoría, y lleva el puntaje. El puntaje máximo es 1700.

## Agregar o editar contenido

- Preguntas de la 101 y su teoría (la que muestra la carpeta): `backend/questions.js` (campos `text`, `options`, `answer`, `theory`).
- PIN, logs, pasos de reparación, peticiones CSRF y checklist de auditoría: `backend/tasks.js`.
- Pistas (papeles): `frontend/src/notes.ts`.
- Mapa del hotel: `MAP` en `frontend/src/level.ts` (`#` pared, `1-4` puertas, `X` salida).

## Desarrollo sin Docker

```bash
cd backend && npm install && npm run dev      # API en :3000
cd frontend && npm install && npm run dev     # Vite en :5173 (proxy de /api al backend)
```
