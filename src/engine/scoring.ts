// Moteur de calcul des points de belote.
// Tout est calculé à partir de la liste des donnes : rien n'est stocké en double.

import { Deal, Game, GameSettings, PlayedDeal, Seat, Team } from './types';

export const TOTAL_CARD_POINTS = 162;
export const BELOTE_POINTS = 20;
export const CAPOT_POINTS = 250;
export const CONTRACT_POINTS = 81;

export function teamOfSeat(seat: Seat): Team {
  return seat % 2 === 0 ? 'A' : 'B';
}

export function otherTeam(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

// Le donneur suivant est le joueur à gauche du donneur.
export function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

// En 101, les points sont divisés par 10 et arrondis, un 5 étant arrondi vers le bas.
export function usesTenths(settings: GameSettings): boolean {
  return settings.target === 101;
}

export function roundTenth(points: number): number {
  return Math.floor((points + 4) / 10);
}

export type Score = Record<Team, number>;

export type DealOutcome = 'made' | 'failed' | 'tie';

// Résultat d'une donne avant le règlement éventuel d'une égalité en suspens.
export interface DealResult {
  outcome: DealOutcome;
  // Équipe qui gagne la donne (null en cas d'égalité).
  winner: Team | null;
  // Points bruts (avant division par 10).
  raw: Score;
}

function beloteFor(deal: PlayedDeal, team: Team): number {
  return deal.belote === team ? BELOTE_POINTS : 0;
}

// Calcule le résultat brut d'une donne jouée.
export function evaluateDeal(deal: PlayedDeal): DealResult {
  const takerTeam = teamOfSeat(deal.taker);
  const defense = otherTeam(takerTeam);

  if (deal.capot) {
    const capotTeam = deal.capot;
    const loser = otherTeam(capotTeam);
    // Si les preneurs sont mis capot, ils chutent : leur belote va à l'autre équipe.
    const loserIsTaker = loser === takerTeam;
    const raw: Score = { A: 0, B: 0 };
    raw[capotTeam] = CAPOT_POINTS + beloteFor(deal, capotTeam) + (loserIsTaker ? beloteFor(deal, loser) : 0);
    raw[loser] = loserIsTaker ? 0 : beloteFor(deal, loser);
    return { outcome: capotTeam === takerTeam ? 'made' : 'failed', winner: capotTeam, raw };
  }

  const cards: Score = { A: 0, B: 0 };
  cards[deal.enteredTeam] = deal.enteredPoints;
  cards[otherTeam(deal.enteredTeam)] = TOTAL_CARD_POINTS - deal.enteredPoints;

  // La belote compte pour atteindre les 81 du contrat.
  const takerTotal = cards[takerTeam] + beloteFor(deal, takerTeam);

  if (takerTotal < CONTRACT_POINTS) {
    // Dedans : la défense marque tout, belote comprise.
    const raw: Score = { A: 0, B: 0 };
    raw[defense] = TOTAL_CARD_POINTS + (deal.belote ? BELOTE_POINTS : 0);
    return { outcome: 'failed', winner: defense, raw };
  }

  const raw: Score = {
    A: cards.A + beloteFor(deal, 'A'),
    B: cards.B + beloteFor(deal, 'B'),
  };
  if (takerTotal === CONTRACT_POINTS) {
    return { outcome: 'tie', winner: null, raw };
  }
  return { outcome: 'made', winner: takerTeam, raw };
}

// Score d'une donne dans l'unité de la partie (dixièmes arrondis en 101).
export function toGameUnits(raw: Score, settings: GameSettings): Score {
  if (!usesTenths(settings)) return { ...raw };
  return { A: roundTenth(raw.A), B: roundTenth(raw.B) };
}

// Ce qu'une égalité devient quand elle est réglée.
// Si les preneurs de l'égalité gagnent la donne suivante, chacun garde ses points.
// Sinon, l'autre équipe marque tout, comme un dedans.
function settleTie(tie: DealResult, deal: PlayedDeal, nextWinner: Team): Score {
  const takerTeam = teamOfSeat(deal.taker);
  if (nextWinner === takerTeam) return tie.raw;
  const raw: Score = { A: 0, B: 0 };
  raw[nextWinner] = TOTAL_CARD_POINTS + (deal.belote ? BELOTE_POINTS : 0);
  return raw;
}

export interface DealLine {
  index: number; // position dans la liste des donnes
  deal: Deal;
  result: DealResult | null; // null pour une donne passée
  // Points marqués pour cette donne, dans l'unité de la partie.
  // null tant qu'une égalité est en suspens.
  points: Score | null;
  // Points des égalités en suspens réglées par cette donne.
  settled: Score;
  // Score cumulé après cette donne.
  total: Score;
}

export interface GameState {
  lines: DealLine[];
  total: Score;
  // Indices des donnes à égalité encore en suspens.
  pending: number[];
  winner: Team | null;
  nextDealer: Seat;
}

function add(a: Score, b: Score): Score {
  return { A: a.A + b.A, B: a.B + b.B };
}

// Rejoue toute la partie pour obtenir l'état courant.
export function computeGame(game: Pick<Game, 'deals' | 'settings' | 'firstDealer'>): GameState {
  const { settings } = game;
  const lines: DealLine[] = [];
  let total: Score = { A: 0, B: 0 };
  let pending: number[] = [];
  let winner: Team | null = null;
  let dealer: Seat = game.firstDealer;

  game.deals.forEach((deal, index) => {
    dealer = nextSeat(deal.dealer);
    if (deal.kind === 'passed') {
      lines.push({ index, deal, result: null, points: { A: 0, B: 0 }, settled: { A: 0, B: 0 }, total });
      return;
    }

    const result = evaluateDeal(deal);
    let points: Score | null;
    let settled: Score = { A: 0, B: 0 };

    if (result.outcome === 'tie' && settings.suspense) {
      points = null;
      pending = [...pending, index];
    } else {
      points = toGameUnits(result.raw, settings);
      if (result.winner && pending.length > 0) {
        for (const tieIndex of pending) {
          const tieLine = lines[tieIndex];
          const tieDeal = tieLine.deal as PlayedDeal;
          const tiePoints = toGameUnits(settleTie(tieLine.result!, tieDeal, result.winner), settings);
          tieLine.points = tiePoints;
          settled = add(settled, tiePoints);
        }
        pending = [];
      }
    }

    total = add(total, add(points ?? { A: 0, B: 0 }, settled));
    lines.push({ index, deal, result, points, settled, total });

    // La partie se termine quand une équipe atteint le score de fin.
    // Si les deux l'atteignent, celle qui a le plus gagne ; en cas d'égalité, on continue.
    if (!winner && (total.A >= settings.target || total.B >= settings.target) && total.A !== total.B) {
      winner = total.A > total.B ? 'A' : 'B';
    }
  });

  return { lines, total, pending, winner, nextDealer: dealer };
}

// Aperçu des points d'une donne avant de la valider.
export function previewDeal(deal: PlayedDeal, settings: GameSettings): { result: DealResult; points: Score } {
  const result = evaluateDeal(deal);
  return { result, points: toGameUnits(result.raw, settings) };
}
