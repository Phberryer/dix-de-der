import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { computeGame, extensionStep, previewDeal, teamOfSeat, TOTAL_CARD_POINTS } from '../engine/scoring';
import { Game, PlayedDeal, Seat, Team, Trump } from '../engine/types';
import { useSalon } from '../store/salon';
import { formatDate, teamName, TRUMPS, trumpSymbol } from '../ui/format';
import { Button, Card, colors, Muted, Row, Screen, Segmented, styles, teamColor, Title } from '../ui/kit';
import { ScoreChart } from '../ui/ScoreChart';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, salon } = useSalon();
  const game = salon.games.find((g) => g.id === id);

  if (!ready) return <Screen><Muted>Chargement…</Muted></Screen>;
  if (!game) {
    return (
      <Screen>
        <Muted>Cette partie n'existe plus.</Muted>
        <Button label="Retour à l'accueil" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  return <GameView game={game} />;
}

function GameView({ game }: { game: Game }) {
  const { playerName, addDeal, undoLastDeal, updateDeal, deleteGame, confirmCapotWin, extendGame } = useSalon();
  const [editing, setEditing] = useState<number | null>(null);
  const state = computeGame(game);
  const names: [string, string] = [teamName(game, 'A', playerName), teamName(game, 'B', playerName)];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seatName = (seat: Seat) => playerName(game.seats[seat]);
  const lastLine = state.lines[state.lines.length - 1];

  return (
    <Screen>
      <Card>
        <Muted>{formatDate(game.createdAt)} · en {state.target}{game.extensions?.length ? ' (prolongée)' : ''}{game.settings.suspense ? ' · point en suspens' : ''}</Muted>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['A', 'B'] as Team[]).map((team, i) => (
            <View key={team} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: teamColor(team) }}>
              <Text style={{ color: '#FFF', fontWeight: '600', textAlign: 'center' }}>{names[i]}</Text>
              <Text style={{ color: '#FFF', fontSize: 40, fontWeight: '800' }}>{state.total[team]}</Text>
            </View>
          ))}
        </View>
        {state.pending.length > 0 && (
          <Text style={{ color: colors.felt, fontWeight: '600' }}>
            {state.pending.length === 1 ? '1 donne à égalité en suspens' : `${state.pending.length} donnes à égalité en suspens`}
          </Text>
        )}
        {state.winner && !game.finishedAt ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: teamColor(state.winner), textAlign: 'center' }}>
              {names[state.winner === 'A' ? 0 : 1]} atteignent {state.target} grâce à un capot !
            </Text>
            <Button label="Victoire" onPress={() => confirmCapotWin(game.id)} />
            <Button
              label={`Prolonger jusqu'à ${state.target + extensionStep(game.settings)}`}
              kind="secondary"
              onPress={() => extendGame(game.id)}
            />
          </View>
        ) : state.winner ? (
          <Text style={{ fontSize: 18, fontWeight: '800', color: teamColor(state.winner), textAlign: 'center' }}>
            🏆 {names[state.winner === 'A' ? 0 : 1]} gagnent la partie !
          </Text>
        ) : (
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Text style={{ fontSize: 17 }}>
              Donneur : <Text style={{ fontWeight: '700' }}>{seatName(state.nextDealer)}</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Donneur suivant"
              onPress={() => addDeal(game.id, { kind: 'passed', dealer: state.nextDealer })}
              style={({ pressed }) => [{
                width: 44, height: 44, borderRadius: 22, backgroundColor: colors.felt,
                alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
              }]}
            >
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '700' }}>⟳</Text>
            </Pressable>
          </Row>
        )}
      </Card>

      {!state.winner && (
        <DealForm
          game={game}
          dealer={state.nextDealer}
          names={names}
          onSubmit={(deal) => addDeal(game.id, deal)}
        />
      )}

      {state.lines.length > 0 && (
        <Card>
          <Title>Évolution du score</Title>
          <ScoreChart totals={state.lines.map((l) => l.total)} target={state.target} labels={names} />
        </Card>
      )}

      {state.lines.length > 0 && (
        <Card>
          <Title>Donnes</Title>
          {[...state.lines].reverse().map((line) => {
            const deal = line.deal;
            let description: string;
            if (deal.kind === 'passed') {
              description = `${seatName(deal.dealer)} a donné · donne passée`;
            } else {
              const outcome = deal.capot ? 'capot' : line.result!.outcome === 'failed' ? 'dedans'
                : line.result!.outcome === 'tie' ? (line.points ? 'égalité' : 'égalité en suspens') : '';
              description = `${seatName(deal.taker)} prend à ${trumpSymbol(deal.trump)}${outcome ? ` · ${outcome}` : ''}`
                + (deal.belote ? ' · belote' : '');
            }
            const settled = line.settled.A + line.settled.B > 0 ? ` (+${line.settled.A} / +${line.settled.B} réglés)` : '';
            const isEditing = editing === line.index;
            return (
              <Pressable
                key={line.index}
                disabled={deal.kind !== 'played'}
                onPress={() => setEditing(isEditing ? null : line.index)}
                style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, gap: 4 }}
              >
                <Text style={{ fontWeight: '600' }}>Donne {line.index + 1} · {description}</Text>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Muted>
                    {line.points ? `${line.points.A} / ${line.points.B}` : '— / —'}{settled}
                  </Muted>
                  <Text>
                    <Text style={{ color: colors.teamA, fontWeight: '700' }}>{line.total.A}</Text>
                    {' – '}
                    <Text style={{ color: colors.teamB, fontWeight: '700' }}>{line.total.B}</Text>
                  </Text>
                </Row>
                {isEditing && deal.kind === 'played' && (
                  <View style={{ gap: 6, paddingBottom: 6 }}>
                    <Muted>Belote-rebelote pour cette donne</Muted>
                    <Segmented<Team | null>
                      value={deal.belote}
                      onChange={(belote) => updateDeal(game.id, line.index, { belote })}
                      options={[
                        { value: null, label: '0', weight: 0.5 },
                        { value: 'A', label: names[0], color: colors.teamA },
                        { value: 'B', label: names[1], color: colors.teamB },
                      ]}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
          <Muted>Touche une donne pour ajouter une belote oubliée.</Muted>
          {lastLine && (
            <Button label="Annuler la dernière donne" kind="secondary" onPress={() => undoLastDeal(game.id)} />
          )}
        </Card>
      )}

      {confirmDelete ? (
        <Card>
          <Text>Supprimer définitivement cette partie ?</Text>
          <Button label="Oui, supprimer" kind="danger" onPress={() => { deleteGame(game.id); router.replace('/'); }} />
          <Button label="Non" kind="secondary" onPress={() => setConfirmDelete(false)} />
        </Card>
      ) : (
        <Button label="Supprimer la partie" kind="secondary" onPress={() => setConfirmDelete(true)} />
      )}
    </Screen>
  );
}

function DealForm({
  game, dealer, names, onSubmit,
}: {
  game: Game; dealer: Seat; names: [string, string]; onSubmit: (deal: PlayedDeal) => void;
}) {
  const { playerName } = useSalon();
  const [taker, setTaker] = useState<Seat | null>(null);
  const [trump, setTrump] = useState<Trump | null>(null);
  // Les points saisis, et l'équipe sous laquelle on les a saisis.
  const [enteredTeam, setEnteredTeam] = useState<Team | null>(null);
  const [pointsText, setPointsText] = useState('');
  const [belote, setBelote] = useState<Team | null>(null);
  const [capot, setCapot] = useState<Team | null>(null);

  const points = parseInt(pointsText, 10);
  const pointsInRange = points >= 0 && points <= TOTAL_CARD_POINTS;
  const pointsValid = capot !== null || (enteredTeam !== null && pointsInRange);
  const complete = taker !== null && trump !== null && pointsValid;

  const reset = () => {
    setTaker(null); setTrump(null); setEnteredTeam(null); setPointsText(''); setBelote(null); setCapot(null);
  };

  const deal: PlayedDeal | null = complete
    ? {
      kind: 'played', dealer, taker: taker!, trump: trump!,
      enteredTeam: enteredTeam ?? 'A', enteredPoints: capot ? 0 : points,
      belote, capot,
    }
    : null;
  const preview = deal ? previewDeal(deal, game.settings) : null;
  const outcomeLabel = !preview ? '' : capot ? 'capot'
    : preview.result.outcome === 'failed' ? 'dedans'
    : preview.result.outcome === 'tie' ? (game.settings.suspense ? 'égalité, mise en suspens' : 'égalité')
    : 'contrat réussi';

  const submit = () => {
    if (!deal) return;
    onSubmit(deal);
    reset();
  };

  // La case de l'autre équipe affiche le complément à 162 (hors belote).
  const fieldValue = (team: Team) => {
    if (enteredTeam === team || pointsText === '') return pointsText;
    return pointsInRange ? String(TOTAL_CARD_POINTS - points) : '';
  };

  const teamOptions = (noneLabel: string) => [
    { value: null, label: noneLabel, weight: 0.5 },
    { value: 'A' as Team, label: names[0], color: colors.teamA },
    { value: 'B' as Team, label: names[1], color: colors.teamB },
  ];

  return (
    <Card>
      <Muted>Preneur</Muted>
      <Segmented<Seat | null>
        value={taker}
        onChange={setTaker}
        options={([0, 1, 2, 3] as Seat[]).map((seat) => ({
          value: seat, label: playerName(game.seats[seat]), color: teamColor(teamOfSeat(seat)),
        }))}
      />

      <Muted>Atout</Muted>
      <Segmented<Trump | null>
        value={trump}
        onChange={setTrump}
        maxFontSize={26}
        options={TRUMPS.map((t) => ({
          value: t.value, label: t.symbol,
          color: t.value === 'coeur' || t.value === 'carreau' ? colors.red : colors.text,
        }))}
      />

      <Muted>Belote-rebelote</Muted>
      <Segmented<Team | null> value={belote} onChange={setBelote} options={teamOptions('0')} />

      <Muted>Capot</Muted>
      <Segmented<Team | null> value={capot} onChange={setCapot} options={teamOptions('0')} />

      {capot === null && (
        <>
          <Muted>Points (cartes, sur 162)</Muted>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['A', 'B'] as Team[]).map((team, i) => (
              <View key={team} style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={1} style={{ color: teamColor(team), fontWeight: '700', textAlign: 'center' }}>
                  {names[i]}
                </Text>
                <TextInput
                  accessibilityLabel={`Points ${names[i]}`}
                  style={[
                    styles.input,
                    { textAlign: 'center', fontSize: 22, fontWeight: '700', borderColor: teamColor(team), color: teamColor(team) },
                    enteredTeam !== null && enteredTeam !== team && { borderStyle: 'dashed', opacity: 0.7 },
                  ]}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  placeholder="0"
                  value={fieldValue(team)}
                  onChangeText={(t) => {
                    const digits = t.replace(/[^0-9]/g, '');
                    setEnteredTeam(digits === '' ? null : team);
                    setPointsText(digits);
                  }}
                />
              </View>
            ))}
          </View>
          {pointsText !== '' && !pointsInRange && (
            <Text style={{ color: colors.red }}>Les points doivent être entre 0 et 162.</Text>
          )}
        </>
      )}

      {preview && (
        <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>
            <Text style={{ color: colors.teamA }}>{preview.points.A}</Text>
            {' – '}
            <Text style={{ color: colors.teamB }}>{preview.points.B}</Text>
          </Text>
          <Muted>Points inscrits · {outcomeLabel}</Muted>
        </View>
      )}

      <Button label="Valider la donne" disabled={!complete} onPress={submit} />
    </Card>
  );
}
