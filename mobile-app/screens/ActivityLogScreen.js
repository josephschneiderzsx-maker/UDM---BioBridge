import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, Alert, Modal,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, LogIn, LogOut, AlertTriangle,
  ShieldX, Activity, Clock, Wifi, WifiOff, X, User, DoorOpen,
  Hash, Calendar,
} from 'lucide-react-native';
import api from '../services/api';
import { ActivitySkeleton } from '../components/SkeletonLoader';
import { useTheme } from '../contexts/ThemeContext';

const EVENT_LABELS = {
  '1': 'Accidental Open',   '4': 'Door Left Open',     '5': 'Door Close',
  '7': 'Remote Alarm',       '8': 'Remote Open',         '9': 'Remote Close',
  '10': 'Door Open',         '11': 'Door Not Open',      '22': 'Timezone Denied',
  '23': 'Access Denied',     '53': 'Exit Button',        '55': 'Alarm Disassembled',
  '58': 'Wrong Press',       '100': 'Invalid ID',        '101': 'Access Granted',
  '300': 'Lost/Stolen Card', '301': 'Connected',         '302': 'Disconnected',
};

function getEventIcon(code, color, size = 16) {
  const c = String(code);
  const props = { size, color, strokeWidth: 2 };
  if (['10', '8', '101'].includes(c)) return <LogIn {...props} />;
  if (['53', '5', '9'].includes(c)) return <LogOut {...props} />;
  if (['1', '4', '7', '55', '58'].includes(c)) return <AlertTriangle {...props} />;
  if (['11', '22', '23', '100', '300'].includes(c)) return <ShieldX {...props} />;
  if (c === '301') return <Wifi {...props} />;
  if (c === '302') return <WifiOff {...props} />;
  return <Activity {...props} />;
}

function getEventColor(code, colors) {
  const c = String(code);
  if (['10', '8', '101'].includes(c)) return colors.success;
  if (['1', '4', '7', '55', '58'].includes(c)) return colors.danger;
  if (['11', '22', '23', '100', '300'].includes(c)) return colors.warning;
  if (['301'].includes(c)) return colors.primary;
  return colors.textSecondary;
}

function groupByDate(events) {
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.event_time || e.timestamp || e.created_at);
    const key = isNaN(d)
      ? 'Unknown date'
      : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

// ─── Event Detail Bottom Sheet ────────────────────────────────────────────────

function EventDetailModal({ event, colors, onClose }) {
  const insets = useSafeAreaInsets();
  if (!event) return null;

  const code = String(event.event_type || event.event_code || '');
  const label = EVENT_LABELS[code] || event.event_name || `Event ${code}`;
  const iconColor = getEventColor(code, colors);

  const d = new Date(event.event_time || event.timestamp || event.created_at);
  const dateStr = isNaN(d) ? '—' : d.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeStr = isNaN(d) ? '—' : d.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const hasUser = !!event.person_name;
  const hasDoor = !!event.door_name;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap outside to close */}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 24,
          },
        ]}>
          {/* Drag handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* ── User name — most prominent if present ── */}
          {hasUser && (
            <View style={[styles.userBanner, { backgroundColor: colors.primaryDim }]}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                <User size={16} color="#000" strokeWidth={2.5} />
              </View>
              <Text style={[styles.userName, { color: colors.primary }]}>
                {event.person_name}
              </Text>
            </View>
          )}

          {/* ── Event header ── */}
          <View style={styles.eventHeader}>
            <View style={[styles.eventIconBig, { backgroundColor: `${iconColor}20` }]}>
              {getEventIcon(code, iconColor, 28)}
            </View>
            <View style={styles.eventTitleWrap}>
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{label}</Text>
              <View style={[styles.codePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Hash size={10} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.codeText, { color: colors.textTertiary }]}>{code}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* ── Details grid ── */}
          <View style={[styles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Date */}
            <View style={[styles.detailRow, { borderBottomColor: colors.separator }]}>
              <View style={styles.detailLeft}>
                <Calendar size={14} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Date</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{dateStr}</Text>
            </View>

            {/* Time */}
            <View style={[styles.detailRow, { borderBottomColor: colors.separator }]}>
              <View style={styles.detailLeft}>
                <Clock size={14} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Time</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{timeStr}</Text>
            </View>

            {/* Door (only if not already in door-specific view) */}
            {hasDoor && (
              <View style={[styles.detailRow, { borderBottomColor: colors.separator }]}>
                <View style={styles.detailLeft}>
                  <DoorOpen size={14} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Door</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{event.door_name}</Text>
              </View>
            )}

            {/* User (if present, also shown as extra detail row) */}
            {hasUser && (
              <View style={[styles.detailRow, { borderBottomColor: colors.separator }]}>
                <View style={styles.detailLeft}>
                  <User size={14} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>User</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{event.person_name}</Text>
              </View>
            )}

            {/* Event code — last row, no border */}
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Hash size={14} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Code</Text>
              </View>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{code}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityLogScreen({ route, navigation }) {
  const { colors } = useTheme();
  const door = route?.params?.door || null;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const events = await api.getEvents(door?.id, 200);
      setSections(groupByDate(events));
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [door?.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {door ? door.name : 'Activity Log'}
          </Text>
          {door && (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
              {door.terminal_ip}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ marginTop: 16 }}>
          <ActivitySkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={[styles.content, sections.length === 0 && styles.emptyContent]}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadEvents(); }}
              tintColor={colors.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.dateHeader, { color: colors.textTertiary }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const code = String(item.event_type || item.event_code || '');
            const label = EVENT_LABELS[code] || item.event_name || `Event ${code}`;
            const iconColor = getEventColor(code, colors);
            const time = new Date(item.event_time || item.timestamp || item.created_at);
            const timeStr = isNaN(time) ? '' : time.toLocaleTimeString(undefined, {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.separator }]}
                onPress={() => setSelectedEvent(item)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}18` }]}>
                  {getEventIcon(code, iconColor)}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>{label}</Text>
                  {item.person_name && (
                    <Text style={[styles.personName, { color: colors.primary }]}>
                      {item.person_name}
                    </Text>
                  )}
                  {item.door_name && !door && (
                    <Text style={[styles.eventSub, { color: colors.textSecondary }]}>
                      {item.door_name}
                    </Text>
                  )}
                </View>
                <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeStr}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Activity size={32} color={colors.textTertiary} strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No events yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Door activity will appear here.
              </Text>
            </View>
          }
        />
      )}

      <EventDetailModal
        event={selectedEvent}
        colors={colors}
        onClose={() => setSelectedEvent(null)}
      />
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
  backBtn: { width: 40, padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 1 },
  content: { paddingBottom: 32 },
  emptyContent: { flex: 1, justifyContent: 'center' },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  dateHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowInfo: { flex: 1 },
  eventLabel: { fontSize: 14, fontWeight: '500', marginBottom: 1 },
  personName: { fontSize: 12, fontWeight: '600' },
  eventSub: { fontSize: 12 },
  timeText: { fontSize: 11, fontWeight: '500', marginLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center' },

  // ── Modal / bottom sheet ──────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },

  // User banner
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  // Event header
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  eventIconBig: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitleWrap: { flex: 1 },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  codeText: { fontSize: 11, fontWeight: '600' },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Details
  detailsBox: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },
});
