// Types de base de l'app.

export type Team = 'A' | 'B';

// Atouts possibles (atout classique uniquement).
export type Trump = 'pique' | 'coeur' | 'carreau' | 'trefle';

export interface Player {
  id: string;
  name: string;
}

// Les 4 places autour de la table, vues par celui qui saisit.
// Index 0 = moi, 1 = à ma gauche, 2 = en face, 3 = à ma droite.
// Équipe A = places 0 et 2, équipe B = places 1 et 3.
export type Seat = 0 | 1 | 2 | 3;

// Une donne jouée et saisie.
export interface PlayedDeal {
  kind: 'played';
  dealer: Seat;
  taker: Seat;
  trump: Trump;
  // Équipe dont on a saisi les points de cartes (pas forcément le preneur).
  enteredTeam: Team;
  // Points de cartes saisis pour cette équipe, de 0 à 162 (dix de der compris).
  enteredPoints: number;
  belote: Team | null;
  capot: Team | null;
}

// Donne passée sans points (erreur de distribution, jeu déposé).
export interface PassedDeal {
  kind: 'passed';
  dealer: Seat;
}

export type Deal = PlayedDeal | PassedDeal;

export interface GameSettings {
  target: number; // 101 par défaut
  suspense: boolean; // point en suspens en cas d'égalité
}

export interface Game {
  id: string;
  createdAt: string; // date ISO
  finishedAt: string | null;
  seats: [string, string, string, string]; // ids des joueurs, par place
  firstDealer: Seat;
  settings: GameSettings;
  deals: Deal[];
  // Prolongations choisies après une victoire sur capot :
  // pour chacune, le nombre de donnes jouées au moment du choix.
  extensions?: number[];
  // Victoire sur capot acceptée (plutôt que prolongée).
  winConfirmed?: boolean;
  // Donne en cours de saisie, pas encore validée.
  draft?: DealDraft;
}

export interface DealDraft {
  taker: Seat | null;
  trump: Trump | null;
  enteredTeam: Team | null;
  pointsText: string;
  belote: Team | null;
  capot: Team | null;
}

export interface Salon {
  players: Player[];
  games: Game[];
}
