import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Unlock, Lock, Activity, AlertTriangle, Clock, Shield,
} from 'lucide-react-native';
import api from '../services/api';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getEventIcon(eventType, colors) {
  const type = (eventType || '').toLowerCase();
  if (type.includes('open') || type.includes('unlock')) {
    return { icon: Unlock, color: colors.success, bg: colors.successDim };
  }
  if (type.includes('close') || type.includes('lock')) {
    return { icon: Lock, color: colors.primary, bg: colors.primaryDim };
  }
  if (type.includes('forced') || type.includes('alarm') || type.includes('tamper')) {
    return { icon: AlertTriangle, color: colors.danger, bg: colors.dangerDim };
  }
  if (type.includes('status')) {
    return { icon: Activity, color: colors.primary, bg: colors.primaryDim };
  }
  return { icon: Shield, color: colors.textSecondary, bg: colors.fillTertiary };
}

export default function ActivityLogScreen({ route, navigation }) {
  const { colors } = useTheme();
  const doorId = route.params?.doorId || null;
  const doorName = route.params?.doorName || null;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEvents();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents(doorId, 100);
      setEvents(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderEvent = ({ item }) => {
    const { icon: Icon, color, bg } = getEventIcon(item.event_type, colors);
    return (
      <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        <View style={[styles.eventIcon, { backgroundColor: bg }]}>
          <Icon size={16} color={color} strokeWidth={2} />
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventTopRow}>
            <Text style={[styles.eventType, { color: colors.textPrimary }]} numberOfLines={1}>
              {formatEventType(item.event_type)}
            </Text>
            {item.source === 'ingress' && (
              <View style={[styles.sourceBadge, { backgroundColor: colors.accentDim }]}>
                <Text style={[styles.sourceText, { color: colors.accent }]}>Ingress</Text>
              </View>
            )}
          </View>
          <Text style={[styles.eventDoor, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.door_name}
          </Text>
          {item.event_data ? (
            <Text style={[styles.eventData, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.event_data}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.eventTime, { color: colors.textTertiary }]}>
          {timeAgo(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
            {doorName && (
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{doorName}</Text>
            )}
          </View>
          <View style={{ width: 36 }} />
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadEvents(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Clock size={28} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No activity yet</Text>
              </View>
            )
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

function formatEventType(type) {
  if (!type) return 'Event';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: HEADER_TOP_PADDING, paddingBottom: spacing.md,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: 8, borderWidth: 1,
  },
  eventIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  eventContent: { flex: 1, marginRight: spacing.sm },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventType: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sourceText: { fontSize: 9, fontWeight: '600' },
  eventDoor: { fontSize: 12, marginTop: 2 },
  eventData: { fontSize: 11, marginTop: 1 },
  eventTime: { fontSize: 11, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, marginTop: spacing.md },
});
