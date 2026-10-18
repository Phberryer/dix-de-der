import { useState } from 'react';
import { TextInput } from 'react-native';

import { useSalon } from '../store/salon';
import { Button, Card, Muted, Row, Screen, styles, Title } from '../ui/kit';

export default function Players() {
  const { salon, addPlayer, renamePlayer } = useSalon();
  const [name, setName] = useState('');

  const add = () => {
    if (!name.trim()) return;
    addPlayer(name);
    setName('');
  };

  return (
    <Screen>
      <Card>
        <Title>Ajouter un joueur</Title>
        <Row style={{ flexWrap: 'nowrap' }}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Prénom" value={name} onChangeText={setName} onSubmitEditing={add} />
          <Button label="Ajouter" onPress={add} />
        </Row>
      </Card>
      <Card>
        <Title>Joueurs du salon</Title>
        {salon.players.length === 0 && <Muted>Aucun joueur pour l'instant.</Muted>}
        {salon.players.map((p) => (
          <PlayerRow key={p.id} name={p.name} onRename={(n) => renamePlayer(p.id, n)} />
        ))}
        {salon.players.length > 0 && <Muted>Touche un nom pour le corriger.</Muted>}
      </Card>
    </Screen>
  );
}

function PlayerRow({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [value, setValue] = useState(name);
  const save = () => {
    if (value.trim() && value.trim() !== name) onRename(value);
    else setValue(name);
  };
  return <TextInput style={styles.input} value={value} onChangeText={setValue} onBlur={save} onSubmitEditing={save} />;
}
