import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import GlassBackground from '../components/GlassBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X, Radio } from 'lucide-react-native';
import api from '../services/api';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const FLOATING_HEADER_HEIGHT = 120;
const TAB_BAR_PADDING_BOTTOM = 100;

export default function DiscoveredDevicesScreen({ navigation }) {
  const { colors } = useTheme();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadDevices();
  }, []);

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

  const handleDismiss = async (device) => {
    Alert.alert(
      'Dismiss',
      `Ignore "${device.device_name}"? It won't appear again unless rediscovered.`,
      [
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
      ]
    );
  };

  const renderDevice = ({ item }) => {
    const isLoading = actionLoading === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        <View style={styles.cardInfo}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryDim }]}>
            <Radio size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{item.device_name}</Text>
            <Text style={[styles.deviceIp, { color: colors.textTertiary }]}>
              {item.terminal_ip}:{item.terminal_port}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.successDim }]}
                onPress={() => handleApprove(item)}
                activeOpacity={0.7}
              >
                <Check size={18} color={colors.success} strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.dismissBtn, { backgroundColor: colors.errorDim || 'rgba(255,69,58,0.1)' }]}
                onPress={() => handleDismiss(item)}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.error || '#FF453A'} strokeWidth={2.5} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerFloating}>
        <GlassBackground intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={20} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Detected Doors</Text>
        </View>
      </View>

      <View style={[styles.contentWrap, { paddingTop: FLOATING_HEADER_HEIGHT }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          These doors were discovered from Ingress. Choose which ones to add.
        </Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No pending doors to review.</Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDevice}
            contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_PADDING_BOTTOM }]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerFloating: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  contentWrap: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  deviceIp: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {},
  dismissBtn: {},
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
