import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Switch, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Smartphone, Lock, Shield, Info, Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import WidgetService from '../services/WidgetService';
import api from '../services/api';

export default function WidgetSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const [doors, setDoors] = useState([]);
  const [primaryDoor, setPrimaryDoor] = useState(null);
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [doorsList, primary, enabled] = await Promise.all([
        api.getDoors(),
        WidgetService.getPrimaryDoor(),
        WidgetService.isWidgetEnabled(),
      ]);
      setDoors(doorsList);
      setPrimaryDoor(primary);
      setWidgetEnabled(enabled);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWidget = async (value) => {
    if (value && !primaryDoor) {
      Alert.alert('Select Primary Door', 'Please select a primary door first to enable the widget.');
      return;
    }
    setWidgetEnabled(value);
    await WidgetService.setWidgetEnabled(value);
  };

  const handleSelectDoor = async (door) => {
    setPrimaryDoor(door);
    await WidgetService.setPrimaryDoor(door);
    Alert.alert('Primary Door Set', `${door.name} is now your widget quick unlock door.`);
  };

  const handleTestUnlock = async () => {
    const result = await WidgetService.quickUnlock();
    if (result.success) {
      Alert.alert('Success', result.message);
    } else {
      Alert.alert('Failed', result.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Widget Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Widget Enable Toggle */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Smartphone size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Unlock Widget</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Add a widget to your home screen for instant door access with biometric authentication.
            </Text>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Enable Widget</Text>
              <Switch
                value={widgetEnabled}
                onValueChange={handleToggleWidget}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Primary Door Selection */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Shield size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Primary Door</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Select the door that will be unlocked when you tap the widget.
            </Text>
            {doors.map(door => (
              <TouchableOpacity
                key={door.id}
                style={[
                  styles.doorItem,
                  {
                    backgroundColor: primaryDoor?.id === door.id ? colors.primaryDim : 'transparent',
                    borderColor: primaryDoor?.id === door.id ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectDoor(door)}
                activeOpacity={0.7}
              >
                <View style={styles.doorInfo}>
                  <Text style={[styles.doorName, { color: colors.textPrimary }]}>{door.name}</Text>
                  <Text style={[styles.doorIp, { color: colors.textSecondary }]}>{door.terminal_ip}</Text>
                </View>
                {primaryDoor?.id === door.id && (
                  <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                    <Check size={14} color="#000" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {doors.length === 0 && (
              <Text style={[styles.noDoors, { color: colors.textSecondary }]}>No doors configured.</Text>
            )}
          </View>

          {/* Security Info */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Lock size={18} color={colors.success} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
            </View>
            <View style={[styles.infoBox, { backgroundColor: `${colors.success}18` }]}>
              <Info size={16} color={colors.success} strokeWidth={2} />
              <Text style={[styles.infoText, { color: colors.success }]}>
                Biometric authentication (Face ID/Fingerprint) is required each time you use the widget.
              </Text>
            </View>
          </View>

          {/* Test Button */}
          {primaryDoor && widgetEnabled && (
            <TouchableOpacity
              style={[styles.testBtn, { backgroundColor: colors.primary }]}
              onPress={handleTestUnlock}
              activeOpacity={0.8}
            >
              <Text style={styles.testBtnText}>Test Quick Unlock</Text>
            </TouchableOpacity>
          )}

          {/* Instructions */}
          <View style={[styles.instructions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.instructTitle, { color: colors.textPrimary }]}>How to add the widget:</Text>
            <Text style={[styles.instructText, { color: colors.textSecondary }]}>
              {'1. Long press on your home screen\n2. Tap "Widgets" or the + button\n3. Find "URZIS PASS" and select the widget\n4. Drag it to your home screen'}
            </Text>
          </View>

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  doorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  doorInfo: { flex: 1 },
  doorName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  doorIp: { fontSize: 12 },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDoors: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  testBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  testBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },
  instructions: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 32,
  },
  instructTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  instructText: { fontSize: 13, lineHeight: 20 },
});
