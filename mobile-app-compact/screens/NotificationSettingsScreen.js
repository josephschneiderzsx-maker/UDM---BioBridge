import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Switch,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import api from '../services/api';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const FLOATING_HEADER_HEIGHT = 110;
const TAB_BAR_PADDING_BOTTOM = 100;

const EVENT_TYPES = [
  { group: 'Entry Events', items: [
    { code: '10', label: 'Door Open' },
    { code: '8', label: 'Remote Open Door' },
    { code: '101', label: 'Identify Success' },
  ]},
  { group: 'Exit Events', items: [
    { code: '53', label: 'Exit Button' },
    { code: '5', label: 'Door Close' },
    { code: '9', label: 'Remote Close Door' },
  ]},
  { group: 'Alarm Events', items: [
    { code: '1', label: 'Door Accidental Open' },
    { code: '4', label: 'Door Left Open' },
    { code: '7', label: 'Remote Release Alarm' },
    { code: '55', label: 'Disassemble the Alarm' },
    { code: '58', label: 'Wrong Press Alarm' },
  ]},
  { group: 'Access Events', items: [
    { code: '11', label: 'Door Not Open' },
    { code: '22', label: 'Timezone Denied' },
    { code: '23', label: 'Access Denied' },
    { code: '100', label: 'Invalid ID' },
    { code: '300', label: 'Lost/Stolen Card' },
  ]},
  { group: 'Status Events', items: [
    { code: '301', label: 'Connected' },
    { code: '302', label: 'Disconnected' },
  ]},
];

const ALL_CODES = EVENT_TYPES.flatMap(g => g.items.map(i => i.code));

export default function NotificationSettingsScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { door } = route.params;
  const [enabledCodes, setEnabledCodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPreferences();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await api.getNotificationPreferences();
      const pref = prefs.find(p => p.door_id === door.id);
      if (pref && pref.notify_event_types) {
        const codes = pref.notify_event_types.split(',').map(c => c.trim()).filter(c => c);
        setEnabledCodes(new Set(codes));
      } else if (pref) {
        const codes = new Set();
        if (pref.notify_on_open) {
          ['10', '8', '101'].forEach(c => codes.add(c));
        }
        if (pref.notify_on_close) {
          ['53', '5', '9'].forEach(c => codes.add(c));
        }
        if (pref.notify_on_forced) {
          ['1', '4', '7', '55', '58'].forEach(c => codes.add(c));
        }
        setEnabledCodes(codes);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCode = (code) => {
    setEnabledCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleGroup = (items) => {
    const codes = items.map(i => i.code);
    const allEnabled = codes.every(c => enabledCodes.has(c));
    setEnabledCodes(prev => {
      const next = new Set(prev);
      codes.forEach(c => {
        if (allEnabled) {
          next.delete(c);
        } else {
          next.add(c);
        }
      });
      return next;
    });
  };

  const toggleAll = () => {
    if (enabledCodes.size === ALL_CODES.length) {
      setEnabledCodes(new Set());
    } else {
      setEnabledCodes(new Set(ALL_CODES));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const codesStr = Array.from(enabledCodes).join(',');
      const hasAny = enabledCodes.size > 0;
      await api.setNotificationPreference(door.id, hasAny, hasAny, hasAny, codesStr);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Simple flat header - compact style */}
      <View style={[styles.simpleHeader, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{door.name}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View style={[styles.inner, { opacity: fadeAnim, flex: 1 }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_PADDING_BOTTOM }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.toggleAllRow, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={toggleAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleAllText, { color: colors.textPrimary }]}>All Events</Text>
            <Switch
              value={enabledCodes.size === ALL_CODES.length}
              onValueChange={toggleAll}
              trackColor={{ false: colors.fillTertiary, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>

          {EVENT_TYPES.map((group) => {
            const allGroupEnabled = group.items.every(i => enabledCodes.has(i.code));
            return (
              <View key={group.group} style={styles.groupContainer}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleGroup(group.items)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.group}</Text>
                  <Text style={[styles.groupToggle, { color: colors.primary }]}>
                    {allGroupEnabled ? 'Disable all' : 'Enable all'}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                  {group.items.map((item, index) => (
                    <View key={item.code}>
                      {index > 0 && <View style={[styles.divider, { backgroundColor: colors.separator }]} />}
                      <View style={styles.eventRow}>
                        <Text style={[styles.eventLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                        <Switch
                          value={enabledCodes.has(item.code)}
                          onValueChange={() => toggleCode(item.code)}
                          trackColor={{ false: colors.fillTertiary, true: colors.primary }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerSpacer: { width: 40 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100 },
  toggleAllRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: borderRadius.lg, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1,
  },
  toggleAllText: { fontSize: 15, fontWeight: '600' },
  groupContainer: { marginBottom: spacing.lg },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6, paddingHorizontal: 4,
  },
  groupTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupToggle: { fontSize: 12, fontWeight: '500' },
  groupCard: {
    borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  eventLabel: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginLeft: spacing.md },
  saveContainer: {
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md,
  },
  saveButton: {
    height: 50, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
