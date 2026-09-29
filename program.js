'use strict';

/* =========================================================
   Prog Muscu — contenu du programme
   Matériel : haltères, banc de musculation, poids du corps
   + course à pied.
   Niveaux : 0 = Débutant, 1 = Intermédiaire, 2 = Avancé
   ========================================================= */

const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé'];

const EQUIP = {
  db: { label: 'Haltères', cls: 'db' },
  bench: { label: 'Banc', cls: 'bench' },
  bw: { label: 'Poids du corps', cls: 'bw' },
  run: { label: 'Course', cls: 'run' },
};

/* ---------------- Exercices ---------------- */
// equip : matériel utilisé · weighted : on note une charge (kg) · timed : exercice en secondes

const EXERCISES = {
  /* ----- Pectoraux ----- */
  dc_halteres: {
    name: 'Développé couché haltères', equip: ['db', 'bench'], muscles: 'Pectoraux, triceps, épaules', weighted: true,
    how: [
      'Allongé sur le banc, pieds bien à plat au sol, omoplates serrées.',
      'Haltères au-dessus de la poitrine, bras tendus, paumes vers les pieds.',
      'Descends lentement les haltères sur les côtés de la poitrine (coudes à ~45° du corps).',
      'Pousse fort pour remonter en rapprochant légèrement les haltères.',
    ],
    tips: 'Ne décolle pas les fesses du banc. Descente en 2-3 secondes.',
  },
  dc_incline: {
    name: 'Développé incliné haltères', equip: ['db', 'bench'], muscles: 'Haut des pectoraux, épaules', weighted: true,
    how: [
      'Règle le dossier du banc à 30-45°.',
      'Haltères à hauteur des épaules, paumes vers l’avant.',
      'Pousse vers le haut jusqu’à bras presque tendus, puis redescends contrôlé.',
    ],
    tips: 'Un angle trop haut sollicite surtout les épaules : reste vers 30°.',
  },
  ecarte: {
    name: 'Écarté couché haltères', equip: ['db', 'bench'], muscles: 'Pectoraux', weighted: true,
    how: [
      'Allongé sur le banc, haltères au-dessus de la poitrine, paumes face à face.',
      'Coudes légèrement fléchis, ouvre les bras en arc de cercle jusqu’à sentir l’étirement.',
      'Referme les bras en « serrant » les pectoraux.',
    ],
    tips: 'Charge légère, mouvement lent. Les coudes restent fixes.',
  },
  pompes: {
    name: 'Pompes', equip: ['bw'], muscles: 'Pectoraux, triceps, gainage',
    how: [
      'Mains un peu plus larges que les épaules, corps bien aligné.',
      'Descends la poitrine près du sol en gardant les coudes à ~45°.',
      'Pousse pour remonter sans creuser le dos.',
    ],
    tips: 'Trop dur ? Fais-les sur les genoux ou les mains sur le banc. Trop facile ? Pieds sur le banc.',
  },
  /* ----- Épaules ----- */
  dev_epaules: {
    name: 'Développé épaules assis', equip: ['db', 'bench'], muscles: 'Épaules, triceps', weighted: true,
    how: [
      'Assis sur le banc, dossier vertical, dos bien calé.',
      'Haltères à hauteur des oreilles, paumes vers l’avant.',
      'Pousse au-dessus de la tête sans cogner les haltères, puis redescends.',
    ],
    tips: 'Serre les abdos pour ne pas cambrer.',
  },
  elev_lat: {
    name: 'Élévations latérales', equip: ['db'], muscles: 'Épaules (faisceau moyen)', weighted: true,
    how: [
      'Debout, haltères le long du corps, léger fléchissement des coudes.',
      'Monte les bras sur les côtés jusqu’à hauteur des épaules.',
      'Redescends lentement.',
    ],
    tips: 'Pas d’élan : prends plus léger et contrôle.',
  },
  oiseau: {
    name: 'Oiseau (buste penché)', equip: ['db'], muscles: 'Arrière des épaules, haut du dos', weighted: true,
    how: [
      'Buste penché vers l’avant (ou assis au bout du banc, poitrine sur les cuisses).',
      'Bras pendants, coudes légèrement fléchis.',
      'Ouvre les bras sur les côtés en serrant les omoplates.',
    ],
    tips: 'Charge légère, 1 seconde de pause en haut.',
  },
  arnold: {
    name: 'Développé Arnold', equip: ['db', 'bench'], muscles: 'Épaules complètes', weighted: true,
    how: [
      'Assis, haltères devant le visage, paumes vers toi.',
      'En poussant vers le haut, tourne les poignets pour finir paumes vers l’avant.',
      'Fais le chemin inverse en redescendant.',
    ],
    tips: 'Mouvement fluide et continu.',
  },
  shrug: {
    name: 'Shrugs haltères', equip: ['db'], muscles: 'Trapèzes', weighted: true,
    how: ['Debout, haltères lourds le long du corps.', 'Monte les épaules vers les oreilles, tiens 1 seconde, relâche.'],
    tips: 'Ne roule pas les épaules, monte et descends tout droit.',
  },
  /* ----- Triceps ----- */
  ext_triceps: {
    name: 'Extension triceps couché', equip: ['db', 'bench'], muscles: 'Triceps', weighted: true,
    how: [
      'Allongé sur le banc, un haltère dans chaque main, bras tendus au-dessus de la poitrine.',
      'Plie uniquement les coudes pour amener les haltères près des tempes.',
      'Tends les bras pour remonter.',
    ],
    tips: 'Les coudes restent pointés vers le plafond.',
  },
  dips_banc: {
    name: 'Dips sur banc', equip: ['bench', 'bw'], muscles: 'Triceps, pectoraux',
    how: [
      'Mains sur le bord du banc derrière toi, jambes devant.',
      'Plie les coudes pour descendre les fesses vers le sol (coudes vers l’arrière).',
      'Pousse pour remonter.',
    ],
    tips: 'Jambes pliées = plus facile, jambes tendues = plus dur.',
  },
  kickback: {
    name: 'Kickback triceps', equip: ['db', 'bench'], muscles: 'Triceps', weighted: true,
    how: [
      'Un genou et une main sur le banc, dos plat.',
      'Coude collé au corps, bras à 90°.',
      'Tends l’avant-bras vers l’arrière, serre le triceps, reviens.',
    ],
    tips: 'Seul l’avant-bras bouge.',
  },
  /* ----- Dos ----- */
  rowing_1bras: {
    name: 'Rowing un bras sur banc', equip: ['db', 'bench'], muscles: 'Grand dorsal, haut du dos, biceps', weighted: true,
    how: [
      'Genou et main du même côté sur le banc, dos plat.',
      'Haltère bras tendu sous l’épaule.',
      'Tire l’haltère vers la hanche en gardant le coude près du corps.',
      'Redescends lentement.',
    ],
    tips: 'Pense à tirer avec le coude, pas avec la main.',
  },
  rowing_incline: {
    name: 'Rowing poitrine sur banc incliné', equip: ['db', 'bench'], muscles: 'Haut du dos, arrière d’épaule', weighted: true,
    how: [
      'Dossier à 30-45°, allonge-toi ventre contre le banc.',
      'Haltères bras tendus vers le sol.',
      'Tire les deux haltères en serrant les omoplates, puis redescends.',
    ],
    tips: 'Garde la poitrine collée au banc : zéro triche.',
  },
  rowing_2bras: {
    name: 'Rowing buste penché', equip: ['db'], muscles: 'Dos, lombaires', weighted: true,
    how: [
      'Debout, genoux fléchis, buste penché à ~45°, dos plat.',
      'Tire les haltères vers le bas du ventre.',
      'Redescends contrôlé.',
    ],
    tips: 'Dos toujours plat, regard vers le sol devant toi.',
  },
  pullover: {
    name: 'Pull-over haltère', equip: ['db', 'bench'], muscles: 'Grand dorsal, pectoraux', weighted: true,
    how: [
      'Allongé sur le banc, un haltère tenu à deux mains au-dessus de la poitrine.',
      'Bras légèrement fléchis, descends l’haltère derrière la tête.',
      'Ramène-le au-dessus de la poitrine.',
    ],
    tips: 'Descends seulement tant que c’est confortable pour les épaules.',
  },
  superman: {
    name: 'Superman', equip: ['bw'], muscles: 'Lombaires, fessiers',
    how: ['Allongé sur le ventre, bras tendus devant.', 'Décolle bras et jambes du sol, tiens 2 secondes, relâche.'],
    tips: 'Regarde le sol pour garder la nuque neutre.',
  },
  /* ----- Biceps ----- */
  curl: {
    name: 'Curl biceps haltères', equip: ['db'], muscles: 'Biceps', weighted: true,
    how: ['Debout, paumes vers l’avant.', 'Plie les coudes pour monter les haltères, coudes fixes.', 'Redescends lentement.'],
    tips: 'Pas de balancier avec le dos.',
  },
  curl_marteau: {
    name: 'Curl marteau', equip: ['db'], muscles: 'Biceps, avant-bras', weighted: true,
    how: ['Paumes face à face (prise marteau).', 'Monte les haltères sans bouger les coudes.', 'Redescends contrôlé.'],
    tips: 'Peut se faire en alterné.',
  },
  curl_incline: {
    name: 'Curl incliné sur banc', equip: ['db', 'bench'], muscles: 'Biceps (étirement)', weighted: true,
    how: ['Dossier à 45°, bras pendants derrière le corps.', 'Monte les haltères en gardant les coudes en arrière.', 'Redescends jusqu’en bas.'],
    tips: 'Prends plus léger que le curl debout.',
  },
  /* ----- Jambes / fessiers ----- */
  goblet: {
    name: 'Goblet squat', equip: ['db'], muscles: 'Quadriceps, fessiers', weighted: true,
    how: [
      'Tiens un haltère verticalement contre la poitrine.',
      'Pieds largeur d’épaules, descends en poussant les fesses en arrière.',
      'Descends au moins cuisses parallèles au sol, puis remonte en poussant sur les talons.',
    ],
    tips: 'Genoux dans l’axe des pieds, poitrine haute.',
  },
  bulgare: {
    name: 'Squat bulgare', equip: ['db', 'bench'], muscles: 'Quadriceps, fessiers', weighted: true,
    how: [
      'Dos au banc, pose le dessus du pied arrière sur le banc.',
      'Haltères en main, descends le genou arrière vers le sol.',
      'Remonte en poussant sur le talon avant. Fais toutes les reps puis change de jambe.',
    ],
    tips: 'Commence sans haltères pour trouver l’équilibre.',
  },
  sdt_roumain: {
    name: 'Soulevé de terre roumain', equip: ['db'], muscles: 'Ischios, fessiers, lombaires', weighted: true,
    how: [
      'Debout, haltères devant les cuisses, genoux légèrement fléchis.',
      'Pousse les fesses en arrière en gardant le dos plat, les haltères glissent le long des jambes.',
      'Descends jusqu’à mi-tibias puis remonte en contractant les fessiers.',
    ],
    tips: 'Dos plat obligatoire. Tu dois sentir l’étirement derrière les cuisses.',
  },
  hip_thrust: {
    name: 'Hip thrust sur banc', equip: ['db', 'bench'], muscles: 'Fessiers, ischios', weighted: true,
    how: [
      'Haut du dos appuyé sur le bord du banc, haltère posé sur les hanches.',
      'Pieds à plat, pousse les hanches vers le haut jusqu’à l’alignement épaules-genoux.',
      'Serre les fessiers 1 seconde en haut, redescends.',
    ],
    tips: 'Menton rentré, regarde devant toi.',
  },
  step_up: {
    name: 'Step-up sur banc', equip: ['db', 'bench'], muscles: 'Quadriceps, fessiers', weighted: true,
    how: ['Haltères en main, pose un pied sur le banc.', 'Monte en poussant sur la jambe du dessus.', 'Redescends contrôlé, enchaîne sur la même jambe.'],
    tips: 'Vérifie que le banc est bien stable.',
  },
  fentes: {
    name: 'Fentes alternées', equip: ['db'], muscles: 'Quadriceps, fessiers', weighted: true,
    how: ['Haltères en main, fais un grand pas en avant.', 'Descends le genou arrière près du sol.', 'Reviens et alterne.'],
    tips: 'Buste droit, genou avant au-dessus de la cheville.',
  },
  mollets: {
    name: 'Mollets debout', equip: ['db'], muscles: 'Mollets', weighted: true,
    how: ['Pointe des pieds sur une marche ou un livre épais, haltères en main.', 'Monte sur la pointe des pieds le plus haut possible.', 'Redescends talons sous la marche.'],
    tips: 'Pause 1 seconde en haut et en bas.',
  },
  squat_saute: {
    name: 'Squats sautés', equip: ['bw'], muscles: 'Jambes, cardio',
    how: ['Descends en squat.', 'Saute le plus haut possible.', 'Réception souple et enchaîne.'],
    tips: 'Atterris sur l’avant du pied, genoux souples.',
  },
  /* ----- Abdos / gainage / cardio ----- */
  planche: {
    name: 'Planche (gainage)', equip: ['bw'], muscles: 'Abdos, gainage', timed: true,
    how: ['Appui sur les avant-bras et la pointe des pieds.', 'Corps bien aligné, fessiers et abdos serrés.', 'Tiens la position.'],
    tips: 'Ne laisse pas les hanches tomber, respire normalement.',
  },
  planche_lat: {
    name: 'Planche latérale', equip: ['bw'], muscles: 'Obliques', timed: true,
    how: ['Sur le côté, appui sur un avant-bras.', 'Monte les hanches pour aligner le corps.', 'Tiens, puis change de côté (temps indiqué par côté).'],
    tips: 'Hanches bien hautes.',
  },
  releve_jambes: {
    name: 'Relevés de jambes sur banc', equip: ['bench', 'bw'], muscles: 'Bas des abdos',
    how: ['Allongé sur le banc, mains agrippées derrière la tête.', 'Monte les jambes tendues à la verticale.', 'Redescends lentement sans toucher le banc.'],
    tips: 'Le bas du dos reste collé au banc.',
  },
  crunch: {
    name: 'Crunch', equip: ['bw'], muscles: 'Abdos',
    how: ['Allongé sur le dos, genoux pliés.', 'Enroule le haut du dos en rapprochant les côtes du bassin.', 'Redescends doucement.'],
    tips: 'Ne tire pas sur la nuque.',
  },
  russian_twist: {
    name: 'Russian twist', equip: ['db', 'bw'], muscles: 'Obliques', weighted: true,
    how: ['Assis, buste incliné en arrière, pieds décollés (ou au sol).', 'Tiens un haltère à deux mains.', 'Tourne le buste d’un côté puis de l’autre.'],
    tips: '1 rep = gauche + droite.',
  },
  mountain: {
    name: 'Mountain climbers', equip: ['bw'], muscles: 'Abdos, cardio', timed: true,
    how: ['Position de pompe.', 'Ramène les genoux vers la poitrine en alternance, rapidement.'],
    tips: 'Hanches basses, rythme soutenu.',
  },
  burpees: {
    name: 'Burpees', equip: ['bw'], muscles: 'Corps entier, cardio',
    how: ['Accroupi, mains au sol.', 'Saute les pieds en arrière (position pompe).', 'Ramène les pieds et saute bras en l’air.'],
    tips: 'Version facile : sans le saut et sans la pompe.',
  },
  thruster: {
    name: 'Thrusters haltères', equip: ['db'], muscles: 'Jambes, épaules, cardio', weighted: true,
    how: ['Haltères sur les épaules.', 'Squat complet.', 'En remontant, pousse les haltères au-dessus de la tête d’un seul mouvement.'],
    tips: 'Utilise l’élan des jambes pour pousser.',
  },
  swing: {
    name: 'Swing haltère', equip: ['db'], muscles: 'Fessiers, ischios, cardio', weighted: true,
    how: ['Haltère tenu à deux mains, pieds écartés.', 'Bascule le bassin en arrière, haltère entre les jambes.', 'Projette les hanches vers l’avant pour lancer l’haltère à hauteur des épaules.'],
    tips: 'Ce sont les hanches qui travaillent, pas les bras.',
  },
  jumping_jacks: {
    name: 'Jumping jacks', equip: ['bw'], muscles: 'Cardio', timed: true,
    how: ['Saute en écartant bras et jambes.', 'Saute pour revenir pieds joints, bras le long du corps.'],
    tips: 'Idéal pour l’échauffement.',
  },
};

/* ---------------- Échauffements / retours au calme ---------------- */

const WARMUP_UPPER = [
  ['Jumping jacks', 60],
  ['Cercles de bras (avant / arrière)', 45],
  ['Rotations des épaules', 30],
  ['Pompes lentes (sur les genoux)', 45],
  ['1 série légère du 1er exercice', 60],
];
const WARMUP_LOWER = [
  ['Jumping jacks', 60],
  ['Squats sans charge', 45],
  ['Fentes alternées sans charge', 45],
  ['Balancés de jambes (avant / côté)', 45],
  ['Pont fessier', 30],
];
const WARMUP_FULL = [
  ['Jumping jacks', 60],
  ['Squats sans charge', 30],
  ['Cercles de bras', 30],
  ['Montées de genoux sur place', 30],
  ['Inchworms (marche des mains)', 45],
];
const STRETCH = [
  ['Étirement quadriceps (debout, talon aux fesses)', 60, 'Chaque jambe 30 s'],
  ['Étirement ischios (jambe tendue sur le banc)', 60, 'Chaque jambe 30 s'],
  ['Fente basse (fléchisseurs de hanche)', 60, 'Chaque côté 30 s'],
  ['Étirement fessier (figure 4, allongé)', 60, 'Chaque côté 30 s'],
  ['Étirement mollets contre un mur', 60, 'Chaque jambe 30 s'],
  ['Étirement pectoraux (bras contre un mur)', 60, 'Chaque côté 30 s'],
  ['Posture de l’enfant', 60, 'Respire profondément'],
  ['Chat / vache (mobilité du dos)', 45, 'Lentement'],
];

/* ---------------- Séances de course ---------------- */
// Phase : [libellé, durée en secondes, type] — types : warm, easy, fast, walk, cool

function rep(n, phases) {
  const out = [];
  for (let i = 0; i < n; i++) phases.forEach((p) => out.push([`${p[0]} (${i + 1}/${n})`, p[1], p[2]]));
  return out;
}

const RUN_ENDURANCE = [
  { // Débutant
    summary: '6 × (3 min course lente + 1 min marche)',
    phases: [['Marche rapide', 300, 'warm'], ...rep(6, [['Course lente', 180, 'easy'], ['Marche', 60, 'walk']]), ['Marche retour au calme', 300, 'cool']],
  },
  { // Intermédiaire
    summary: '30 min de footing en aisance respiratoire',
    phases: [['Trottinement d’échauffement', 300, 'warm'], ['Footing (tu peux parler)', 1800, 'easy'], ['Marche retour au calme', 300, 'cool']],
  },
  { // Avancé
    summary: '40 min footing + 5 accélérations progressives',
    phases: [['Trottinement d’échauffement', 600, 'warm'], ['Footing endurance', 2400, 'easy'], ...rep(5, [['Accélération progressive', 20, 'fast'], ['Trot récupération', 60, 'walk']]), ['Retour au calme', 300, 'cool']],
  },
];

const RUN_INTERVALS = [
  {
    summary: '8 × (30 s rapide + 90 s marche)',
    phases: [['Marche puis trot léger', 600, 'warm'], ...rep(8, [['Rapide', 30, 'fast'], ['Marche', 90, 'walk']]), ['Marche retour au calme', 300, 'cool']],
  },
  {
    summary: '2 × 8 × (30 s vite + 30 s trot)',
    phases: [['Footing d’échauffement', 600, 'warm'], ...rep(8, [['Vite', 30, 'fast'], ['Trot', 30, 'walk']]), ['Récupération (trot)', 180, 'easy'], ...rep(8, [['Vite', 30, 'fast'], ['Trot', 30, 'walk']]), ['Retour au calme', 300, 'cool']],
  },
  {
    summary: '6 × (3 min allure 10 km + 1 min 30 trot)',
    phases: [['Footing d’échauffement', 720, 'warm'], ...rep(6, [['Allure 10 km (soutenu)', 180, 'fast'], ['Trot récupération', 90, 'walk']]), ['Retour au calme', 480, 'cool']],
  },
];

const RUN_SHORT = [
  { summary: '15 min : course / marche', phases: [['Marche rapide', 180, 'warm'], ...rep(3, [['Course lente', 180, 'easy'], ['Marche', 60, 'walk']]), ['Marche', 60, 'cool']] },
  { summary: '20 min de footing tranquille', phases: [['Trottinement', 180, 'warm'], ['Footing', 900, 'easy'], ['Retour au calme', 120, 'cool']] },
  { summary: '25 min footing avec 3 min à allure tempo', phases: [['Trottinement', 300, 'warm'], ['Footing', 600, 'easy'], ['Allure tempo', 180, 'fast'], ['Footing', 300, 'easy'], ['Retour au calme', 120, 'cool']] },
];

const RUN_RECOVERY = [
  { summary: '30 min de marche active', phases: [['Marche active', 1800, 'walk']] },
  { summary: '20-25 min footing très lent (ou marche)', phases: [['Footing très lent', 1500, 'easy']] },
  { summary: '30 min footing très lent', phases: [['Footing très lent', 1800, 'easy']] },
];

/* ---------------- Semaine type ---------------- */
// Index 0 = lundi … 6 = dimanche
// Bloc « sets » : [débutant, intermédiaire, avancé]

const WEEK = [
  {
    id: 'push', short: 'Push', title: 'Pectoraux · Épaules · Triceps', emoji: '💪', color: '#ff6b3d', kind: 'muscu', minutes: [40, 50, 60],
    warmup: WARMUP_UPPER,
    blocks: [
      { ex: 'dc_halteres', sets: [3, 4, 4], reps: '8-12', rest: 90 },
      { ex: 'dc_incline', sets: [3, 3, 4], reps: '10-12', rest: 90 },
      { ex: 'ecarte', sets: [2, 3, 3], reps: '12-15', rest: 60 },
      { ex: 'dev_epaules', sets: [3, 3, 4], reps: '8-12', rest: 90 },
      { ex: 'elev_lat', sets: [2, 3, 4], reps: '12-15', rest: 60 },
      { ex: 'ext_triceps', sets: [2, 3, 3], reps: '10-12', rest: 60 },
      { ex: 'dips_banc', sets: [2, 2, 3], reps: 'max', rest: 60 },
    ],
    finisher: 'Finisher : 1 série de pompes au maximum.',
  },
  {
    id: 'run_easy', short: 'Cardio', title: 'Course · Endurance', emoji: '🏃', color: '#1fb6ff', kind: 'run', minutes: [34, 40, 60],
    run: RUN_ENDURANCE,
    after: [{ ex: 'planche', sets: [2, 3, 3], reps: '30 s', secs: [30, 45, 60], rest: 45 }],
    note: 'Allure « conversation » : tu dois pouvoir parler en courant.',
  },
  {
    id: 'pull', short: 'Pull', title: 'Dos · Biceps · Gainage', emoji: '🦍', color: '#7b61ff', kind: 'muscu', minutes: [40, 50, 60],
    warmup: WARMUP_UPPER,
    blocks: [
      { ex: 'rowing_1bras', sets: [3, 4, 4], reps: '8-12 / bras', rest: 75 },
      { ex: 'rowing_incline', sets: [3, 3, 4], reps: '10-12', rest: 75 },
      { ex: 'pullover', sets: [2, 3, 3], reps: '12', rest: 60 },
      { ex: 'oiseau', sets: [2, 3, 3], reps: '12-15', rest: 60 },
      { ex: 'curl', sets: [2, 3, 3], reps: '10-12', rest: 60 },
      { ex: 'curl_marteau', sets: [2, 2, 3], reps: '10-12', rest: 60 },
      { ex: 'superman', sets: [2, 3, 3], reps: '15', rest: 45 },
      { ex: 'planche', sets: [2, 3, 3], reps: '30 s', secs: [30, 45, 60], rest: 45 },
    ],
  },
  {
    id: 'run_hiit', short: 'Fractionné', title: 'Course · Fractionné', emoji: '⚡️', color: '#ffb300', kind: 'run', minutes: [31, 38, 55],
    run: RUN_INTERVALS,
    after: [{ ex: 'crunch', sets: [2, 3, 3], reps: '15-20', rest: 45 }, { ex: 'planche_lat', sets: [2, 2, 3], reps: '30 s / côté', secs: [20, 30, 45], rest: 30 }],
    note: 'Les phases « rapide » sont intenses mais contrôlées : tu dois pouvoir toutes les tenir.',
  },
  {
    id: 'legs', short: 'Jambes', title: 'Jambes · Fessiers · Abdos', emoji: '🦵', color: '#22c55e', kind: 'muscu', minutes: [45, 55, 65],
    warmup: WARMUP_LOWER,
    blocks: [
      { ex: 'goblet', sets: [3, 4, 4], reps: '10-12', rest: 90 },
      { ex: 'bulgare', sets: [2, 3, 3], reps: '10 / jambe', rest: 75 },
      { ex: 'sdt_roumain', sets: [3, 3, 4], reps: '10-12', rest: 90 },
      { ex: 'hip_thrust', sets: [3, 3, 4], reps: '12-15', rest: 75 },
      { ex: 'step_up', sets: [2, 3, 3], reps: '10 / jambe', rest: 60 },
      { ex: 'mollets', sets: [3, 4, 4], reps: '15-20', rest: 45 },
      { ex: 'releve_jambes', sets: [2, 3, 3], reps: '12-15', rest: 45 },
      { ex: 'planche', sets: [2, 2, 3], reps: '30 s', secs: [30, 45, 60], rest: 45 },
    ],
  },
  {
    id: 'full', short: 'Full body', title: 'Full body en circuit + footing', emoji: '🔥', color: '#ef3d64', kind: 'mix', minutes: [40, 50, 60],
    warmup: WARMUP_FULL,
    circuit: {
      rounds: [3, 4, 5], rest: 90,
      items: [
        { ex: 'thruster', reps: '12' },
        { ex: 'rowing_2bras', reps: '12' },
        { ex: 'fentes', reps: '10 / jambe' },
        { ex: 'pompes', reps: '10-15' },
        { ex: 'swing', reps: '15' },
        { ex: 'russian_twist', reps: '20' },
        { ex: 'burpees', reps: '8-10' },
      ],
    },
    run: RUN_SHORT,
    note: 'Enchaîne les exercices du circuit sans pause, récupère entre les tours. Puis va courir.',
  },
  {
    id: 'rest', short: 'Repos', title: 'Repos actif · Mobilité', emoji: '🧘', color: '#14b8a6', kind: 'rest', minutes: [45, 45, 50],
    run: RUN_RECOVERY,
    stretch: STRETCH,
    note: 'Journée de récupération : marche ou footing très lent, puis étirements. Les muscles grandissent au repos !',
  },
];

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const PHASE_LABEL = { warm: 'Échauffement', easy: 'Endurance', fast: 'Effort', walk: 'Récup', cool: 'Retour au calme', work: 'Effort', rest: 'Repos' };
