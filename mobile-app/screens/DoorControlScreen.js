import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { X, Unlock, Lock, Activity, Bell, BellOff } from 'lucide-react-native';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DoorControlScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const insets = useSafeAreaInsets();
  const { door } = route.params;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Secured');
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);

  // Animated translateY for swipe-to-dismiss
  const translateY = useRef(new Animated.Value(0)).current;

  // PanResponder attached ONLY to the drag handle
  const dragPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.4) {
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 230,
          useNativeDriver: true,
        }).start(() => navigation.goBack());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }).start();
      }
    },
  })).current;

  // Pulse ring animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 950, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    loadLicenseStatus();
    loadNotificationPref();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadLicenseStatus();
      loadNotificationPref();
    });
    return unsub;
  }, [navigation]);

  const loadLicenseStatus = async () => {
    try {
      const data = await api.getLicenseStatus();
      setLicenseStatus(data);
    } catch {
      setLicenseStatus(null);
    }
  };

  const loadNotificationPref = async () => {
    try {
      const prefs = await api.getNotificationPreferences();
      const pref = prefs.find(p => p.door_id === door.id);
      setNotifyEnabled(pref
        ? pref.notify_on_open || pref.notify_on_close || pref.notify_on_forced
        : false
      );
    } catch {
      setNotifyEnabled(false);
    }
  };

  const authenticateAndOpen = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (hasHardware) {
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: `Unlock ${door.name}`,
            cancelLabel: 'Cancel',
            fallbackLabel: 'Use Passcode',
            disableDeviceFallback: false,
          });
          if (!result.success) return;
        }
      }
      await openDoor();
    } catch {
      Alert.alert('Error', 'Authentication failed');
    }
  };

  const openDoor = async () => {
    setLoading(true);
    try {
      await api.openDoor(door.id, door.default_delay || 3000);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('Unlocked');
      setTimeout(() => setStatus('Secured'), door.default_delay || 3000);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.isLicenseExpired) {
        Alert.alert('License Expired', error.message, [
          { text: 'OK', onPress: () => resetToLogin?.() },
        ]);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const closeDoor = async () => {
    setLoading(true);
    try {
      await api.closeDoor(door.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('Secured');
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.isLicenseExpired) {
        Alert.alert('License Expired', error.message, [
          { text: 'OK', onPress: () => resetToLogin?.() },
        ]);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isExpired = licenseStatus?.status === 'expired' || licenseStatus?.status === 'grace';
  const unlocked = status === 'Unlocked';
  const btnColor = unlocked ? colors.success : colors.primary;

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: colors.background, transform: [{ translateY }] },
      ]}
    >
      {/* Top safe area only — bottom handled manually */}
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* ── Drag handle — PanResponder here only ── */}
        <View style={styles.handleArea} {...dragPanResponder.panHandlers}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.doorName, { color: colors.textPrimary }]} numberOfLines={1}>
              {door.name}
            </Text>
            <Text style={[styles.doorIp, { color: colors.textTertiary }]}>
              {door.terminal_ip}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('NotificationSettings', { door })}
          >
            {notifyEnabled
              ? <Bell size={20} color={colors.primary} strokeWidth={2} />
              : <BellOff size={20} color={colors.textTertiary} strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>

        {/* License warning */}
        {isExpired && (
          <View style={[styles.licenseBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger }]}>
            <Text style={[styles.licenseText, { color: colors.danger }]}>
              {licenseStatus.status === 'grace' ? 'License expiring soon' : 'License expired'}
              {' — '}sales@urzis.com
            </Text>
          </View>
        )}

        {/* ── Status badge ── */}
        <View style={styles.statusRow}>
          <StatusBadge status={status} />
        </View>

        {/* ── Centered button zone ── */}
        <View style={styles.centerZone}>
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: `${btnColor}28`,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Main unlock button */}
          <TouchableOpacity
            style={[
              styles.unlockBtn,
              {
                backgroundColor: btnColor,
                shadowColor: btnColor,
                opacity: loading ? 0.75 : 1,
              },
            ]}
            onPress={authenticateAndOpen}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <>
                {unlocked
                  ? <Unlock size={42} color="#000" strokeWidth={2} />
                  : <Lock size={42} color="#000" strokeWidth={2} />
                }
                <Text style={styles.unlockLabel}>
                  {unlocked ? 'Unlocked' : 'Tap to Unlock'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Lock now button */}
          {unlocked && (
            <TouchableOpacity
              style={[styles.lockNowBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={closeDoor}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Lock size={15} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.lockNowText, { color: colors.textSecondary }]}>Lock now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bottom actions — respects navigation bar height ── */}
        <View style={[styles.actionsBar, {
          backgroundColor: colors.card,
          borderColor: colors.border,
          marginBottom: insets.bottom + 12,
        }]}>
          <TouchableOpacity
            style={styles.action}
            onPress={() => navigation.navigate('ActivityLog', { door })}
            activeOpacity={0.7}
          >
            <Activity size={19} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Activity</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.action}
            onPress={() => navigation.navigate('NotificationSettings', { door })}
            activeOpacity={0.7}
          >
            <Bell size={19} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Notifications</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
}

const BTN_SIZE = 172;
const RING_SIZE = BTN_SIZE + 40;

const styles = StyleSheet.create({
  root: { flex: 1 },
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    // Larger touch target for the drag handle
    paddingHorizontal: 80,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  doorName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  doorIp: {
    fontSize: 12,
    marginTop: 1,
  },
  licenseBanner: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  licenseText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  // Centered zone takes all available space and centers the button
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 14,
  },
  unlockBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  unlockLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.2,
  },
  lockNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1,
  },
  lockNowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 12,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  actionDivider: {
    width: 1,
    marginVertical: 12,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
