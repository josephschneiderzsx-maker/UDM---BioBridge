import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../services/api';

export default function DoorControlScreen({ route, navigation }) {
  const { door } = route.params;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Unknown');

  const authenticateAndOpen = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert('Erreur', 'Aucun capteur biométrique disponible');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert('Erreur', 'Aucune empreinte/FaceID configurée');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise pour ouvrir la porte',
        cancelLabel: 'Annuler',
        fallbackLabel: 'Utiliser le mot de passe',
      });

      if (result.success) {
        await openDoor();
      } else {
        Alert.alert('Authentification annulée', 'Vous devez vous authentifier pour ouvrir la porte');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'authentification biométrique');
    }
  };

  const openDoor = async () => {
    setLoading(true);
    try {
      const result = await api.openDoor(door.id, door.default_delay || 3000);
      Alert.alert('Succès', 'Commande d\'ouverture envoyée', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const closeDoor = async () => {
    setLoading(true);
    try {
      const result = await api.closeDoor(door.id);
      Alert.alert('Succès', 'Commande de fermeture envoyée');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    setLoading(true);
    try {
      const result = await api.getDoorStatus(door.id);
      setStatus(result.status || 'Unknown');
      Alert.alert('Statut', `La porte est: ${result.status || 'Unknown'}`);
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.doorInfo}>
        <Text style={styles.doorName}>{door.name}</Text>
        <Text style={styles.doorDetails}>
          {door.terminal_ip}:{door.terminal_port}
        </Text>
        <Text style={styles.statusLabel}>Statut: {status}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.openButton, loading && styles.buttonDisabled]}
          onPress={authenticateAndOpen}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ouvrir la porte</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.closeButton, loading && styles.buttonDisabled]}
          onPress={closeDoor}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Fermer la porte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.statusButton, loading && styles.buttonDisabled]}
          onPress={getStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Vérifier le statut</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  doorInfo: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  doorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  doorDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#999',
  },
  actions: {
    flex: 1,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  statusButton: {
    backgroundColor: '#2196F3',
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
