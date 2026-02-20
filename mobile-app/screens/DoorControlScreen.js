import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions,
  Modal, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { X, Unlock, Lock, Activity, Bell, BellOff, Shield } from 'lucide-react-native';
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
  const [showBioPulse, setShowBioPulse] = useState(false);

  // Swipe-down-to-dismiss
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 90 || g.vy > 0.55) {
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

  // Pulse animation for the button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
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
          setShowBioPulse(true);
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: `Unlock ${door.name}`,
            cancelLabel: 'Cancel',
            fallbackLabel: 'Use Passcode',
            disableDeviceFallback: false,
          });
          setShowBioPulse(false);
          if (!result.success) return;
        }
      }
      await openDoor();
    } catch {
      setShowBioPulse(false);
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
      style={[styles.root, { backgroundColor: colors.background, transform: [{ translateY }] }]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Drag handle */}
        <View style={styles.dragArea} {...panResponder.panHandlers}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <X size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {door.name}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
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

        {/* Status */}
        <View style={styles.statusRow}>
          <StatusBadge status={status} />
        </View>

        {/* Thumb zone — button pushed toward lower center */}
        <View style={styles.thumbZone}>
          {/* Outer glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: `${btnColor}30`,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

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

        {/* Bottom actions bar */}
        <View
          style={[
            styles.actionsBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginBottom: (insets.bottom || 8) + 8,
            },
          ]}
        >
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  dragArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  dragHandle: {
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerSub: {
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
  // Thumb zone — flex end puts button in lower 40% of screen
  thumbZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  glowRing: {
    position: 'absolute',
    bottom: 32 + 180 / 2 - 115,
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 12,
  },
  unlockBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
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
    marginTop: 22,
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
