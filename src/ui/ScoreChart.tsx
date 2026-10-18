// Graphique de l'évolution du score des deux équipes, donne après donne.

import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { Score } from '../engine/scoring';
import { colors } from './kit';

export function ScoreChart({ totals, target, labels }: { totals: Score[]; target: number; labels: [string, string] }) {
  const [width, setWidth] = useState(0);
  const height = 200;
  const pad = { left: 36, right: 12, top: 12, bottom: 24 };

  const points = [{ A: 0, B: 0 }, ...totals];
  const maxY = Math.max(target, ...points.map((p) => Math.max(p.A, p.B)));
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : 0);
  const y = (v: number) => pad.top + plotH - (v / maxY) * plotH;
  const line = (team: 'A' | 'B') => points.map((p, i) => `${x(i)},${y(p[team])}`).join(' ');

  const ticks = [0, Math.round(maxY / 2), maxY];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Graphique du score">
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={pad.left - 6} y={y(t) + 4} fontSize={11} fill={colors.muted} textAnchor="end">
              {t}
            </SvgText>
          ))}
          <Line
            x1={pad.left} x2={width - pad.right} y1={y(target)} y2={y(target)}
            stroke={colors.felt} strokeWidth={1.5} strokeDasharray="5,4"
          />
          <Polyline points={line('A')} fill="none" stroke={colors.teamA} strokeWidth={2.5} />
          <Polyline points={line('B')} fill="none" stroke={colors.teamB} strokeWidth={2.5} />
          {points.length > 1 && (
            <>
              <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1].A)} r={4} fill={colors.teamA} />
              <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1].B)} r={4} fill={colors.teamB} />
            </>
          )}
          <SvgText x={width - pad.right} y={height - 6} fontSize={11} fill={colors.muted} textAnchor="end">
            {points.length - 1} donne{points.length > 2 ? 's' : ''}
          </SvgText>
        </Svg>
      )}
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.teamA, fontWeight: '600' }}>— {labels[0]}</Text>
        <Text style={{ color: colors.teamB, fontWeight: '600' }}>— {labels[1]}</Text>
        <Text style={{ color: colors.felt }}>- - Score de fin ({target})</Text>
      </View>
    </View>
  );
}
