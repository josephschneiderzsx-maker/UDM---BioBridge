import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Smartphone, Lock, Shield, Info, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';
import WidgetService from '../services/WidgetService';
import api from '../services/api';
import { spacing, borderRadius } from '../constants/theme';

export default function WidgetSettingsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { scaleFont, isSmallPhone, isTablet, tabBarPadding } = useResponsive();

  const [doors, setDoors] = useState([]);
  const [primaryDoor, setPrimaryDoor] = useState(null);
  const [widgetEnabled, setWidgetEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
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
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSelectDoor = async (door) => {
    setPrimaryDoor(door);
    await WidgetService.setPrimaryDoor(door);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Primary Door Set', `${door.name} is now your widget quick unlock door.`);
  };

  const handleTestUnlock = async () => {
    const result = await WidgetService.quickUnlock();
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', result.message);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Failed', result.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={isSmallPhone ? 18 : 20} color={colors.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: scaleFont(18) }]}>
          Widget Settings
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding() }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Widget Enable Toggle */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <View style={styles.sectionHeader}>
            <Smartphone size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>
              Quick Unlock Widget
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary, fontSize: scaleFont(13) }]}>
            Add a widget to your home screen for instant door access with biometric authentication.
          </Text>
          
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>
              Enable Widget
            </Text>
            <Switch
              value={widgetEnabled}
              onValueChange={handleToggleWidget}
              trackColor={{ false: colors.fillSecondary, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Primary Door Selection */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <View style={styles.sectionHeader}>
            <Shield size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>
              Primary Door
            </Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary, fontSize: scaleFont(13) }]}>
            Select the door that will be unlocked when you tap the widget.
          </Text>

          {doors.map((door) => (
            <TouchableOpacity
              key={door.id}
              style={[
                styles.doorItem,
                {
                  backgroundColor: primaryDoor?.id === door.id ? colors.primaryDim : colors.fillTertiary,
                  borderColor: primaryDoor?.id === door.id ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => handleSelectDoor(door)}
              activeOpacity={0.7}
            >
              <View style={styles.doorInfo}>
                <Text style={[styles.doorName, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>
                  {door.name}
                </Text>
                <Text style={[styles.doorIp, { color: colors.textTertiary, fontSize: scaleFont(12) }]}>
                  {door.terminal_ip}
                </Text>
              </View>
              {primaryDoor?.id === door.id && (
                <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Security Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
          <View style={styles.sectionHeader}>
            <Lock size={18} color={colors.success} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>
              Security
            </Text>
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.successDim }]}>
            <Info size={16} color={colors.success} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.success, fontSize: scaleFont(13) }]}>
              Biometric authentication (Face ID/Fingerprint) is required each time you use the widget to unlock a door.
            </Text>
          </View>
        </View>

        {/* Test Button */}
        {primaryDoor && widgetEnabled && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.primary }]}
            onPress={handleTestUnlock}
            activeOpacity={0.8}
          >
            <Text style={[styles.testButtonText, { fontSize: scaleFont(16) }]}>
              Test Quick Unlock
            </Text>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.fillTertiary }]}>
          <Text style={[styles.instructionsTitle, { color: colors.textPrimary, fontSize: scaleFont(14) }]}>
            How to add the widget:
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary, fontSize: scaleFont(13) }]}>
            1. Long press on your home screen{'\n'}
            2. Tap "Widgets" or the + button{'\n'}
            3. Find "URZIS PASS" and select the widget{'\n'}
            4. Drag it to your home screen
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: { fontWeight: '600', letterSpacing: -0.3 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontWeight: '600', letterSpacing: -0.2 },
  sectionDescription: { marginBottom: spacing.md, lineHeight: 20 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  toggleLabel: { fontWeight: '500' },
  doorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
  },
  doorInfo: { flex: 1 },
  doorName: { fontWeight: '600', marginBottom: 2 },
  doorIp: {},
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: { flex: 1, lineHeight: 20 },
  testButton: {
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  testButtonText: { color: '#fff', fontWeight: '600' },
  instructions: {
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xxl,
  },
  instructionsTitle: { fontWeight: '600', marginBottom: spacing.sm },
  instructionsText: { lineHeight: 22 },
});
