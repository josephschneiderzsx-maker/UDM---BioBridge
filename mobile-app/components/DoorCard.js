import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ChevronRight, Lock } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DoorCard({ door, onPress, onLongPress }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: colors.primary,
      }]}
      onPress={() => onPress?.(door)}
      onLongPress={() => onLongPress?.(door)}
      activeOpacity={0.72}
      delayLongPress={400}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.primaryDim }]}>
        <Lock size={19} color={colors.primary} strokeWidth={2} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {door.name}
        </Text>
        <Text style={[styles.ip, { color: colors.textTertiary }]} numberOfLines={1}>
          {door.terminal_ip}
          {door.port ? `:${door.port}` : ''}
        </Text>
      </View>

      <View style={styles.right}>
        {door.agent_name && (
          <Text style={[styles.agent, { color: colors.textTertiary }]} numberOfLines={1}>
            {door.agent_name}
          </Text>
        )}
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, marginBottom: 3 },
  ip: { fontSize: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agent: { fontSize: 11, maxWidth: 80 },
});
