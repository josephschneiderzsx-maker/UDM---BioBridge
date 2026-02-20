import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, Alert, Modal,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, LogIn, LogOut, AlertTriangle,
  ShieldX, Activity, Clock, Wifi, WifiOff, X, User, DoorOpen,
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

function formatFullDate(event) {
  const d = new Date(event.event_time || event.timestamp || event.created_at);
  if (isNaN(d)) return 'Unknown';
  return d.toLocaleString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function EventDetailModal({ event, colors, onClose }) {
  if (!event) return null;
  const code = String(event.event_type || event.event_code || '');
  const label = EVENT_LABELS[code] || event.event_name || `Event ${code}`;
  const iconColor = getEventColor(code, colors);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          {/* Event icon + title */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIcon, { backgroundColor: `${iconColor}22` }]}>
              {getEventIcon(code, iconColor, 26)}
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <X size={18} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Details */}
          <View style={[styles.modalBody, { borderColor: colors.border }]}>
            <DetailRow
              label="Date & Time"
              value={formatFullDate(event)}
              colors={colors}
              icon={<Clock size={14} color={colors.textTertiary} strokeWidth={2} />}
            />
            {(event.door_name) && (
              <DetailRow
                label="Door"
                value={event.door_name}
                colors={colors}
                icon={<DoorOpen size={14} color={colors.textTertiary} strokeWidth={2} />}
              />
            )}
            {event.person_name && (
              <DetailRow
                label="Person"
                value={event.person_name}
                colors={colors}
                icon={<User size={14} color={colors.textTertiary} strokeWidth={2} />}
              />
            )}
            <DetailRow
              label="Event Code"
              value={`#${code}`}
              colors={colors}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DetailRow({ label, value, colors, icon }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.separator }]}>
      <View style={styles.detailLeft}>
        {icon && icon}
        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

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
          renderItem={({ item, index }) => {
            const code = String(item.event_type || item.event_code || '');
            const label = EVENT_LABELS[code] || item.event_name || `Event ${code}`;
            const iconColor = getEventColor(code, colors);
            const time = new Date(item.event_time || item.timestamp || item.created_at);
            const timeStr = isNaN(time) ? '' : time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.separator }]}
                onPress={() => setSelectedEvent(item)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconBox, { backgroundColor: `${iconColor}1A` }]}>
                  {getEventIcon(code, iconColor)}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>{label}</Text>
                  {item.person_name && (
                    <Text style={[styles.eventSub, { color: colors.textSecondary }]}>
                      {item.person_name}
                    </Text>
                  )}
                  {item.door_name && !door && (
                    <Text style={[styles.eventSub, { color: colors.textSecondary }]}>
                      {item.door_name}
                    </Text>
                  )}
                </View>
                <View style={styles.timeCol}>
                  <Text style={[styles.timeText, { color: colors.textTertiary }]}>{timeStr}</Text>
                </View>
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
    paddingTop: 16,
    paddingBottom: 4,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  eventLabel: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  eventSub: { fontSize: 12 },
  timeCol: { marginLeft: 8 },
  timeText: { fontSize: 11, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 100,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '500', textAlign: 'right', flex: 1 },
});
