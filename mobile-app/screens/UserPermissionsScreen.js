import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import GlassBackground from '../components/GlassBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Save, DoorOpen, Eye, Lock, Unlock } from 'lucide-react-native';
import api from '../services/api';
import PrimaryButton from '../components/PrimaryButton';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);
const FLOATING_HEADER_HEIGHT = 100;
const TAB_BAR_PADDING_BOTTOM = 100;

export default function UserPermissionsScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const { user } = route.params;
  const [doors, setDoors] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [doorsList, permsList] = await Promise.all([
        api.getDoors(),
        api.getUserPermissions(user.id),
      ]);
      setDoors(doorsList);

      // Build permissions map: { doorId: { can_open, can_close, can_view_status } }
      const permsMap = {};
      permsList.forEach(p => {
        permsMap[p.door_id] = {
          can_open: p.can_open,
          can_close: p.can_close,
          can_view_status: p.can_view_status,
        };
      });
      setPermissions(permsMap);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (doorId, field) => {
    setPermissions(prev => {
      const current = prev[doorId] || { can_open: false, can_close: false, can_view_status: false };
      return {
        ...prev,
        [doorId]: { ...current, [field]: !current[field] },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const permsList = Object.entries(permissions)
        .filter(([_, p]) => p.can_open || p.can_close || p.can_view_status)
        .map(([doorId, p]) => ({
          door_id: parseInt(doorId),
          can_open: p.can_open,
          can_close: p.can_close,
          can_view_status: p.can_view_status,
        }));

      await api.setUserPermissions(user.id, permsList);
      Alert.alert('Success', 'Permissions saved', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderDoor = ({ item }) => {
    const perms = permissions[item.id] || { can_open: false, can_close: false, can_view_status: false };
    return (
      <View style={[styles.doorCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        <Text style={[styles.doorName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.doorIp, { color: colors.textTertiary }]}>{item.terminal_ip}</Text>

        <View style={styles.permissionRow}>
          <View style={styles.permLabel}>
            <Unlock size={14} color={colors.success} strokeWidth={2} />
            <Text style={[styles.permText, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <Switch
            value={perms.can_open}
            onValueChange={() => togglePermission(item.id, 'can_open')}
            trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: colors.success }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.permissionRow}>
          <View style={styles.permLabel}>
            <Lock size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.permText, { color: colors.textSecondary }]}>Close</Text>
          </View>
          <Switch
            value={perms.can_close}
            onValueChange={() => togglePermission(item.id, 'can_close')}
            trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.permissionRow}>
          <View style={styles.permLabel}>
            <Eye size={14} color={colors.orange || colors.warning} strokeWidth={2} />
            <Text style={[styles.permText, { color: colors.textSecondary }]}>View Status</Text>
          </View>
          <Switch
            value={perms.can_view_status}
            onValueChange={() => togglePermission(item.id, 'can_view_status')}
            trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: colors.orange || colors.warning }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.headerFloating}>
          <GlassBackground intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Permissions</Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{user.first_name} {user.last_name}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </View>

        <FlatList
          data={doors}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDoor}
          contentContainerStyle={[styles.listContent, { paddingTop: FLOATING_HEADER_HEIGHT, paddingBottom: TAB_BAR_PADDING_BOTTOM }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={{ paddingVertical: spacing.lg }}>
              <PrimaryButton
                title="Save Permissions"
                onPress={handleSave}
                loading={saving}
                icon={<Save size={18} color="#FFFFFF" strokeWidth={2} />}
              />
              <View style={{ height: spacing.xxxl }} />
            </View>
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  headerFloating: {
    position: 'absolute', top: 0, left: 20, right: 20, zIndex: 10,
    borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
  },
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
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  doorCard: {
    borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1,
  },
  doorName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
  doorIp: { fontSize: 12, marginBottom: spacing.md },
  permissionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  permLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  permText: { fontSize: 14, fontWeight: '500' },
});
