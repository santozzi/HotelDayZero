// Easter egg: lo que se ve al abrir la consola del navegador (F12).
// La V de Vertrix, la lista de preguntas de la partida y la firma del autor.

// V de Vertrix con el ojo rojo adentro, como el emblema del cómic.
// Cada línea es [izquierda, ojo, derecha]: el ojo se pinta en rojo y el resto en gris metálico.
const V_ART: [string, string, string][] = [
  ['██╗               ██╗', '', ''],
  ['╚██╗    ', '▄███▄', '    ██╔╝'],
  [' ╚██╗   ', '█████', '   ██╔╝'],
  ['  ╚██╗  ', '▀███▀', '  ██╔╝'],
  ['   ╚██╗       ██╔╝', '', ''],
  ['    ╚██╗     ██╔╝', '', ''],
  ['     ╚██╗   ██╔╝', '', ''],
  ['      ╚██╗ ██╔╝', '', ''],
  ['       ╚████╔╝', '', ''],
  ['        ╚═══╝', '', ''],
];

const ART = 'font-family:monospace;font-size:14px;line-height:1.1;font-weight:bold;';
const METAL = ART + 'color:#b8bcc4;text-shadow:0 0 2px rgba(0,0,0,.6)';
const EYE = ART + 'color:#ff1a08;text-shadow:0 0 8px rgba(255,26,8,.9)';

function printV() {
  let fmt = '';
  const styles: string[] = [];
  for (const [left, eye, right] of V_ART) {
    fmt += `%c${left}`;
    styles.push(METAL);
    if (eye) {
      fmt += `%c${eye}%c${right}`;
      styles.push(EYE, METAL);
    }
    fmt += '\n';
  }
  console.log(fmt, ...styles);
}

const TITLE = 'color:#ff1a08;font-weight:bold;font-size:16px;letter-spacing:4px';
const DIM = 'color:#9a8f7a;font-style:italic';
const Q = 'color:#d8d2c4';
const SIGN = 'color:#d4af37;font-weight:bold;font-size:13px;letter-spacing:1px';

export function printDevConsole(questions?: { text: string }[]) {
  console.clear();
  printV();
  console.log('%cV E R T R I X', TITLE);
  console.log('%c"El código no te pertenece."', DIM);
  console.log('');
  if (questions?.length) {
    console.log('%cPREGUNTAS DE ESTA PARTIDA', 'color:#5dff7a;font-weight:bold');
    questions.forEach((q, i) => console.log(`%c${i + 1}. ${q.text}`, Q));
  } else {
    console.log('%cLas preguntas aparecen cuando empieza la partida.', DIM);
  }
  console.log('');
  console.log('%cpowered by Sergio J. Antozzi', SIGN);
}
