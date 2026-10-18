import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { computeGame } from '../engine/scoring';
import { useSalon } from '../store/salon';
import { formatDate, teamName } from '../ui/format';
import { Card, colors, Muted, Screen } from '../ui/kit';

export default function History() {
  const { salon, playerName } = useSalon();
  const games = [...salon.games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (games.length === 0) return <Screen><Muted>Aucune partie pour l'instant.</Muted></Screen>;

  return (
    <Screen>
      {games.map((game) => {
        const { total, winner } = computeGame(game);
        return (
          <Pressable key={game.id} onPress={() => router.push({ pathname: '/partie', params: { id: game.id } })}>
            <Card style={{ gap: 4 }}>
              <Muted>
                {formatDate(game.createdAt)} · en {game.settings.target} · {game.finishedAt ? 'terminée' : 'en cours'}
              </Muted>
              <Text style={{ fontSize: 16, color: colors.teamA, fontWeight: winner === 'A' ? '800' : '400' }}>
                {winner === 'A' ? '🏆 ' : ''}{teamName(game, 'A', playerName)} : {total.A}
              </Text>
              <Text style={{ fontSize: 16, color: colors.teamB, fontWeight: winner === 'B' ? '800' : '400' }}>
                {winner === 'B' ? '🏆 ' : ''}{teamName(game, 'B', playerName)} : {total.B}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
