import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X, Radio } from 'lucide-react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function DiscoveredDevicesScreen({ navigation }) {
  const { colors } = useTheme();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadDevices(); }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const list = await api.getDiscoveredDevices();
      setDevices(list);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (device) => {
    setActionLoading(device.id);
    try {
      await api.approveDiscoveredDevice(device.id);
      setDevices(prev => prev.filter(d => d.id !== device.id));
      Alert.alert('Added', `"${device.device_name}" has been added as a door.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = (device) => {
    Alert.alert('Dismiss', `Ignore "${device.device_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(device.id);
          try {
            await api.dismissDiscoveredDevice(device.id);
            setDevices(prev => prev.filter(d => d.id !== device.id));
          } catch (error) {
            Alert.alert('Error', error.message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Discovered Devices</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.content, devices.length === 0 && styles.emptyContent]}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryDim }]}>
                <Radio size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{item.device_name}</Text>
                <Text style={[styles.deviceIp, { color: colors.textSecondary }]}>{item.device_ip}</Text>
              </View>
              {actionLoading === item.id ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primaryDim }]}
                    onPress={() => handleApprove(item)}
                  >
                    <Check size={18} color={colors.primary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.dangerDim }]}
                    onPress={() => handleDismiss(item)}
                  >
                    <X size={18} color={colors.danger} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No new devices</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                New ZKTeco devices on your network will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  emptyContent: { flex: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  deviceIp: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
