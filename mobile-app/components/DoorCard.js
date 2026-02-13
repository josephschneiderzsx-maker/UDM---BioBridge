import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { ChevronRight, Shield } from 'lucide-react-native';
import { borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function DoorCard({ door, onPress, onLongPress, index = 0 }) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = index * 70;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 350,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    onPress?.(door);
  };

  const handleLongPress = () => {
    onLongPress?.(door);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: translateAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.card, {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
        }]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.iconContainer}>
          <Shield size={20} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.doorName, { color: colors.textPrimary }]} numberOfLines={1}>
            {door.name}
          </Text>
          <Text style={[styles.doorInfo, { color: colors.textTertiary }]} numberOfLines={1}>
            {door.terminal_ip}
          </Text>
        </View>

        <View style={[styles.trailing, { backgroundColor: colors.fillTertiary }]}>
          <ChevronRight
            size={16}
            color={colors.textTertiary}
            strokeWidth={2.5}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  doorName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  doorInfo: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  trailing: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
