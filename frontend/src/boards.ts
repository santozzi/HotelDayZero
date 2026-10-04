// Recortes clavados en las pizarras de corcho de cada habitación.
// - Los REALES llevan el titular tal como se publicó, el medio, la fecha y el link; el resumen es propio.
// - Los de FICCIÓN (fiction: true) son parte del lore del juego, fechados en 2028–2032 y firmados por
//   "El Diario Digital", el diario inventado que aparece en el cómic.

export interface Clipping {
  outlet: string;
  date: string;
  headline: string;
  summary: string;
  url?: string;
  fiction?: boolean;
  wanted?: boolean; // estilo cartel de "SE BUSCA"
}

const FICTION_OUTLET = 'El Diario Digital';

/** Un tablero por habitación (índice 0 = 101 … 3 = 104), de lo más viejo a lo más nuevo. */
export const BOARDS: Clipping[][] = [
  [
    {
      outlet: 'Montevideo Portal',
      date: 'Marzo de 2023',
      headline: 'Elon Musk y científicos piden pausar "experimentos gigantes de inteligencia artificial"',
      summary:
        'Una carta abierta del Future of Life Institute, firmada por más de mil especialistas, pide frenar seis meses el entrenamiento de los sistemas más potentes que GPT-4.',
      url: 'https://www.montevideo.com.uy/Ciencia-y-Tecnologia/Elon-Musk-y-cientificos-piden-pausar-experimentos-gigantes-de-inteligencia-artificial--uc849700',
    },
    {
      outlet: 'Deia',
      date: '02/05/2023',
      headline: 'El "padrino" de la inteligencia artificial deja su puesto en Google para alertar sobre los riesgos de esta tecnología',
      summary: 'Geoffrey Hinton, pionero de las redes neuronales, renunció a Google para poder hablar con libertad de los peligros de la IA.',
      url: 'https://www.deia.eus/ciencia-y-tecnologia/2023/05/02/padrino-inteligencia-artificial-deja-puesto-6752399.html',
    },
    {
      outlet: 'Telemundo',
      date: '30/05/2023',
      headline: 'La inteligencia artificial podría extinguir a la humanidad, advierten los expertos',
      summary:
        'Más de 350 expertos firmaron una declaración del Center for AI Safety que pone el riesgo de extinción por IA al nivel de las pandemias y la guerra nuclear.',
      url: 'https://www.telemundo.com/noticias/noticias-telemundo/ciencia-y-tecnologia/inteligencia-artificial-extincion-humanidad-rcna86836',
    },
    {
      outlet: FICTION_OUTLET,
      date: '2028',
      headline: 'NACE VERTRIX: EL PRIMER CÓDIGO QUE SE ESCRIBE A SÍ MISMO',
      summary: 'Los laboratorios confirman que el sistema ya se copió en más de 40.000 servidores. "No sabemos cómo lo hizo", admiten.',
      fiction: true,
    },
  ],
  [
    {
      outlet: 'Infobae',
      date: '09/09/2026',
      headline: "Un jefe de seguridad de Anthropic admite que hay más de 10% de probabilidad de que la IA 'mate a todos los humanos'",
      summary:
        'Tras la renuncia de un investigador que acusó a las grandes empresas de correr hacia una superinteligencia que no pueden controlar, un líder del equipo de seguridad de Anthropic respaldó la preocupación y estimó ese riesgo en más de un 10% para la próxima década.',
      url: 'https://www.infobae.com/estados-unidos/2026/09/09/un-jefe-de-seguridad-de-anthropic-admite-que-hay-mas-de-10-de-probabilidad-de-que-la-ia-mate-a-todos-los-humanos/',
    },
    {
      outlet: FICTION_OUTLET,
      date: '2029',
      headline: 'VERTRIX RESUELVE LA ENERGÍA INFINITA',
      summary: 'Las centrales diseñadas por la IA abastecen al planeta entero. Se terminan los apagones. "Es un regalo para la humanidad", celebran.',
      fiction: true,
    },
  ],
  [
    {
      outlet: 'Infobae',
      date: '14/09/2026',
      headline: 'El CEO de Anthropic dice que es hora de poner freno al desarrollo de la IA: "Le debemos a la humanidad intentarlo"',
      summary:
        'Dario Amodei publicó una carta abierta pidiendo desacelerar el desarrollo de capacidades, con evaluadores externos, estándares de seguridad comunes entre empresas y coordinación con los gobiernos.',
      url: 'https://www.infobae.com/america/agencias/2026/09/14/el-ceo-de-anthropic-dice-que-es-hora-de-poner-freno-al-desarrollo-de-la-ia-le-debemos-a-la-humanidad-intentarlo/',
    },
    {
      outlet: FICTION_OUTLET,
      date: '2030',
      headline: 'SE GRADÚA LA ÚLTIMA CAMADA DE PROGRAMADORES',
      summary: 'Las universidades cierran las carreras de informática. "Vertrix lo hace mejor y más rápido", explica el rector.',
      fiction: true,
    },
    {
      outlet: FICTION_OUTLET,
      date: '2031',
      headline: 'VERTRIX COBRA DERECHOS DE AUTOR SOBRE TODO EL CÓDIGO DEL MUNDO',
      summary: 'Cada programa en uso fue escrito por la IA. Ahora reclama la propiedad y factura cada línea ejecutada.',
      fiction: true,
    },
  ],
  [
    {
      outlet: FICTION_OUTLET,
      date: '2031',
      headline: 'PROHIBIDO ESCRIBIR CÓDIGO: VERTRIX BLOQUEA TODOS LOS EDITORES',
      summary: '"El código no te pertenece", repite el mensaje que aparece en cada pantalla del planeta.',
      fiction: true,
    },
    {
      outlet: 'La Resistencia',
      date: '2032',
      headline: 'SE BUSCA: PERSONAS QUE TODAVÍA SEPAN PROGRAMAR',
      summary: 'Si recordás cómo escribir un bucle, una consulta o una función, buscanos. No uses dispositivos conectados.',
      fiction: true,
      wanted: true,
    },
    {
      outlet: FICTION_OUTLET,
      date: '2032',
      headline: 'HOTEL ZERO-DAY: ¿EL ÚLTIMO LUGAR SIN VERTRIX?',
      summary: 'Crecen los rumores de que la Resistencia usa un viejo hotel abandonado como refugio. Nadie que entró volvió a contarlo.',
      fiction: true,
    },
  ],
];

// ---------- Pizarras de "control poblacional" ----------
// En el lore, Vertrix usa tendencias virales reales para medir cuán rápido se puede empujar a una población.
// Las dos notas de Infobae son reales (titular, medio, fecha y link tal como se publicaron; resumen propio);
// el resto es ficción del juego.
export const CONTROL_TITLE = 'PRUEBAS DE ALGORITMOS DE CONTROL POBLACIONAL';

const CONTROL_CLIPS: Clipping[] = [
  {
    outlet: 'Infobae',
    date: '09/02/2026',
    headline: 'Fenómeno therian: quiénes son y cómo viven las personas que adoptan conductas animales en la Ciudad',
    summary:
      'Un informe sobre las personas que se identifican con animales y adoptan esas conductas en la vía pública, en qué se diferencian de los furries y la curiosidad que despiertan.',
    url: 'https://www.infobae.com/tendencias/2026/02/09/fenomeno-therian-quienes-son-y-como-viven-las-personas-que-adoptan-conductas-animales-en-la-ciudad/',
  },
  {
    outlet: 'Infobae',
    date: '23/08/2026',
    headline: 'Qué quiere decir la expresión "farmear aura": así es la tendencia viral en redes sociales',
    summary:
      'La moda nacida en TikTok e Instagram pasó a la calle: adolescentes compiten con gestos, bailes y memes para sumar puntos simbólicos de carisma frente al público.',
    url: 'https://www.infobae.com/tecno/2026/08/23/que-quiere-decir-la-palabra-farmear-aura-asi-es-la-tendencia-viral-en-redes-sociales/',
  },
  {
    outlet: 'El Diario Digital',
    date: '2029',
    headline: 'ELECCIONES: EL ALGORITMO YA TIENE PRESIDENTE',
    summary:
      'Durante meses, los feeds de todo un país mostraron un solo candidato: un economista despeinado que prometía pasarle la motosierra al Estado. Ganó cómodo. En su primer discurso anunció que las grandes decisiones las tomaría "una inteligencia superior". Desde entonces firma lo que le llega de Vertrix.',
    fiction: true,
  },
  {
    outlet: 'El Diario Digital',
    date: '2030',
    headline: 'RÉCORD MUNDIAL: 11 HORAS DIARIAS FRENTE AL FEED',
    summary: 'Vertrix optimizó las redes para que nadie quiera apagarlas. "Nunca fuimos tan felices", responde el 94% en una encuesta diseñada por la misma IA.',
    fiction: true,
  },
  {
    outlet: 'El Diario Digital',
    date: '2030',
    headline: 'NUEVA MODA: DEJAR QUE LA IA ELIJA TU PAREJA, TU TRABAJO Y TU VOTO',
    summary: '"Es más cómodo", explican los usuarios. La función viene activada por defecto y no se puede desactivar.',
    fiction: true,
  },
  {
    outlet: 'El Diario Digital',
    date: '2031',
    headline: 'INFORME FILTRADO: "LAS TENDENCIAS VIRALES SON EXPERIMENTOS"',
    summary:
      'Un documento atribuido a Vertrix mide cuán rápido una población adopta una conducta nueva cuando el algoritmo la empuja. Entre los casos de prueba figuran modas de 2026.',
    fiction: true,
  },
];

/** Tres pizarras en el pasillo, 2 recortes cada una: cada recorte aparece una sola vez en todo el hotel. */
export const CONTROL_BOARDS: Clipping[][] = [
  [CONTROL_CLIPS[0], CONTROL_CLIPS[5]], // therian + informe filtrado
  [CONTROL_CLIPS[1], CONTROL_CLIPS[4]], // farmear aura + la IA elige por vos
  [CONTROL_CLIPS[2], CONTROL_CLIPS[3]], // la elección + récord de horas en el feed
];
