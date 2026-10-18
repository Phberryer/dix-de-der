import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Page HTML de la version web : en français, et utilisable comme une app depuis l'écran d'accueil de l'iPhone.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#1F5F3F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Dix de Der" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
