import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { computeGame, previewDeal, teamOfSeat, TOTAL_CARD_POINTS } from '../engine/scoring';
import { Game, PlayedDeal, Seat, Team, Trump } from '../engine/types';
import { useSalon } from '../store/salon';
import { formatDate, SEAT_LABELS, teamName, TRUMPS, trumpSymbol } from '../ui/format';
import { Button, Card, Chip, colors, Muted, Row, Screen, styles, teamColor, Title } from '../ui/kit';
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
  const { playerName, addDeal, undoLastDeal, deleteGame } = useSalon();
  const state = computeGame(game);
  const names: [string, string] = [teamName(game, 'A', playerName), teamName(game, 'B', playerName)];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seatName = (seat: Seat) => playerName(game.seats[seat]);
  const lastLine = state.lines[state.lines.length - 1];

  return (
    <Screen>
      <Card>
        <Muted>{formatDate(game.createdAt)} · en {game.settings.target}{game.settings.suspense ? ' · point en suspens' : ''}</Muted>
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
        {state.winner ? (
          <Text style={{ fontSize: 18, fontWeight: '800', color: teamColor(state.winner), textAlign: 'center' }}>
            🏆 {names[state.winner === 'A' ? 0 : 1]} gagnent la partie !
          </Text>
        ) : (
          <Text style={{ fontSize: 16 }}>
            Donneur : <Text style={{ fontWeight: '700' }}>{seatName(state.nextDealer)}</Text> ({SEAT_LABELS[state.nextDealer].toLowerCase()})
          </Text>
        )}
      </Card>

      {!state.winner && (
        <DealForm
          game={game}
          dealer={state.nextDealer}
          names={names}
          onSubmit={(deal) => addDeal(game.id, deal)}
          onPass={() => addDeal(game.id, { kind: 'passed', dealer: state.nextDealer })}
        />
      )}

      {state.lines.length > 0 && (
        <Card>
          <Title>Évolution du score</Title>
          <ScoreChart totals={state.lines.map((l) => l.total)} target={game.settings.target} labels={names} />
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
            return (
              <View key={line.index} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, gap: 2 }}>
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
              </View>
            );
          })}
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
  game, dealer, names, onSubmit, onPass,
}: {
  game: Game; dealer: Seat; names: [string, string];
  onSubmit: (deal: PlayedDeal) => void; onPass: () => void;
}) {
  const { playerName } = useSalon();
  const [taker, setTaker] = useState<Seat | null>(null);
  const [trump, setTrump] = useState<Trump | null>(null);
  const [enteredTeam, setEnteredTeam] = useState<Team | null>(null);
  const [pointsText, setPointsText] = useState('');
  const [belote, setBelote] = useState<Team | null>(null);
  const [capot, setCapot] = useState<Team | null>(null);

  const points = parseInt(pointsText, 10);
  const pointsValid = capot !== null || (enteredTeam !== null && points >= 0 && points <= TOTAL_CARD_POINTS);
  const complete = taker !== null && trump !== null && pointsValid;

  const deal: PlayedDeal | null = complete
    ? {
      kind: 'played', dealer, taker: taker!, trump: trump!,
      enteredTeam: enteredTeam ?? 'A', enteredPoints: capot ? 0 : points,
      belote, capot,
    }
    : null;
  const preview = deal ? previewDeal(deal, game.settings) : null;

  const reset = () => {
    setTaker(null); setTrump(null); setEnteredTeam(null); setPointsText(''); setBelote(null); setCapot(null);
  };

  const teamChips = (value: Team | null, set: (t: Team | null) => void, noneLabel?: string) => (
    <Row>
      {noneLabel && <Chip label={noneLabel} selected={value === null} onPress={() => set(null)} />}
      {(['A', 'B'] as Team[]).map((t, i) => (
        <Chip key={t} label={names[i]} color={teamColor(t)} selected={value === t} onPress={() => set(t)} />
      ))}
    </Row>
  );

  let outcomeText = '';
  if (preview && taker !== null) {
    const takerTeam = teamOfSeat(taker);
    if (preview.result.outcome === 'tie') {
      outcomeText = game.settings.suspense ? 'Égalité : la donne sera mise en suspens.' : 'Égalité.';
    } else if (preview.result.outcome === 'failed') {
      outcomeText = `Dedans : ${names[takerTeam === 'A' ? 0 : 1]} chutent.`;
    } else {
      outcomeText = capot ? 'Capot !' : 'Contrat réussi.';
    }
  }

  return (
    <Card>
      <Title>Nouvelle donne</Title>

      <Muted>Qui a pris ?</Muted>
      <Row>
        {[0, 1, 2, 3].map((seat) => (
          <Chip
            key={seat}
            label={playerName(game.seats[seat])}
            color={teamColor(teamOfSeat(seat as Seat))}
            selected={taker === seat}
            onPress={() => setTaker(seat as Seat)}
          />
        ))}
      </Row>

      <Muted>Atout</Muted>
      <Row>
        {TRUMPS.map((t) => (
          <Chip
            key={t.value}
            label={`${t.symbol} ${t.label}`}
            color={t.value === 'coeur' || t.value === 'carreau' ? colors.red : colors.text}
            selected={trump === t.value}
            onPress={() => setTrump(t.value)}
          />
        ))}
      </Row>

      <Muted>Belote-rebelote</Muted>
      {teamChips(belote, setBelote, 'Aucune')}

      <Muted>Capot</Muted>
      {teamChips(capot, setCapot, 'Non')}

      {capot === null && (
        <>
          <Muted>Points de quelle équipe ? (cartes seulement, sur 162)</Muted>
          {teamChips(enteredTeam, setEnteredTeam)}
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="Points, de 0 à 162"
            value={pointsText}
            onChangeText={(t) => setPointsText(t.replace(/[^0-9]/g, ''))}
          />
          {pointsText !== '' && !(points >= 0 && points <= TOTAL_CARD_POINTS) && (
            <Text style={{ color: colors.red }}>Les points doivent être entre 0 et 162.</Text>
          )}
        </>
      )}

      {preview && (
        <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, gap: 4 }}>
          <Text style={{ fontWeight: '600' }}>{outcomeText}</Text>
          <Text>
            <Text style={{ color: colors.teamA, fontWeight: '700' }}>{names[0]} : +{preview.points.A}</Text>
            {'   '}
            <Text style={{ color: colors.teamB, fontWeight: '700' }}>{names[1]} : +{preview.points.B}</Text>
          </Text>
        </View>
      )}

      <Button label="Valider la donne" disabled={!deal} onPress={() => { if (deal) { onSubmit(deal); reset(); } }} />
      <Button label="Donneur suivant (donne passée)" kind="secondary" onPress={() => { onPass(); reset(); }} />
    </Card>
  );
}
