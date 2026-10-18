// Statistiques par joueur, calculées sur toutes les parties terminées du salon.
// Tout est en pourcentage ou en moyenne, pour comparer équitablement
// un joueur qui vient souvent et un joueur qui vient rarement.

import { computeGame, teamOfSeat, usesTenths } from './scoring';
import { Game, Player, Seat, Team, Trump } from './types';

export const MIN_GAMES_FOR_RANKING = 5;
export const RANKING_TOP = 10;

export interface Ratio {
  count: number;
  total: number;
}

export function percent(r: Ratio): number | null {
  return r.total === 0 ? null : Math.round((r.count / r.total) * 100);
}

export interface PlayerStats {
  player: Player;
  games: number;
  wins: number;
  winRate: number | null;
  dealsPlayed: number;
  takes: number;
  takeRate: number | null; // donnes où il a pris / donnes jouées
  takesMade: number;
  takeSuccess: number | null; // contrats réussis / prises
  averagePoints: number | null; // points marqués / parties jouées (en points de 101)
  bestPartner: { player: Player; rate: number; games: number } | null;
  worstOpponent: { player: Player; rate: number; games: number } | null;
  capotsMade: number;
  capotsSuffered: number;
  bestStreak: number;
  takeSuccessByTrump: Record<Trump, Ratio>;
}

interface Acc {
  games: number;
  wins: number;
  dealsPlayed: number;
  takes: number;
  takesMade: number;
  points: number;
  capotsMade: number;
  capotsSuffered: number;
  streak: number;
  bestStreak: number;
  partners: Map<string, Ratio>;
  opponents: Map<string, Ratio>;
  byTrump: Record<Trump, Ratio>;
}

function emptyAcc(): Acc {
  return {
    games: 0, wins: 0, dealsPlayed: 0, takes: 0, takesMade: 0, points: 0,
    capotsMade: 0, capotsSuffered: 0, streak: 0, bestStreak: 0,
    partners: new Map(), opponents: new Map(),
    byTrump: {
      pique: { count: 0, total: 0 }, coeur: { count: 0, total: 0 },
      carreau: { count: 0, total: 0 }, trefle: { count: 0, total: 0 },
    },
  };
}

function bump(map: Map<string, Ratio>, id: string, won: boolean) {
  const r = map.get(id) ?? { count: 0, total: 0 };
  map.set(id, { count: r.count + (won ? 1 : 0), total: r.total + 1 });
}

function pick(map: Map<string, Ratio>, players: Map<string, Player>, best: boolean) {
  let chosen: { player: Player; rate: number; games: number } | null = null;
  for (const [id, r] of map) {
    const player = players.get(id);
    if (!player) continue;
    const rate = percent(r)!;
    const better = !chosen
      || (best ? rate > chosen.rate : rate < chosen.rate)
      || (rate === chosen.rate && r.total > chosen.games);
    if (better) chosen = { player, rate, games: r.total };
  }
  return chosen;
}

export function computeStats(players: Player[], games: Game[]): PlayerStats[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const acc = new Map<string, Acc>(players.map((p) => [p.id, emptyAcc()]));

  const finished = games
    .filter((g) => g.finishedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const game of finished) {
    const state = computeGame(game);
    if (!state.winner) continue;
    const scale = usesTenths(game.settings) ? 1 : 1 / 10;

    game.seats.forEach((playerId, seatIndex) => {
      const a = acc.get(playerId);
      if (!a) return;
      const seat = seatIndex as Seat;
      const team: Team = teamOfSeat(seat);
      const won = state.winner === team;

      a.games += 1;
      a.wins += won ? 1 : 0;
      a.points += state.total[team] * scale;
      a.streak = won ? a.streak + 1 : 0;
      a.bestStreak = Math.max(a.bestStreak, a.streak);

      const partnerId = game.seats[(seatIndex + 2) % 4];
      bump(a.partners, partnerId, won);
      // Adversaires : chaque joueur de l'autre équipe.
      bump(a.opponents, game.seats[(seatIndex + 1) % 4], won);
      bump(a.opponents, game.seats[(seatIndex + 3) % 4], won);

      for (const line of state.lines) {
        if (line.deal.kind !== 'played' || !line.result) continue;
        a.dealsPlayed += 1;
        const deal = line.deal;
        if (deal.capot === team) a.capotsMade += 1;
        else if (deal.capot) a.capotsSuffered += 1;
        if (deal.taker === seat) {
          a.takes += 1;
          // Une égalité réglée en faveur des preneurs compte comme réussie.
          const made = line.result.outcome === 'made'
            || (line.result.outcome === 'tie' && line.points !== null && line.points[team] > 0);
          a.takesMade += made ? 1 : 0;
          const r = a.byTrump[deal.trump];
          a.byTrump[deal.trump] = { count: r.count + (made ? 1 : 0), total: r.total + 1 };
        }
      }
    });
  }

  return players.map((player) => {
    const a = acc.get(player.id)!;
    return {
      player,
      games: a.games,
      wins: a.wins,
      winRate: percent({ count: a.wins, total: a.games }),
      dealsPlayed: a.dealsPlayed,
      takes: a.takes,
      takeRate: percent({ count: a.takes, total: a.dealsPlayed }),
      takesMade: a.takesMade,
      takeSuccess: percent({ count: a.takesMade, total: a.takes }),
      averagePoints: a.games === 0 ? null : Math.round((a.points / a.games) * 10) / 10,
      bestPartner: pick(a.partners, byId, true),
      worstOpponent: pick(a.opponents, byId, false),
      capotsMade: a.capotsMade,
      capotsSuffered: a.capotsSuffered,
      bestStreak: a.bestStreak,
      takeSuccessByTrump: a.byTrump,
    };
  });
}

// Classement : au moins 5 parties jouées, trié par % de victoires puis par moyenne de points.
export function ranking(stats: PlayerStats[]): PlayerStats[] {
  return stats
    .filter((s) => s.games >= MIN_GAMES_FOR_RANKING)
    .sort((a, b) => (b.winRate! - a.winRate!) || ((b.averagePoints ?? 0) - (a.averagePoints ?? 0)));
}
