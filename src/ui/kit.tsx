// Petits composants d'interface réutilisés dans tous les écrans.

import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

export const colors = {
  felt: '#1F5F3F', // vert tapis de jeu
  feltDark: '#164530',
  background: '#F4F1EA',
  card: '#FFFFFF',
  text: '#1D1D1B',
  muted: '#6B6B66',
  border: '#DDD8CC',
  teamA: '#1F6FB2',
  teamB: '#C2410C',
  red: '#B91C1C',
};

export function teamColor(team: 'A' | 'B') {
  return team === 'A' ? colors.teamA : colors.teamB;
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

type ButtonKind = 'primary' | 'secondary' | 'danger';

export function Button({
  label, onPress, kind = 'primary', disabled,
}: { label: string; onPress: () => void; kind?: ButtonKind; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' && styles.buttonPrimary,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'danger' && styles.buttonDanger,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
      ]}
    >
      <Text style={[styles.buttonLabel, kind === 'secondary' && { color: colors.felt }]}>{label}</Text>
    </Pressable>
  );
}

// Bouton à choisir parmi plusieurs (comme des boutons radio).
export function Chip({
  label, selected, onPress, color = colors.felt,
}: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
    >
      <Text style={[styles.chipLabel, { color: selected ? '#FFF' : color }]}>{label}</Text>
    </Pressable>
  );
}

export interface SegmentOption<T> {
  value: T;
  label: string;
  color?: string; // couleur de l'option (texte et fond une fois choisie)
  weight?: number; // largeur relative (1 par défaut)
}

// Une rangée de choix qui occupe toute la largeur de l'écran, sur une seule ligne.
// La taille du texte s'adapte pour que chaque libellé tienne dans sa case.
export function Segmented<T>({
  options, value, onChange, maxFontSize = 17,
}: { options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; maxFontSize?: number }) {
  const [width, setWidth] = useState(0);
  const gap = 6;
  const totalWeight = options.reduce((sum, o) => sum + (o.weight ?? 1), 0);
  const free = Math.max(width - gap * (options.length - 1), 0);
  return (
    <View style={{ flexDirection: 'row', gap }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {options.map((o) => {
        const selected = o.value === value;
        const color = o.color ?? colors.felt;
        const cell = (free * (o.weight ?? 1)) / totalWeight;
        // Environ 0,6 × la taille de police par caractère, avec 12 px de marge intérieure.
        const fontSize = width ? Math.max(9, Math.min(maxFontSize, (cell - 12) / (o.label.length * 0.6))) : maxFontSize;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { flex: o.weight ?? 1, borderColor: color }, selected && { backgroundColor: color }]}
          >
            <Text numberOfLines={1} style={{ fontSize, fontWeight: '600', color: selected ? '#FFF' : color }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: 16, paddingBottom: 48 },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 12 },
  card: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  buttonPrimary: { backgroundColor: colors.felt },
  buttonSecondary: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.felt },
  buttonDanger: { backgroundColor: colors.red },
  buttonLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipLabel: { fontSize: 15, fontWeight: '600' },
  segment: {
    borderWidth: 1.5, borderRadius: 10, minHeight: 44, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, backgroundColor: '#FFF', color: colors.text,
  },
});
