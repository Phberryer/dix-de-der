// Retouche les pages HTML générées par « expo export » :
// langue française et réglages pour ajouter l'app à l'écran d'accueil de l'iPhone.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const extraHead = [
  '<meta name="theme-color" content="#1F5F3F"/>',
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Dix de Der"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
].join('');

for (const file of fs.readdirSync(dist).filter((f) => f.endsWith('.html'))) {
  const full = path.join(dist, file);
  const html = fs.readFileSync(full, 'utf8')
    .replace('<html lang="en">', '<html lang="fr">')
    .replace('<head>', `<head>${extraHead}`);
  fs.writeFileSync(full, html);
}

// GitHub Pages ignore les dossiers qui commencent par « _ » sans ce fichier.
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
