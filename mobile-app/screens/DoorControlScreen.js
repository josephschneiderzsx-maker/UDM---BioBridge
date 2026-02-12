import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { X, Activity, ChevronDown, Fingerprint, Lock, Unlock } from 'lucide-react-native';
import api from '../services/api';
import PrimaryButton from '../components/PrimaryButton';
import StatusBadge from '../components/StatusBadge';
import { colors, spacing, borderRadius } from '../constants/theme';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.5, 200);

export default function DoorControlScreen({ route, navigation }) {
  const { door } = route.params;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Secured');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const lockRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation - plus subtile
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.015,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const triggerSuccessAnimation = () => {
    setShowSuccess(true);
    
    // Ring animation - native driver only
    Animated.sequence([
      Animated.timing(ringAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(ringAnim, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start();

    // Lock rotation animation
    Animated.sequence([
      Animated.timing(lockRotateAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(lockRotateAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      setShowSuccess(false);
    }, 2800);
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
      const result = await api.getDoorStatus(door.id);
      setStatus(result.status || 'Unknown');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = status.toLowerCase() === 'unlocked' || status.toLowerCase() === 'open';
  
  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.4, 0],
  });

  const lockRotation = lockRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-25deg'],
  });

  const lockTranslateX = lockRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Minimal drag indicator */}
        <View style={styles.dragIndicator}>
          <View style={styles.dragHandle} />
        </View>

        {/* Close button - more subtle */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronDown size={24} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>

        {/* Door Info - cleaner typography */}
        <View style={styles.doorInfo}>
          <Text style={styles.doorName}>{door.name}</Text>
          <View style={styles.doorMeta}>
            <View style={styles.metaDot} />
            <Text style={styles.doorAddress}>
              {door.terminal_ip}:{door.terminal_port}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <StatusBadge status={status} size="small" />
          </View>
        </View>

        {/* Main Unlock Button - redesigned */}
        <View style={styles.mainButtonContainer}>
          {/* Success ring effect */}
          {showSuccess && (
            <Animated.View
              style={[
                styles.ringEffect,
                {
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
          )}
          
          <Animated.View
            style={[
              styles.mainButtonOuter,
              {
                transform: [{ scale: pulseAnim }],
                borderColor: showSuccess ? colors.success : (isUnlocked ? colors.success : colors.separator),
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.mainButton,
                isUnlocked && styles.mainButtonUnlocked,
                showSuccess && styles.mainButtonSuccess,
              ]}
              onPress={authenticateAndOpen}
              disabled={loading || isUnlocking}
              activeOpacity={0.85}
            >
              <Animated.View
                style={[
                  styles.lockIconContainer,
                  {
                    transform: [
                      { rotate: lockRotation },
                      { translateX: lockTranslateX },
                    ],
                  },
                ]}
              >
                {isUnlocked ? (
                  <Unlock size={48} color={colors.success} strokeWidth={2.5} />
                ) : (
                  <Lock size={48} color={colors.textPrimary} strokeWidth={2.5} />
                )}
              </Animated.View>
              
              {!isUnlocked && (
                <View style={styles.fingerprintBadge}>
                  <Fingerprint
                    size={14}
                    color={colors.textTertiary}
                    strokeWidth={2}
                  />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.mainButtonLabel}>
            {isUnlocking
              ? 'Unlocking...'
              : isUnlocked
              ? 'Unlocked'
              : 'Tap to unlock'}
          </Text>
        </View>

        {/* Action Buttons - refined */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.lockButton]}
            onPress={closeDoor}
            disabled={loading}
            activeOpacity={0.7}
          >
            <X size={18} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Lock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={getStatus}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Activity size={18} color={colors.textPrimary} strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>Status</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  dragIndicator: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.fillSecondary,
  },
  closeButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  doorInfo: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  doorName: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  doorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginRight: spacing.xs,
  },
  doorAddress: {
    fontSize: 14,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  statusContainer: {
    marginTop: spacing.xs,
  },
  mainButtonContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  ringEffect: {
    position: 'absolute',
    width: BUTTON_SIZE + 50,
    height: BUTTON_SIZE + 50,
    borderRadius: (BUTTON_SIZE + 50) / 2,
    borderWidth: 2,
    borderColor: colors.success,
  },
  mainButtonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1.5,
    padding: 4,
    backgroundColor: 'transparent',
  },
  mainButton: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  mainButtonUnlocked: {
    backgroundColor: colors.successDim,
  },
  mainButtonSuccess: {
    backgroundColor: colors.successDim,
  },
  lockIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.fillSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonLabel: {
    marginTop: spacing.lg,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  lockButton: {
    // Subtle differentiation
  },
  statusButton: {
    // Subtle differentiation
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
