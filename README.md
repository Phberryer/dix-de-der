# Dix de Der

Compteur de points de belote pour la partie hebdomadaire entre amis : règles en 101 (ou score libre),
belote-rebelote, dedans, capot, point en suspens, donneur, graphique de la partie, historique et statistiques.

Fait avec [Expo](https://expo.dev) (React Native) : le même code donne la version web et, plus tard, l'app iPhone.

## Lancer l'app sur son ordinateur

```bash
npm install
npm run web
```

## Tests

```bash
npm test
```

Les règles de calcul sont dans `src/engine/` et testées dans `src/engine/__tests__/`.

## Mise en ligne

Chaque envoi sur la branche `main` publie la version web sur GitHub Pages
(voir `.github/workflows/deploy.yml`).
