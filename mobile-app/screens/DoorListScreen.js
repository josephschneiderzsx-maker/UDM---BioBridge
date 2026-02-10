import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';

export default function DoorListScreen({ navigation }) {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDoors();
  }, []);

  const loadDoors = async () => {
    try {
      setLoading(true);
      const doorsList = await api.getDoors();
      setDoors(doorsList);
    } catch (error) {
      Alert.alert('Erreur', error.message, [
        {
          text: 'OK',
          onPress: () => {
            if (error.message === 'Session expired') {
              navigation.replace('Login');
            }
          },
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDoors();
  };

  const handleDoorPress = (door) => {
    navigation.navigate('DoorControl', { door });
  };

  if (loading && doors.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Chargement des portes...</Text>
      </View>
    );
  }

  if (doors.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucune porte disponible</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadDoors}>
          <Text style={styles.refreshButtonText}>Actualiser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.doorItem}
            onPress={() => handleDoorPress(item)}
          >
            <Text style={styles.doorName}>{item.name}</Text>
            <Text style={styles.doorInfo}>
              {item.terminal_ip}:{item.terminal_port}
            </Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  doorItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  doorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doorInfo: {
    fontSize: 14,
    color: '#666',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
