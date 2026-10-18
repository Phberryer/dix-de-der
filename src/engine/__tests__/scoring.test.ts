import { computeGame, evaluateDeal, previewDeal, roundTenth } from '../scoring';
import { computeStats, ranking } from '../stats';
import { Deal, Game, GameSettings, PlayedDeal, Seat, Team } from '../types';

const s101: GameSettings = { target: 101, suspense: false };
const s101Suspense: GameSettings = { target: 101, suspense: true };
const s501: GameSettings = { target: 501, suspense: false };

// Raccourci : le preneur est à la place 0 (équipe A) sauf indication contraire.
function deal(p: Partial<PlayedDeal> & { enteredPoints?: number }): PlayedDeal {
  return {
    kind: 'played', dealer: 0, taker: 0, trump: 'coeur', enteredTeam: 'A',
    enteredPoints: 100, belote: null, capot: null, ...p,
  };
}

function game(deals: Deal[], settings = s101, firstDealer: Seat = 0): Game {
  return {
    id: 'g', createdAt: '2026-10-18T00:00:00Z', finishedAt: null,
    seats: ['p0', 'p1', 'p2', 'p3'], firstDealer, settings, deals,
  };
}

describe('arrondi en 101', () => {
  it('arrondit un 5 vers le bas et un 6 vers le haut', () => {
    expect(roundTenth(85)).toBe(8);
    expect(roundTenth(86)).toBe(9);
    expect(roundTenth(76)).toBe(8);
    expect(roundTenth(162)).toBe(16);
    expect(roundTenth(81)).toBe(8);
  });

  it('86 / 76 donne 9 / 8, soit 17', () => {
    expect(previewDeal(deal({ enteredPoints: 86 }), s101).points).toEqual({ A: 9, B: 8 });
  });

  it('85 / 77 donne 8 / 8', () => {
    expect(previewDeal(deal({ enteredPoints: 85 }), s101).points).toEqual({ A: 8, B: 8 });
  });

  it('96 / 86 avec belote donne 10 / 9, soit 19', () => {
    expect(previewDeal(deal({ enteredPoints: 76, belote: 'A' }), s101).points).toEqual({ A: 10, B: 9 });
  });

  it('garde les points réels quand on ne joue pas en 101', () => {
    expect(previewDeal(deal({ enteredPoints: 86 }), s501).points).toEqual({ A: 86, B: 76 });
  });
});

describe('saisie des points', () => {
  it("accepte les points de l'équipe qui n'a pas pris", () => {
    // Preneur A, on saisit les 60 points de B : A a 102.
    const r = evaluateDeal(deal({ enteredTeam: 'B', enteredPoints: 60 }));
    expect(r.raw).toEqual({ A: 102, B: 60 });
    expect(r.outcome).toBe('made');
  });
});

describe('dedans', () => {
  it('77 / 85 pour le preneur donne 0 / 16', () => {
    const r = previewDeal(deal({ enteredPoints: 77 }), s101);
    expect(r.result.outcome).toBe('failed');
    expect(r.points).toEqual({ A: 0, B: 16 });
  });

  it('la belote du preneur qui chute va à la défense : 0 / 18', () => {
    const r = previewDeal(deal({ enteredPoints: 50, belote: 'A' }), s101);
    expect(r.points).toEqual({ A: 0, B: 18 });
  });

  it('avec belote-rebelote, le contrat passe à 91 et la belote du preneur compte', () => {
    const made = evaluateDeal(deal({ enteredPoints: 72, belote: 'A' }));
    expect(made.outcome).toBe('made');
    expect(made.raw).toEqual({ A: 92, B: 90 });
    expect(evaluateDeal(deal({ enteredPoints: 70, belote: 'A' })).outcome).toBe('failed');
    // Belote chez la défense : le preneur doit aussi faire 91.
    expect(evaluateDeal(deal({ enteredPoints: 85, belote: 'B' })).outcome).toBe('failed');
    expect(evaluateDeal(deal({ enteredPoints: 92, belote: 'B' })).outcome).toBe('made');
  });

  it('91 / 91 avec belote-rebelote est une égalité : 9 / 9', () => {
    const r = previewDeal(deal({ enteredPoints: 71, belote: 'A' }), s101);
    expect(r.result.outcome).toBe('tie');
    expect(r.points).toEqual({ A: 9, B: 9 });
  });
});

describe('capot', () => {
  it('vaut 250, soit 25', () => {
    expect(previewDeal(deal({ capot: 'A' }), s101).points).toEqual({ A: 25, B: 0 });
  });

  it('vaut 270 avec belote-rebelote, soit 27', () => {
    expect(previewDeal(deal({ capot: 'A', belote: 'A' }), s101).points).toEqual({ A: 27, B: 0 });
  });

  it('un preneur mis capot chute et perd sa belote', () => {
    const r = previewDeal(deal({ capot: 'B', belote: 'A' }), s101);
    expect(r.result.outcome).toBe('failed');
    expect(r.points).toEqual({ A: 0, B: 27 });
  });
});

describe('égalité 81 / 81', () => {
  it('donne 8 / 8 sans point en suspens', () => {
    const state = computeGame(game([deal({ enteredPoints: 81 })]));
    expect(state.total).toEqual({ A: 8, B: 8 });
    expect(state.pending).toEqual([]);
  });

  it('reste en suspens, puis 8 / 8 si les preneurs gagnent la donne suivante', () => {
    const g = game([deal({ enteredPoints: 81 })], s101Suspense);
    expect(computeGame(g).total).toEqual({ A: 0, B: 0 });
    expect(computeGame(g).pending).toEqual([0]);
    g.deals.push(deal({ dealer: 1, enteredPoints: 100 })); // A gagne : 10 / 6
    const state = computeGame(g);
    expect(state.pending).toEqual([]);
    expect(state.total).toEqual({ A: 8 + 10, B: 8 + 6 });
  });

  it("devient 0 / 16 si l'autre équipe gagne la donne suivante", () => {
    const g = game([
      deal({ enteredPoints: 81 }),
      deal({ dealer: 1, taker: 1, enteredTeam: 'B', enteredPoints: 100 }), // B prend et gagne : 6 / 10
    ], s101Suspense);
    expect(computeGame(g).total).toEqual({ A: 6, B: 16 + 10 });
  });

  it("plusieurs égalités se règlent ensemble, selon qui avait pris sur chacune", () => {
    const g = game([
      deal({ enteredPoints: 81 }), // A avait pris
      deal({ dealer: 1, taker: 1, enteredTeam: 'B', enteredPoints: 81 }), // B avait pris
      deal({ dealer: 2, enteredPoints: 100 }), // A gagne : 10 / 6
    ], s101Suspense);
    const state = computeGame(g);
    // 1re égalité : A avait pris et gagne → 8 / 8. 2e : B avait pris et perd → 16 / 0.
    expect(state.total).toEqual({ A: 8 + 16 + 10, B: 8 + 0 + 6 });
  });
});

describe('donneur', () => {
  it('passe au joueur de gauche, y compris après « Donneur suivant »', () => {
    const g = game([deal({ dealer: 2 }), { kind: 'passed', dealer: 3 }], s101, 2);
    expect(computeGame(g).nextDealer).toBe(0);
    expect(computeGame(game([], s101, 3)).nextDealer).toBe(3);
  });
});

describe('fin de partie', () => {
  function points(n: number, team: Team = 'A'): PlayedDeal {
    return deal({ taker: team === 'A' ? 0 : 1, enteredTeam: team, enteredPoints: n });
  }

  it("se termine quand une équipe atteint 101", () => {
    const deals = Array.from({ length: 7 }, () => points(150)); // 15 / 1 par donne
    expect(computeGame(game(deals)).winner).toBe('A');
    expect(computeGame(game(deals.slice(0, 6))).winner).toBe(null);
  });

  it("si les deux équipes dépassent, celle qui a le plus gagne ; à égalité on continue", () => {
    // Score de fin à 150, en points réels.
    const g = game([points(110), points(120, 'B')], { target: 150, suspense: false });
    expect(computeGame(g).total).toEqual({ A: 152, B: 172 });
    expect(computeGame(g).winner).toBe('B');

    const tie = game([deal({ enteredPoints: 81 }), deal({ enteredPoints: 81 })], { target: 150, suspense: false });
    expect(computeGame(tie).total).toEqual({ A: 162, B: 162 });
    expect(computeGame(tie).winner).toBe(null);
  });
});

describe('statistiques', () => {
  const players = ['p0', 'p1', 'p2', 'p3', 'p4'].map((id) => ({ id, name: id }));

  function finishedGame(id: string, seats: Game['seats'], winner: Team): Game {
    const takerSeat: Seat = winner === 'A' ? 0 : 1;
    return {
      id, createdAt: `2026-10-${id.padStart(2, '0')}T00:00:00Z`, finishedAt: 'x', seats,
      firstDealer: 0, settings: s101,
      deals: Array.from({ length: 7 }, () => deal({ taker: takerSeat, enteredTeam: winner, enteredPoints: 150 })),
    };
  }

  it('calcule victoires, prises, partenaires et classement en pourcentage', () => {
    const games = [
      finishedGame('1', ['p0', 'p1', 'p2', 'p3'], 'A'),
      finishedGame('2', ['p0', 'p1', 'p2', 'p3'], 'A'),
      finishedGame('3', ['p0', 'p1', 'p3', 'p2'], 'B'),
      finishedGame('4', ['p0', 'p1', 'p2', 'p3'], 'A'),
      finishedGame('5', ['p0', 'p1', 'p2', 'p3'], 'A'),
      finishedGame('6', ['p4', 'p1', 'p2', 'p3'], 'A'),
    ];
    const stats = computeStats(players, games);
    const p0 = stats.find((s) => s.player.id === 'p0')!;
    expect(p0.games).toBe(5);
    expect(p0.wins).toBe(4);
    expect(p0.winRate).toBe(80);
    expect(p0.takes).toBe(28);
    expect(p0.takeSuccess).toBe(100);
    expect(p0.bestPartner?.player.id).toBe('p2');
    expect(p0.bestPartner?.rate).toBe(100);
    expect(p0.bestStreak).toBe(2);
    expect(p0.averagePoints).toBeCloseTo((4 * 105 + 7) / 5, 1);

    const p4 = stats.find((s) => s.player.id === 'p4')!;
    expect(p4.winRate).toBe(100);
    // p4 n'a joué qu'une partie : absent du classement.
    const rank = ranking(stats).map((s) => s.player.id);
    expect(rank).not.toContain('p4');
    expect(rank).toEqual(['p2', 'p0', 'p1', 'p3']);
  });
});
