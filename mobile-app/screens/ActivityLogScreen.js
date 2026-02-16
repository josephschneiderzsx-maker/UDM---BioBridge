import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, LogIn, LogOut, Activity, AlertTriangle, Clock, Shield, ShieldX,
  X, User, MapPin, Calendar, Hash, Info,
} from 'lucide-react-native';
import api from '../services/api';
import { spacing, borderRadius, shadows } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);
const FLOATING_HEADER_HEIGHT_ACTIVITY = 120;
const TAB_BAR_PADDING_BOTTOM = 100;

// ──────────────────────────────────────────────
// Event type code → description map (fallback for legacy DB records)
// ──────────────────────────────────────────────
const EVENT_CODE_MAP = {
  '1':   'Door Accidental Open',
  '4':   'Door Left Open',
  '5':   'Door Close',
  '7':   'Remote Release Alarm',
  '8':   'Remote Open Door',
  '9':   'Remote Close Door',
  '10':  'Door Open',
  '11':  'Door Not Open',
  '22':  'Timezone Denied',
  '23':  'Access Denied',
  '53':  'Exit Button',
  '55':  'Disassemble the Alarm',
  '58':  'Wrong Press Alarm',
  '100': 'Invalid ID',
  '101': 'Identify Success',
  '300': 'Lost/Stolen Card',
  '301': 'Connected',
  '302': 'Disconnected',
};

// ──────────────────────────────────────────────
// Icon + color classification
// ──────────────────────────────────────────────
const ENTRY_CODES = new Set(['10', '8', '101']);
const EXIT_CODES  = new Set(['53', '5', '9']);
const ALARM_CODES = new Set(['1', '4', '7', '55', '58']);
const ACCESS_CODES = new Set(['11', '22', '23', '100', '300']);
const STATUS_CODES = new Set(['301', '302']);

const ENTRY_KW = ['door open', 'remote open', 'identify success'];
const EXIT_KW  = ['exit button', 'door close', 'remote close'];
const ALARM_KW = ['accidental', 'left open', 'alarm', 'disassemble', 'wrong press'];
const ACCESS_KW = ['denied', 'invalid', 'lost', 'stolen', 'not open'];
const STATUS_KW = ['connected', 'disconnected'];

function classifyEvent(eventType, eventData) {
  const code = (eventData || '').trim();
  const codeOrType = code || (eventType || '').trim();
  const lower = (eventType || '').toLowerCase();

  if (ENTRY_CODES.has(codeOrType) || ENTRY_KW.some(k => lower.includes(k))) return 'entry';
  if (EXIT_CODES.has(codeOrType)  || EXIT_KW.some(k => lower.includes(k)))  return 'exit';
  if (ALARM_CODES.has(codeOrType) || ALARM_KW.some(k => lower.includes(k))) return 'alarm';
  if (ACCESS_CODES.has(codeOrType)|| ACCESS_KW.some(k => lower.includes(k)))return 'access';
  if (STATUS_CODES.has(codeOrType)|| STATUS_KW.some(k => lower.includes(k)))return 'status';

  // Broad fallback
  if (lower.includes('open') || lower.includes('unlock')) return 'entry';
  if (lower.includes('close') || lower.includes('lock'))  return 'exit';

  return 'default';
}

function getEventVisuals(category, colors) {
  switch (category) {
    case 'entry':
      return { icon: LogIn, color: colors.primary, bg: colors.primaryDim, accent: colors.primary };
    case 'exit':
      return { icon: LogOut, color: colors.orange || '#FF9F0A', bg: 'rgba(255, 159, 10, 0.10)', accent: colors.orange || '#FF9F0A' };
    case 'alarm':
      return { icon: AlertTriangle, color: colors.danger, bg: colors.dangerDim, accent: colors.danger };
    case 'access':
      return { icon: ShieldX, color: colors.danger, bg: colors.dangerDim, accent: colors.danger };
    case 'status':
      return { icon: Activity, color: colors.textSecondary, bg: colors.fillTertiary, accent: colors.textSecondary };
    default:
      return { icon: Shield, color: colors.textSecondary, bg: colors.fillTertiary, accent: colors.textSecondary };
  }
}

// ──────────────────────────────────────────────
// Get display label for an event type
// ──────────────────────────────────────────────
function getEventLabel(eventType, eventData) {
  // If event_type is a raw code number, look up description
  const trimmed = (eventType || '').trim();
  if (EVENT_CODE_MAP[trimmed]) return EVENT_CODE_MAP[trimmed];

  // If event_data contains a code, and event_type looks like a description already, use it
  if (trimmed && trimmed.length > 3) {
    // Already a description like "Exit Button"
    return trimmed.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Last resort: try event_data as code
  const code = (eventData || '').trim();
  if (EVENT_CODE_MAP[code]) return EVENT_CODE_MAP[code];

  return trimmed || 'Event';
}

// ──────────────────────────────────────────────
// Time formatting
// ──────────────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'Yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }) + ' ' + date.toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function getSectionTitle(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today - eventDay) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDate(events) {
  const sections = [];
  const map = {};
  for (const ev of events) {
    const ts = ev.event_time || ev.created_at;
    const title = getSectionTitle(ts);
    if (!map[title]) {
      map[title] = { title, data: [] };
      sections.push(map[title]);
    }
    map[title].data.push(ev);
  }
  return sections;
}

// ──────────────────────────────────────────────
// Detail Modal
// ──────────────────────────────────────────────
function EventDetailModal({ event, visible, onClose, colors }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT * 0.4);
    }
  }, [visible]);

  if (!visible || !event) return null;

  const ts = event.event_time || event.created_at;
  const category = classifyEvent(event.event_type, event.event_data);
  const { icon: Icon, color, bg, accent } = getEventVisuals(category, colors);
  const label = getEventLabel(event.event_type, event.event_data);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT * 0.4, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const DetailRow = ({ icon: RowIcon, iconColor, title, value }) => (
    <View style={modalStyles.detailRow}>
      <View style={[modalStyles.detailIcon, { backgroundColor: colors.fillTertiary }]}>
        <RowIcon size={14} color={iconColor || colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={modalStyles.detailContent}>
        <Text style={[modalStyles.detailLabel, { color: colors.textTertiary }]}>{title}</Text>
        <Text style={[modalStyles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Pressable style={modalStyles.overlay} onPress={handleClose}>
        <Animated.View style={[modalStyles.overlayBg, { opacity: fadeAnim }]} />
      </Pressable>
      <Animated.View
        style={[
          modalStyles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <BlurView intensity={80} tint="light" style={modalStyles.sheetBlur} />
        <View style={modalStyles.sheetContent}>
          <View style={modalStyles.dragHandle}>
            <View style={[modalStyles.handle, { backgroundColor: colors.fillSecondary }]} />
          </View>

          <View style={modalStyles.heroSection}>
            <View style={[modalStyles.heroIcon, { backgroundColor: bg }]}>
              <Icon size={28} color={color} strokeWidth={2} />
            </View>
            <Text style={[modalStyles.heroTitle, { color: colors.textPrimary }]}>{label}</Text>
            <Text style={[modalStyles.heroTime, { color: colors.textTertiary }]}>{timeAgo(ts)}</Text>
          </View>

          <View style={[modalStyles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <DetailRow icon={MapPin} iconColor={colors.primary} title="Door" value={event.door_name || 'Unknown'} />
            <View style={[modalStyles.detailDivider, { backgroundColor: colors.separator }]} />
            <DetailRow icon={Calendar} title="Date & Time" value={formatFullDate(ts)} />
            {event.ingress_user_id ? (
              <>
                <View style={[modalStyles.detailDivider, { backgroundColor: colors.separator }]} />
                <DetailRow icon={User} iconColor={accent} title="Utilisateur" value={event.ingress_user_id} />
              </>
            ) : null}
            {event.event_data ? (
              <>
                <View style={[modalStyles.detailDivider, { backgroundColor: colors.separator }]} />
                <DetailRow icon={Hash} title="Event Code" value={event.event_data} />
              </>
            ) : null}
            <View style={[modalStyles.detailDivider, { backgroundColor: colors.separator }]} />
            <DetailRow icon={Info} title="Source" value={event.source === 'ingress' ? 'Access Control' : event.source || 'System'} />
          </View>

          <TouchableOpacity
            style={[modalStyles.closeBtn, { backgroundColor: colors.fillTertiary }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[modalStyles.closeBtnText, { color: colors.textPrimary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────────
export default function ActivityLogScreen({ route, navigation }) {
  const { colors } = useTheme();
  const doorId = route.params?.doorId || null;
  const doorName = route.params?.doorName || null;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEvents();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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

  const sections = groupByDate(events);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
    </View>
  ), [colors]);

  const renderEvent = useCallback(({ item, index }) => {
    const ts = item.event_time || item.created_at;
    const category = classifyEvent(item.event_type, item.event_data);
    const { icon: Icon, color, bg, accent } = getEventVisuals(category, colors);
    const label = getEventLabel(item.event_type, item.event_data);

    return (
      <TouchableOpacity
        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}
        onPress={() => setSelectedEvent(item)}
        activeOpacity={0.7}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        {/* Icon */}
        <View style={[styles.eventIcon, { backgroundColor: bg }]}>
          <Icon size={18} color={color} strokeWidth={2} />
        </View>

        {/* Content */}
        <View style={styles.eventContent}>
          <Text style={[styles.eventLabel, { color: colors.textPrimary }]} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.eventMeta}>
            <Text style={[styles.eventDoor, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.door_name}
            </Text>
            {item.ingress_user_id ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
                <Text style={[styles.eventUser, { color: accent }]} numberOfLines={1}>
                  {item.ingress_user_id}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Time */}
        <Text style={[styles.eventTime, { color: colors.textTertiary }]}>{timeAgo(ts)}</Text>
      </TouchableOpacity>
    );
  }, [colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.headerFloating}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
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
        </View>

        <View style={[styles.contentWrap, { paddingTop: FLOATING_HEADER_HEIGHT_ACTIVITY }]}>
          {events.length > 0 && (
            <View style={styles.countRow}>
              <View style={[styles.countPill, { backgroundColor: colors.primaryDim }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderEvent}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={[styles.listContent, { paddingBottom: TAB_BAR_PADDING_BOTTOM }]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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
                  <View style={[styles.emptyIcon, { backgroundColor: colors.fillTertiary }]}>
                    <Clock size={32} color={colors.textTertiary} strokeWidth={1.5} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No activity yet</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    Events will appear here when doors are used
                  </Text>
                </View>
              )
            }
          />
        </View>
      </Animated.View>

      {/* Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        visible={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  headerFloating: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: HEADER_TOP_PADDING, paddingBottom: spacing.sm,
  },
  contentWrap: { flex: 1 },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  countRow: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, flexDirection: 'row',
  },
  countPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  countText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: {
    paddingHorizontal: 4, paddingTop: spacing.md, paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
  },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxxl },
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, paddingVertical: 14, paddingRight: spacing.md,
    marginBottom: 6, borderWidth: 1, overflow: 'hidden',
  },
  accentBar: {
    width: 3, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0,
    borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg,
  },
  eventIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginLeft: 14, marginRight: 12,
  },
  eventContent: { flex: 1, marginRight: spacing.sm },
  eventLabel: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  eventDoor: { fontSize: 12, fontWeight: '400' },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 6 },
  eventUser: { fontSize: 12, fontWeight: '600' },
  eventTime: { fontSize: 11, fontWeight: '500', letterSpacing: 0.2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 120 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 240 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    overflow: 'hidden',
    ...shadows.large,
  },
  sheetBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContent: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  dragHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  heroSection: { alignItems: 'center', paddingVertical: spacing.lg },
  heroIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  heroTime: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  detailsCard: {
    marginHorizontal: spacing.xl, borderRadius: borderRadius.lg, borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  detailIcon: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontWeight: '500', marginTop: 1 },
  detailDivider: { height: 1, marginLeft: 54 },
  closeBtn: {
    marginHorizontal: spacing.xl, marginTop: spacing.lg,
    height: 50, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { fontSize: 16, fontWeight: '600' },
});
