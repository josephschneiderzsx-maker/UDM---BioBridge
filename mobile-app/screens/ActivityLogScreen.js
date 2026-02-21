import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, Alert, Modal,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, LogIn, LogOut, AlertTriangle,
  ShieldX, Activity, Wifi, WifiOff, X, User, DoorOpen,
  Hash, Calendar, Clock, Info, Shield,
} from 'lucide-react-native';
// Haptics removed - only used for important actions (door unlock)
import api from '../services/api';
import { ActivitySkeleton } from '../components/SkeletonLoader';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

// ─── Event classification (mirrors old server data structure) ─────────────────

const EVENT_CODE_MAP = {
  '1':   'Door Accidental Open',  '4':  'Door Left Open',
  '5':   'Door Close',            '7':  'Remote Release Alarm',
  '8':   'Remote Open Door',      '9':  'Remote Close Door',
  '10':  'Door Open',             '11': 'Door Open',
  '22':  'Timezone Denied',       '23': 'Access Denied',
  '53':  'Exit Button',           '55': 'Disassemble the Alarm',
  '58':  'Wrong Press Alarm',     '100':'Invalid ID',
  '101': 'Identify Success',      '300':'Lost/Stolen Card',
  '301': 'Connected',             '302':'Disconnected',
};

const ENTRY_CODES  = new Set(['10', '8', '101', '11']);
const EXIT_CODES   = new Set(['53', '5', '9']);
const ALARM_CODES  = new Set(['1', '4', '7', '55', '58']);
const ACCESS_CODES = new Set(['22', '23', '100', '300']);
const STATUS_CODES = new Set(['301', '302']);

// For code-11 events the terminal emits no user — backfill from the preceding
// "Identified" event on the same door within a 30-second window.
function enrichEvents(events) {
  return events.map((evt, idx) => {
    const code = (evt.event_data || '').trim();
    const t    = (evt.event_type  || '').trim();
    if ((code !== '11' && t !== '11') || evt.ingress_user_id) return evt;

    const evtMs = new Date(evt.event_time || evt.created_at).getTime();
    const start = Math.max(0, idx - 10);
    const end   = Math.min(events.length, idx + 10);

    for (let i = start; i < end; i++) {
      if (i === idx) continue;
      const other    = events[i];
      const otherMs  = new Date(other.event_time || other.created_at).getTime();
      const otherType = (other.event_type || '').trim().toLowerCase();
      if (
        other.door_name === evt.door_name &&
        Math.abs(otherMs - evtMs) <= 30000 &&
        otherType.includes('identif') &&
        other.ingress_user_id
      ) {
        return { ...evt, ingress_user_id: other.ingress_user_id };
      }
    }
    return evt;
  });
}

function classifyEvent(eventType, eventData) {
  const code  = (eventData || '').trim();
  const t     = (eventType || '').trim();
  const key   = code || t;
  if (ENTRY_CODES.has(key))  return 'entry';
  if (EXIT_CODES.has(key))   return 'exit';
  if (ALARM_CODES.has(key))  return 'alarm';
  if (ACCESS_CODES.has(key)) return 'access';
  if (STATUS_CODES.has(key)) return 'status';
  const lower = t.toLowerCase();
  // "Identified" = terminal recognised the user → successful entry
  if (lower.includes('identif')) return 'entry';
  if (lower.includes('open') || lower.includes('unlock')) return 'entry';
  if (lower.includes('close') || lower.includes('lock'))  return 'exit';
  if (lower.includes('alarm') || lower.includes('accidental')) return 'alarm';
  if (lower.includes('denied') || lower.includes('invalid')) return 'access';
  return 'default';
}

function getEventVisuals(category, colors) {
  switch (category) {
    case 'entry':  return { Icon: LogIn,       color: colors.success,       bg: `${colors.success}18` };
    case 'exit':   return { Icon: LogOut,       color: colors.warning,       bg: `${colors.warning}18` };
    case 'alarm':  return { Icon: AlertTriangle,color: colors.danger,        bg: `${colors.danger}18`  };
    case 'access': return { Icon: ShieldX,      color: colors.warning,       bg: `${colors.warning}18` };
    case 'status': return { Icon: Wifi,         color: colors.primary,       bg: `${colors.primary}18` };
    default:       return { Icon: Activity,     color: colors.textSecondary, bg: `${colors.textSecondary}14` };
  }
}

function getEventLabel(eventType, eventData) {
  const code = (eventData || '').trim();
  const t    = (eventType || '').trim();
  if (EVENT_CODE_MAP[t])    return EVENT_CODE_MAP[t];
  if (EVENT_CODE_MAP[code]) return EVENT_CODE_MAP[code];
  if (t && t.length > 2)   return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return 'Event';
}

function groupByDate(events) {
  const groups = {};
  events.forEach(e => {
    const d = new Date(e.event_time || e.created_at);
    const key = isNaN(d)
      ? 'Unknown date'
      : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

function formatFullDate(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ─── Event Detail Bottom Sheet ────────────────────────────────────────────────

function DetailRow({ IconComp, iconColor, label, value, colors, scaleFont }) {
  return (
    <View style={[mStyles.detailRow, { borderBottomColor: colors.separator }]}>
      <View style={mStyles.detailLeft}>
        {IconComp && (
          <View style={[mStyles.detailIconBox, { backgroundColor: `${iconColor || colors.textTertiary}18` }]}>
            <IconComp size={13} color={iconColor || colors.textTertiary} strokeWidth={2} />
          </View>
        )}
        <Text style={[mStyles.detailLabel, { color: colors.textTertiary, fontSize: scaleFont(13) }]}>{label}</Text>
      </View>
      <Text style={[mStyles.detailValue, { color: colors.textPrimary, fontSize: scaleFont(13) }]}>{value}</Text>
    </View>
  );
}

function EventDetailModal({ event, colors, onClose }) {
  const insets = useSafeAreaInsets();
  const { scaleFont, spacing } = useResponsive();
  if (!event) return null;

  const ts       = event.event_time || event.created_at;
  const category = classifyEvent(event.event_type, event.event_data);
  const { Icon, color: iconColor } = getEventVisuals(category, colors);
  const label    = getEventLabel(event.event_type, event.event_data);
  const hasUser  = !!event.ingress_user_id;
  const source   = event.source === 'ingress' ? 'Access Control' : event.source || 'System';

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <View style={mStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        <View style={[
          mStyles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom + 20,
          },
        ]}>
          {/* Handle */}
          <View style={[mStyles.handle, { backgroundColor: colors.border }]} />

          {/* ── User — prominently shown if present ── */}
          {hasUser && (
            <View style={[mStyles.userBanner, { backgroundColor: colors.primaryDim }]}>
              <View style={[mStyles.userAvatarBox, { backgroundColor: colors.primary }]}>
                <User size={15} color="#000" strokeWidth={2.5} />
              </View>
              <Text style={[mStyles.userNameText, { color: colors.primary }]}>
                {event.ingress_user_id}
              </Text>
            </View>
          )}

          {/* ── Event header ── */}
          <View style={mStyles.eventHeader}>
            <View style={[mStyles.eventIconBig, { backgroundColor: `${iconColor}20` }]}>
              <Icon size={28} color={iconColor} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[mStyles.eventTitle, { color: colors.textPrimary, fontSize: scaleFont(17) }]}>{label}</Text>
              <View style={[mStyles.codePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Hash size={10} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[mStyles.codeText, { color: colors.textTertiary, fontSize: scaleFont(11) }]}>
                  {(event.event_data || '').trim() || (event.event_type || '').trim()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={mStyles.closeBtn}>
              <X size={18} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* ── Detail rows ── */}
          <View style={[mStyles.detailsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DetailRow
              IconComp={Calendar}
              label="Date & Time"
              value={formatFullDate(ts)}
              colors={colors}
              scaleFont={scaleFont}
            />
            {event.door_name && (
              <DetailRow
                IconComp={DoorOpen}
                iconColor={colors.primary}
                label="Door"
                value={event.door_name}
                colors={colors}
                scaleFont={scaleFont}
              />
            )}
            {hasUser && (
              <DetailRow
                IconComp={User}
                iconColor={iconColor}
                label="User"
                value={event.ingress_user_id}
                colors={colors}
                scaleFont={scaleFont}
              />
            )}
            {event.event_data && (
              <DetailRow
                IconComp={Hash}
                label="Event Code"
                value={event.event_data}
                colors={colors}
                scaleFont={scaleFont}
              />
            )}
            <DetailRow
              IconComp={Info}
              label="Source"
              value={source}
              colors={colors}
              scaleFont={scaleFont}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ActivityLogScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { scaleFont, spacing } = useResponsive();
  const door = route?.params?.door || null;
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const events = await api.getEvents(door?.id, 200);
      setSections(groupByDate(enrichEvents(events)));
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
            const category = classifyEvent(item.event_type, item.event_data);
            const { Icon, color: iconColor, bg } = getEventVisuals(category, colors);
            const label = getEventLabel(item.event_type, item.event_data);
            const ts = item.event_time || item.created_at;
            const d = new Date(ts);
            const timeStr = isNaN(d) ? '' : d.toLocaleTimeString(undefined, {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.separator }]}
                onPress={() => setSelectedEvent(item)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconBox, { backgroundColor: bg }]}>
                  <Icon size={16} color={iconColor} strokeWidth={2} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <View style={styles.metaRow}>
                    {item.door_name && !door && (
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {item.door_name}
                      </Text>
                    )}
                    {item.door_name && !door && item.ingress_user_id && (
                      <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
                    )}
                    {item.ingress_user_id && (
                      <Text style={[styles.metaUser, { color: iconColor }]} numberOfLines={1}>
                        {item.ingress_user_id}
                      </Text>
                    )}
                  </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: scaleFont(17), fontWeight: '600' },
  subtitle: { fontSize: scaleFont(12), marginTop: 1 },
  content: { paddingBottom: spacing(32) },
  emptyContent: { flex: 1, justifyContent: 'center' },
  sectionHeader: {
    paddingHorizontal: spacing(16),
    paddingTop: spacing(14),
    paddingBottom: spacing(4),
  },
  dateHeader: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(16),
    paddingVertical: spacing(13),
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
  rowInfo: { flex: 1, marginRight: 8 },
  eventLabel: { fontSize: scaleFont(14), fontWeight: '500', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: scaleFont(12) },
  metaDot: { width: 3, height: 3, borderRadius: 1.5 },
  metaUser: { fontSize: scaleFont(12), fontWeight: '600' },
  timeText: { fontSize: scaleFont(11), fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: spacing(64), gap: spacing(12) },
  emptyTitle: { fontSize: scaleFont(17), fontWeight: '600' },
  emptyText: { fontSize: scaleFont(14), textAlign: 'center' },
});

const mStyles = StyleSheet.create({
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
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 14,
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
  },
  userAvatarBox: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  userNameText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  eventIconBig: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  eventTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  codePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  codeText: { fontSize: 11, fontWeight: '600' },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  detailsBox: {
    marginHorizontal: 16, borderRadius: 14, borderWidth: 1,
    overflow: 'hidden', marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIconBox: {
    width: 26, height: 26, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1 },
});
