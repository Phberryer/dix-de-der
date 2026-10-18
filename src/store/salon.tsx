// Données du salon : joueurs et parties.
// Version 1 : tout est enregistré sur le téléphone (AsyncStorage).
// La version 2 remplacera ce stockage par une base de données en ligne partagée.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { computeGame } from '../engine/scoring';
import { Deal, Game, GameSettings, PlayedDeal, Player, Salon, Seat } from '../engine/types';

const STORAGE_KEY = 'dix-de-der/salon/v1';

const emptySalon: Salon = { players: [], games: [] };

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface SalonApi {
  ready: boolean;
  salon: Salon;
  addPlayer: (name: string) => Player;
  renamePlayer: (id: string, name: string) => void;
  createGame: (seats: Game['seats'], firstDealer: Seat, settings: GameSettings) => Game;
  addDeal: (gameId: string, deal: Deal) => void;
  undoLastDeal: (gameId: string) => void;
  updateDeal: (gameId: string, index: number, change: Partial<PlayedDeal>) => void;
  confirmCapotWin: (gameId: string) => void;
  extendGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  playerName: (id: string) => string;
}

const SalonContext = createContext<SalonApi | null>(null);

// Marque la partie comme terminée dès qu'une équipe a gagné (ou la rouvre après une annulation).
// Une victoire sur capot n'est définitive qu'une fois acceptée.
function withFinish(game: Game): Game {
  const { winner, wonByCapot } = computeGame(game);
  const finished = winner !== null && (!wonByCapot || game.winConfirmed === true);
  if (finished && !game.finishedAt) return { ...game, finishedAt: new Date().toISOString() };
  if (!finished && game.finishedAt) return { ...game, finishedAt: null };
  return game;
}

export function SalonProvider({ children }: { children: ReactNode }) {
  const [salon, setSalon] = useState<Salon>(emptySalon);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSalon(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((change: (s: Salon) => Salon) => {
    setSalon((current) => {
      const next = change(current);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updateGame = useCallback(
    (gameId: string, change: (g: Game) => Game) =>
      update((s) => ({ ...s, games: s.games.map((g) => (g.id === gameId ? withFinish(change(g)) : g)) })),
    [update],
  );

  const api = useMemo<SalonApi>(() => ({
    ready,
    salon,
    addPlayer: (name) => {
      const player = { id: newId(), name: name.trim() };
      update((s) => ({ ...s, players: [...s.players, player] }));
      return player;
    },
    renamePlayer: (id, name) =>
      update((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)) })),
    createGame: (seats, firstDealer, settings) => {
      const game: Game = {
        id: newId(), createdAt: new Date().toISOString(), finishedAt: null,
        seats, firstDealer, settings, deals: [],
      };
      update((s) => ({ ...s, games: [...s.games, game] }));
      return game;
    },
    addDeal: (gameId, deal) => updateGame(gameId, (g) => ({ ...g, deals: [...g.deals, deal] })),
    // Annuler la donne d'un capot annule aussi la prolongation choisie après elle.
    undoLastDeal: (gameId) => updateGame(gameId, (g) => {
      const deals = g.deals.slice(0, -1);
      return { ...g, deals, winConfirmed: false, extensions: g.extensions?.filter((n) => n <= deals.length) };
    }),
    confirmCapotWin: (gameId) => updateGame(gameId, (g) => ({ ...g, winConfirmed: true })),
    extendGame: (gameId) => updateGame(gameId, (g) => ({ ...g, extensions: [...(g.extensions ?? []), g.deals.length] })),
    updateDeal: (gameId, index, change) => updateGame(gameId, (g) => ({
      ...g,
      deals: g.deals.map((d, i) => (i === index && d.kind === 'played' ? { ...d, ...change } : d)),
    })),
    deleteGame: (gameId) => update((s) => ({ ...s, games: s.games.filter((g) => g.id !== gameId) })),
    playerName: (id) => salon.players.find((p) => p.id === id)?.name ?? '?',
  }), [ready, salon, update, updateGame]);

  return <SalonContext.Provider value={api}>{children}</SalonContext.Provider>;
}

export function useSalon(): SalonApi {
  const api = useContext(SalonContext);
  if (!api) throw new Error('useSalon doit être utilisé dans SalonProvider');
  return api;
}
