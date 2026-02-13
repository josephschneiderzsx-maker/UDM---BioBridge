import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { X, Activity, ChevronDown, Fingerprint, Lock, Unlock, Clock } from 'lucide-react-native';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../components/Logo';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.45, 180);
const DISMISS_THRESHOLD = 120;

export default function DoorControlScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const { door } = route.params;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Secured');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const lockRotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 1.5),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => navigation.goBack());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.02,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const triggerSuccessAnimation = () => {
    setShowSuccess(true);

    Animated.stagger(120, [
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(ring2Anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(ring2Anim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.timing(lockRotateAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(lockRotateAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const authenticateAndOpen = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        await openDoor();
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        await openDoor();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await openDoor();
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication failed');
    }
  };

  const openDoor = async () => {
    setLoading(true);
    setIsUnlocking(true);

    try {
      await api.openDoor(door.id, door.default_delay || 3000);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('Unlocked');
      triggerSuccessAnimation();

      setTimeout(() => {
        setStatus('Secured');
        setIsUnlocking(false);
      }, 3000);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message);
      setIsUnlocking(false);
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
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    setLoading(true);
    try {
      // Queue the status command and get command_id
      const queueResult = await api.getDoorStatus(door.id);
      const commandId = queueResult.command_id;
      if (!commandId) {
        setStatus('Unknown');
        return;
      }

      // Poll for result every 500ms, max 10s
      const maxWait = 10000;
      const interval = 500;
      let elapsed = 0;

      while (elapsed < maxWait) {
        await new Promise(resolve => setTimeout(resolve, interval));
        elapsed += interval;

        try {
          const cmdResult = await api.getCommandResult(commandId);
          if (cmdResult.status === 'completed') {
            // Parse the result string to extract status
            let doorStatus = 'Unknown';
            if (cmdResult.result) {
              try {
                const parsed = JSON.parse(cmdResult.result);
                doorStatus = parsed.status || 'Unknown';
              } catch {
                doorStatus = cmdResult.result;
              }
            }
            setStatus(doorStatus === 'connected' ? 'Secured' : doorStatus.charAt(0).toUpperCase() + doorStatus.slice(1));
            return;
          } else if (cmdResult.status === 'failed') {
            Alert.alert('Error', cmdResult.error_message || 'Status check failed');
            return;
          }
          // Still pending/processing, keep polling
        } catch {
          // Polling error, continue
        }
      }

      // Timeout
      setStatus('Timeout');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = status.toLowerCase() === 'unlocked' || status.toLowerCase() === 'open';

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 0],
  });
  const ring2Scale = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const ring2Opacity = ring2Anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.3, 0],
  });
  const lockRotation = lockRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-20deg'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.content,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { translateY }],
          },
        ]}
      >
        {/* Drag indicator */}
        <View style={styles.dragIndicator}>
          <View style={[styles.dragHandle, {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          }]} />
        </View>

        {/* Close */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronDown size={20} color={colors.textTertiary} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Door Info */}
        <View style={styles.doorInfo}>
          <Logo width={120} />
          <Text style={[styles.doorName, { color: colors.textPrimary }]}>{door.name}</Text>
          <Text style={[styles.doorAddress, { color: colors.textTertiary }]}>
            {door.terminal_ip}:{door.terminal_port}
          </Text>
          <View style={styles.statusWrapper}>
            <StatusBadge status={status} size="small" />
          </View>
        </View>

        {/* Main Unlock Button */}
        <View style={styles.buttonArea}>
          {showSuccess && (
            <>
              <Animated.View
                style={[
                  styles.ring,
                  {
                    transform: [{ scale: ringScale }],
                    opacity: ringOpacity,
                    borderColor: colors.success,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.ring,
                  {
                    transform: [{ scale: ring2Scale }],
                    opacity: ring2Opacity,
                    borderColor: colors.success,
                  },
                ]}
              />
            </>
          )}

          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowAnim,
                backgroundColor: showSuccess
                  ? 'rgba(48, 209, 88, 0.08)'
                  : 'rgba(0, 170, 255, 0.06)',
              },
            ]}
          />

          <Animated.View
            style={[
              styles.buttonOuter,
              {
                transform: [{ scale: breatheAnim }],
                borderColor: showSuccess
                  ? colors.success
                  : isUnlocked
                  ? colors.success
                  : isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: colors.surface, borderColor: colors.separator },
                isUnlocked && { backgroundColor: colors.successDim, borderColor: 'rgba(48, 209, 88, 0.15)' },
                showSuccess && { backgroundColor: colors.successDim, borderColor: 'rgba(48, 209, 88, 0.2)' },
              ]}
              onPress={authenticateAndOpen}
              disabled={loading || isUnlocking}
              activeOpacity={0.85}
            >
              <Animated.View
                style={{
                  transform: [{ rotate: lockRotation }],
                }}
              >
                {isUnlocked ? (
                  <Unlock size={44} color={colors.success} strokeWidth={2} />
                ) : (
                  <Lock size={44} color={colors.textPrimary} strokeWidth={2} />
                )}
              </Animated.View>

              {!isUnlocked && (
                <View style={[styles.biometricHint, {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                }]}>
                  <Fingerprint size={12} color={colors.textTertiary} strokeWidth={2} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
            {isUnlocking
              ? 'Unlocking...'
              : isUnlocked
              ? 'Unlocked'
              : 'Tap to unlock'}
          </Text>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={closeDoor}
            disabled={loading}
            activeOpacity={0.7}
          >
            <X size={16} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Lock</Text>
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.separator }]} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={getStatus}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Activity size={16} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Status</Text>
          </TouchableOpacity>

          <View style={[styles.actionDivider, { backgroundColor: colors.separator }]} />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ActivityLog', { doorId: door.id, doorName: door.name })}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Clock size={16} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>History</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  dragIndicator: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  doorInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  doorName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  doorAddress: {
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  statusWrapper: {
    marginTop: 2,
  },
  buttonArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  ring: {
    position: 'absolute',
    width: BUTTON_SIZE + 40,
    height: BUTTON_SIZE + 40,
    borderRadius: (BUTTON_SIZE + 40) / 2,
    borderWidth: 1.5,
  },
  glow: {
    position: 'absolute',
    width: BUTTON_SIZE + 80,
    height: BUTTON_SIZE + 80,
    borderRadius: (BUTTON_SIZE + 80) / 2,
  },
  buttonOuter: {
    width: BUTTON_SIZE + 8,
    height: BUTTON_SIZE + 8,
    borderRadius: (BUTTON_SIZE + 8) / 2,
    borderWidth: 1.5,
    padding: 3,
  },
  mainButton: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  biometricHint: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    gap: 6,
  },
  actionDivider: {
    width: 1,
    height: 24,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});
