import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const EVENT_GROUPS = [
  { title: 'Entry', items: [
    { code: '10', label: 'Door Open' },
    { code: '8', label: 'Remote Open' },
    { code: '101', label: 'Access Granted' },
  ]},
  { title: 'Exit', items: [
    { code: '53', label: 'Exit Button' },
    { code: '5', label: 'Door Close' },
    { code: '9', label: 'Remote Close' },
  ]},
  { title: 'Alarms', items: [
    { code: '1', label: 'Accidental Open' },
    { code: '4', label: 'Door Left Open' },
    { code: '7', label: 'Remote Alarm' },
    { code: '55', label: 'Alarm Disassembled' },
    { code: '58', label: 'Wrong Press' },
  ]},
  { title: 'Access Denied', items: [
    { code: '11', label: 'Door Not Open' },
    { code: '22', label: 'Timezone Denied' },
    { code: '23', label: 'Access Denied' },
    { code: '100', label: 'Invalid ID' },
    { code: '300', label: 'Lost/Stolen Card' },
  ]},
  { title: 'Status', items: [
    { code: '301', label: 'Connected' },
    { code: '302', label: 'Disconnected' },
  ]},
];

const ALL_CODES = EVENT_GROUPS.flatMap(g => g.items.map(i => i.code));

export default function NotificationSettingsScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { door } = route.params;
  const [enabledCodes, setEnabledCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    try {
      const prefs = await api.getNotificationPreferences();
      const pref = prefs.find(p => p.door_id === door.id);
      if (pref?.notify_event_types) {
        // Server stores as comma-separated string: "10,8,101"
        const raw = pref.notify_event_types;
        const parsed = typeof raw === 'string'
          ? raw.split(',').map(c => c.trim()).filter(Boolean)
          : (Array.isArray(raw) ? raw : []);
        setEnabledCodes(parsed);
      } else if (pref?.notify_on_open || pref?.notify_on_close || pref?.notify_on_forced) {
        const codes = [];
        if (pref.notify_on_open) codes.push('10', '8', '101');
        if (pref.notify_on_close) codes.push('5', '9', '53');
        if (pref.notify_on_forced) codes.push('1', '4', '7');
        setEnabledCodes(codes);
      }
    } catch {
      setEnabledCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (code) => {
    setEnabledCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleAll = () => {
    setEnabledCodes(prev => prev.length === ALL_CODES.length ? [] : [...ALL_CODES]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setNotificationPreference(
        door.id,
        enabledCodes.some(c => ['10', '8', '101'].includes(c)),
        enabledCodes.some(c => ['5', '9', '53'].includes(c)),
        enabledCodes.some(c => ['1', '4', '7'].includes(c)),
        // Server expects comma-separated string, not array
        enabledCodes.join(','),
      );
      Alert.alert('Saved', 'Notification settings updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {door.name}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Select all */}
          <TouchableOpacity
            style={[styles.selectAll, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={toggleAll}
          >
            <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
              {enabledCodes.length === ALL_CODES.length ? 'Deselect All' : 'Select All'}
            </Text>
            <Text style={[styles.selectAllCount, { color: colors.textSecondary }]}>
              {enabledCodes.length}/{ALL_CODES.length} enabled
            </Text>
          </TouchableOpacity>

          {EVENT_GROUPS.map(group => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.title.toUpperCase()}</Text>
              <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {group.items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.row,
                      idx < group.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
                    ]}
                    onPress={() => toggle(item.code)}
                  >
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    <View style={[
                      styles.checkbox,
                      {
                        backgroundColor: enabledCodes.includes(item.code) ? colors.primary : 'transparent',
                        borderColor: enabledCodes.includes(item.code) ? colors.primary : colors.border,
                      },
                    ]}>
                      {enabledCodes.includes(item.code) && (
                        <Check size={12} color="#000" strokeWidth={3} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  saveBtn: { padding: 4, minWidth: 40, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  selectAllText: { fontSize: 15, fontWeight: '600' },
  selectAllCount: { fontSize: 13 },
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 },
  groupCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rowLabel: { fontSize: 15 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
