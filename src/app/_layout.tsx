import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SalonProvider } from '../store/salon';
import { colors } from '../ui/kit';

export default function Layout() {
  return (
    <SalonProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.felt },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Dix de Der' }} />
        <Stack.Screen name="nouvelle-partie" options={{ title: 'Nouvelle partie' }} />
        <Stack.Screen name="partie" options={{ title: 'Partie' }} />
        <Stack.Screen name="historique" options={{ title: 'Historique' }} />
        <Stack.Screen name="stats" options={{ title: 'Statistiques' }} />
        <Stack.Screen name="joueurs" options={{ title: 'Joueurs' }} />
      </Stack>
    </SalonProvider>
  );
}
