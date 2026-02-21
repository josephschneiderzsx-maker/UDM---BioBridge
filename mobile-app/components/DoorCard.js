import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { ChevronRight, DoorOpen } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

export default function DoorCard({ door, onPress, onLongPress }) {
  const { colors } = useTheme();
  const { scaleFont, spacing, cardPadding, iconSize, isSmallPhone, isVerySmallPhone } = useResponsive();
  
  // Subtle scale animation on press
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const padding = cardPadding();
  const iconBoxSize = isVerySmallPhone ? 36 : isSmallPhone ? 40 : 42;
  const doorIconSize = iconSize(20);
  const chevronSize = iconSize(16);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.border,
          paddingVertical: padding.vertical,
          paddingHorizontal: padding.horizontal,
        }]}
        onPress={() => onPress?.(door)}
        onLongPress={() => onLongPress?.(door)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayLongPress={400}
      >
        <View style={[styles.iconBox, { 
          backgroundColor: colors.primaryDim,
          width: iconBoxSize,
          height: iconBoxSize,
          borderRadius: spacing(12),
        }]}>
          <DoorOpen size={doorIconSize} color={colors.primary} strokeWidth={2} />
        </View>

        <View style={styles.info}>
          <Text 
            style={[styles.name, { 
              color: colors.textPrimary,
              fontSize: scaleFont(15),
            }]} 
            numberOfLines={1}
          >
            {door.name}
          </Text>
          <Text 
            style={[styles.ip, { 
              color: colors.textTertiary,
              fontSize: scaleFont(12),
            }]} 
            numberOfLines={1}
          >
            {door.terminal_ip}
            {door.port ? `:${door.port}` : ''}
          </Text>
        </View>

        <View style={styles.right}>
          {door.agent_name && (
            <Text 
              style={[styles.agent, { 
                color: colors.textTertiary,
                fontSize: scaleFont(11),
              }]} 
              numberOfLines={1}
            >
              {door.agent_name}
            </Text>
          )}
          <ChevronRight size={chevronSize} color={colors.textTertiary} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1, marginRight: 8 },
  name: { fontWeight: '600', letterSpacing: -0.2, marginBottom: 3 },
  ip: {},
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agent: { maxWidth: 80 },
});
