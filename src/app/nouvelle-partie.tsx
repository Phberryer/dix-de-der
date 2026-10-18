import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';

import { Seat } from '../engine/types';
import { useSalon } from '../store/salon';
import { SEAT_LABELS } from '../ui/format';
import { Button, Card, Chip, colors, Muted, Row, Screen, styles, teamColor, Title } from '../ui/kit';

const TARGETS = [101, 501, 1001];

export default function NewGame() {
  const { salon, addPlayer, createGame } = useSalon();
  const [seats, setSeats] = useState<(string | null)[]>([null, null, null, null]);
  const [newNames, setNewNames] = useState(['', '', '', '']);
  const [dealer, setDealer] = useState<Seat | null>(null);
  const [target, setTarget] = useState(101);
  const [customTarget, setCustomTarget] = useState('');
  const [suspense, setSuspense] = useState(true);

  const setSeat = (index: number, playerId: string | null) =>
    setSeats((s) => s.map((v, i) => (i === index ? playerId : v)));

  const addAndSeat = (index: number) => {
    const name = newNames[index].trim();
    if (!name) return;
    const existing = salon.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setSeat(index, existing ? existing.id : addPlayer(name).id);
    setNewNames((n) => n.map((v, i) => (i === index ? '' : v)));
  };

  const finalTarget = target === 0 ? parseInt(customTarget, 10) : target;
  const ready = seats.every(Boolean) && dealer !== null && finalTarget > 0;

  const start = () => {
    if (!ready) return;
    const game = createGame(seats as [string, string, string, string], dealer!, { target: finalTarget, suspense });
    router.replace({ pathname: '/partie', params: { id: game.id } });
  };

  return (
    <Screen>
      <Card>
        <Title>Les joueurs autour de la table</Title>
        <Muted>Les joueurs en face l'un de l'autre font équipe.</Muted>
        {SEAT_LABELS.map((label, index) => {
          const team = index % 2 === 0 ? 'A' : 'B';
          const taken = seats.filter((id, i) => id && i !== index);
          return (
            <View key={label} style={{ gap: 8, paddingTop: 8, borderTopWidth: index ? 1 : 0, borderColor: colors.border }}>
              <Text style={{ fontWeight: '700', color: teamColor(team) }}>
                {label} · équipe {team === 'A' ? '1' : '2'}
              </Text>
              <Row>
                {salon.players.filter((p) => !taken.includes(p.id)).map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    color={teamColor(team)}
                    selected={seats[index] === p.id}
                    onPress={() => setSeat(index, seats[index] === p.id ? null : p.id)}
                  />
                ))}
              </Row>
              <Row style={{ flexWrap: 'nowrap' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nouveau joueur"
                  value={newNames[index]}
                  onChangeText={(t) => setNewNames((n) => n.map((v, i) => (i === index ? t : v)))}
                  onSubmitEditing={() => addAndSeat(index)}
                />
                <Button label="Ajouter" kind="secondary" onPress={() => addAndSeat(index)} />
              </Row>
            </View>
          );
        })}
      </Card>

      <Card>
        <Title>Qui donne en premier ?</Title>
        <Row>
          {SEAT_LABELS.map((label, index) => (
            <Chip key={label} label={label} selected={dealer === index} onPress={() => setDealer(index as Seat)} />
          ))}
        </Row>
      </Card>

      <Card>
        <Title>Score de fin</Title>
        <Row>
          {TARGETS.map((t) => (
            <Chip key={t} label={String(t)} selected={target === t} onPress={() => setTarget(t)} />
          ))}
          <Chip label="Autre" selected={target === 0} onPress={() => setTarget(0)} />
        </Row>
        {target === 0 && (
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Score de fin"
            value={customTarget}
            onChangeText={setCustomTarget}
          />
        )}
        <Muted>
          {finalTarget === 101
            ? 'En 101, les points sont divisés par 10 et arrondis (un 5 vers le bas).'
            : 'Les points réels sont comptés, sans division.'}
        </Muted>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Point en suspens</Text>
            <Muted>Une égalité 81 / 81 se règle à la donne suivante.</Muted>
          </View>
          <Switch value={suspense} onValueChange={setSuspense} trackColor={{ true: colors.felt }} />
        </Row>
      </Card>

      <Button label="Commencer la partie" onPress={start} disabled={!ready} />
      {!ready && <Muted>Choisis les 4 joueurs et le premier donneur pour commencer.</Muted>}
    </Screen>
  );
}
