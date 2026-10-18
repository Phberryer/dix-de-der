import { Game, Team, Trump } from '../engine/types';

export const SEAT_LABELS = ['Moi', 'À ma gauche', 'En face', 'À ma droite'] as const;

export const TRUMPS: { value: Trump; label: string; symbol: string }[] = [
  { value: 'pique', label: 'Pique', symbol: '♠' },
  { value: 'coeur', label: 'Cœur', symbol: '♥' },
  { value: 'carreau', label: 'Carreau', symbol: '♦' },
  { value: 'trefle', label: 'Trèfle', symbol: '♣' },
];

export function trumpSymbol(trump: Trump): string {
  return TRUMPS.find((t) => t.value === trump)!.symbol;
}

// Nom d'une équipe : les deux joueurs assis face à face.
export function teamName(game: Game, team: Team, name: (id: string) => string): string {
  const [a, b] = team === 'A' ? [game.seats[0], game.seats[2]] : [game.seats[1], game.seats[3]];
  return `${name(a)} & ${name(b)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
