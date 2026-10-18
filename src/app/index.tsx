import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { computeGame } from '../engine/scoring';
import { useSalon } from '../store/salon';
import { formatDate, teamName } from '../ui/format';
import { Button, Card, colors, Muted, Screen, Title } from '../ui/kit';

export default function Home() {
  const { ready, salon, playerName } = useSalon();
  if (!ready) return <Screen><Muted>Chargement…</Muted></Screen>;

  const ongoing = salon.games.filter((g) => !g.finishedAt).reverse();

  return (
    <Screen>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{ fontSize: 40 }}>♠ ♥ ♦ ♣</Text>
        <Muted>Le compteur de belote du salon</Muted>
      </View>

      {ongoing.map((game) => {
        const { total } = computeGame(game);
        return (
          <Pressable key={game.id} onPress={() => router.push({ pathname: '/partie', params: { id: game.id } })}>
            <Card style={{ borderColor: colors.felt, borderWidth: 2 }}>
              <Title>Partie en cours</Title>
              <Muted>{formatDate(game.createdAt)} · en {game.settings.target}</Muted>
              <Text style={{ fontSize: 16, color: colors.teamA }}>{teamName(game, 'A', playerName)} : {total.A}</Text>
              <Text style={{ fontSize: 16, color: colors.teamB }}>{teamName(game, 'B', playerName)} : {total.B}</Text>
              <Text style={{ color: colors.felt, fontWeight: '600' }}>Reprendre →</Text>
            </Card>
          </Pressable>
        );
      })}

      <Button label="Nouvelle partie" onPress={() => router.push('/nouvelle-partie')} />
      <Button label="Historique" kind="secondary" onPress={() => router.push('/historique')} />
      <Button label="Statistiques" kind="secondary" onPress={() => router.push('/stats')} />
      <Button label="Joueurs" kind="secondary" onPress={() => router.push('/joueurs')} />
    </Screen>
  );
}
