import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function ServerConfigScreen({ navigation }) {
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une URL de serveur');
      return;
    }

    setLoading(true);
    try {
      await api.setServerUrl(serverUrl.trim());
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>URL du serveur</Text>
      <TextInput
        style={styles.input}
        value={serverUrl}
        onChangeText={setServerUrl}
        placeholder="http://localhost:8080"
        autoCapitalize="none"
        keyboardType="url"
      />
      <Text style={styles.hint}>
        Exemple: http://192.168.1.100:8080 ou https://door.monitoring.urzis.com
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Enregistrement...' : 'Continuer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
