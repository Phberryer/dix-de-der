import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { computeStats, MIN_GAMES_FOR_RANKING, percent, PlayerStats, ranking, RANKING_TOP } from '../engine/stats';
import { useSalon } from '../store/salon';
import { TRUMPS } from '../ui/format';
import { Button, Card, Chip, colors, Muted, Row, Screen, Title } from '../ui/kit';

const pct = (v: number | null) => (v === null ? '—' : `${v} %`);

export default function Stats() {
  const { salon } = useSalon();
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const stats = computeStats(salon.players, salon.games);
  const ranked = ranking(stats);
  const visible = showAll ? ranked : ranked.slice(0, RANKING_TOP);
  const current = stats.find((s) => s.player.id === selected);

  return (
    <Screen>
      <Card>
        <Title>Classement</Title>
        <Muted>
          Par % de victoires, puis par moyenne de points. Il faut {MIN_GAMES_FOR_RANKING} parties jouées pour y apparaître.
        </Muted>
        {ranked.length === 0 && <Muted>Personne n'a encore joué {MIN_GAMES_FOR_RANKING} parties terminées.</Muted>}
        {visible.map((s, i) => (
          <Pressable key={s.player.id} onPress={() => setSelected(s.player.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border }}>
              <Text style={{ width: 28, fontSize: 18, fontWeight: '800', color: colors.felt }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>{s.player.name}</Text>
                <Muted>{s.games} parties · moyenne {s.averagePoints ?? '—'} pts</Muted>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{pct(s.winRate)}</Text>
            </View>
          </Pressable>
        ))}
        {ranked.length > RANKING_TOP && (
          <Button
            label={showAll ? `Voir les ${RANKING_TOP} premiers` : 'Voir le classement complet'}
            kind="secondary"
            onPress={() => setShowAll(!showAll)}
          />
        )}
      </Card>

      <Card>
        <Title>Fiche d'un joueur</Title>
        <Row>
          {salon.players.map((p) => (
            <Chip key={p.id} label={p.name} selected={selected === p.id} onPress={() => setSelected(p.id)} />
          ))}
        </Row>
        {current && <PlayerCard s={current} />}
      </Card>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function PlayerCard({ s }: { s: PlayerStats }) {
  if (s.games === 0) return <Muted>{s.player.name} n'a pas encore terminé de partie.</Muted>;
  const perGame = (n: number) => (Math.round((n / s.games) * 10) / 10).toString();
  return (
    <View>
      <Line label="Parties jouées" value={String(s.games)} />
      <Line label="Victoires" value={`${pct(s.winRate)} (${s.wins})`} />
      <Line label="Moyenne de points par partie" value={String(s.averagePoints ?? '—')} />
      <Line label="Prises (part des donnes jouées)" value={`${pct(s.takeRate)} (${s.takes})`} />
      <Line label="Réussite des prises" value={`${pct(s.takeSuccess)} (${s.takesMade}/${s.takes})`} />
      <Line
        label="Meilleur partenaire"
        value={s.bestPartner ? `${s.bestPartner.player.name} · ${s.bestPartner.rate} % (${s.bestPartner.games} p.)` : '—'}
      />
      <Line
        label="Pire adversaire"
        value={s.worstOpponent ? `${s.worstOpponent.player.name} · ${s.worstOpponent.rate} % (${s.worstOpponent.games} p.)` : '—'}
      />
      <Line label="Capots réalisés par partie" value={perGame(s.capotsMade)} />
      <Line label="Capots subis par partie" value={perGame(s.capotsSuffered)} />
      <Line label="Meilleure série de victoires" value={String(s.bestStreak)} />
      <Text style={{ fontWeight: '600', marginTop: 8 }}>Réussite des prises par atout</Text>
      {TRUMPS.map((t) => (
        <Line
          key={t.value}
          label={`${t.symbol} ${t.label}`}
          value={`${pct(percent(s.takeSuccessByTrump[t.value]))} (${s.takeSuccessByTrump[t.value].total} prises)`}
        />
      ))}
    </View>
  );
}
