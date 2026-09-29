# Prog Muscu — programme de musculation à la maison sur iPhone

Petite application pour iPhone avec **une séance pour chaque jour de la
semaine**, sans salle de sport : **haltères, banc de musculation, poids du
corps** et **course à pied**.

C'est une *web-app installable* (PWA), comme Booth Planner : une fois ajoutée
à l'écran d'accueil, elle a sa propre icône, s'ouvre en plein écran et
fonctionne **sans connexion**.

## Le programme

| Jour | Séance |
| --- | --- |
| Lundi | 💪 Pectoraux · Épaules · Triceps (développé couché/incliné, écarté, développé épaules, élévations, extensions, dips sur banc) |
| Mardi | 🏃 Course endurance + gainage |
| Mercredi | 🦍 Dos · Biceps · Gainage (rowing sur banc, pull-over, oiseau, curls, superman, planche) |
| Jeudi | ⚡️ Course fractionnée + abdos |
| Vendredi | 🦵 Jambes · Fessiers · Abdos (goblet squat, squat bulgare, SDT roumain, hip thrust, step-up, mollets, relevés de jambes) |
| Samedi | 🔥 Full body en circuit + footing |
| Dimanche | 🧘 Repos actif (marche / footing très lent) + étirements |

Trois niveaux (**Débutant, Intermédiaire, Avancé**) : le nombre de séries,
de tours et le contenu des sorties course s'adaptent.

## Fonctionnalités

- Onglet **Aujourd'hui** : la séance du jour, avec l'échauffement, les
  exercices (séries × répétitions, temps de repos) et la course.
- **Cocher chaque série** : le **chrono de repos** se lance tout seul (+15 s / Passer).
  Pour les exercices en secondes (planche…), le chrono d'effort se lance en touchant la série.
- **Charge par exercice** (kg) : l'appli se souvient de la dernière charge et
  te propose d'augmenter quand toutes les séries ont été réussies.
- **Chrono guidé plein écran** pour la course (fractionné, endurance),
  l'échauffement et les étirements : bips, écran qui reste allumé, pause / étape suivante.
- **Changer de séance** si ton planning est décalé.
- Onglet **Semaine**, bibliothèque de **38 exercices** expliqués pas à pas, avec conseils.
- Onglet **Progrès** : calendrier des séances, jours d'affilée, km courus,
  évolution des charges (graphique par exercice).
- Sauvegarde / restauration en fichier `.json`, mode sombre automatique.

Toutes les données restent **sur le téléphone**.

## Installation sur l'iPhone

### GitHub Pages (automatique)

1. Sur GitHub, dans le dépôt : **Settings → Pages → Build and deployment →
   Source : « GitHub Actions »**.
2. Fusionnez cette branche dans `main` : le workflow
   `.github/workflows/deploy.yml` publie l'appli automatiquement.
3. L'adresse sera du type `https://mescamaymeric-bot.github.io/prog_muscu/`.

### Puis, sur l'iPhone

1. Ouvrez l'adresse dans **Safari**.
2. Touchez **Partager** ⬆︎ → **« Sur l'écran d'accueil »** → **Ajouter**.
3. Lancez **Prog Muscu** depuis l'écran d'accueil. 💪

> Astuce : pour entendre les bips du chrono, désactivez le mode silencieux de l'iPhone.

## Tester sur un ordinateur

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | Structure de l'appli et barre d'onglets |
| `styles.css` | Design (style iOS, clair / sombre) |
| `program.js` | **Contenu du programme** : exercices, séances, course (facile à modifier) |
| `app.js` | Logique : séance du jour, chronos, suivi, sauvegardes |
| `sw.js` | Fonctionnement hors ligne (incrémenter `VERSION` à chaque mise à jour) |
| `manifest.webmanifest`, `icons/` | Nom, icône et affichage plein écran |
