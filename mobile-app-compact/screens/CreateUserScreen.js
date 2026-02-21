import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, Lock, User, ShieldCheck } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

export default function CreateUserScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const editUser = route.params?.editUser;
  const isEditMode = !!editUser;

  const [email, setEmail] = useState(editUser?.email || '');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState(editUser?.first_name || '');
  const [lastName, setLastName] = useState(editUser?.last_name || '');
  const [isAdmin, setIsAdmin] = useState(editUser?.is_admin || false);
  const [saving, setSaving] = useState(false);
  const [userQuota, setUserQuota] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isEditMode) {
      api.getUsersQuota().then(setUserQuota).catch(() => {});
    }
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [isEditMode]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isEditMode) api.getUsersQuota().then(setUserQuota).catch(() => {});
    });
    return unsubscribe;
  }, [navigation, isEditMode]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    if (!isEditMode) {
      if (userQuota && userQuota.remaining <= 0) {
        Alert.alert(
          'Limit Reached',
          `You have reached your limit of ${userQuota.quota} users. Please contact your administrator to increase your quota.`
        );
        return;
      }
      if (!email.trim() || !password.trim()) {
        Alert.alert('Error', 'Email and password are required');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditMode) {
        await api.updateUser(editUser.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          is_admin: isAdmin,
        });
        Alert.alert('Success', 'User updated', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await api.createUser({
          email: email.trim(),
          password: password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          is_admin: isAdmin,
        });
        Alert.alert('Success', 'User created', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEditMode ? 'Edit User' : 'Create User'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isEditMode && userQuota && (
            <View style={[styles.quotaCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <View style={styles.quotaRow}>
                <Text style={[styles.quotaLabel, { color: colors.textSecondary }]}>User Quota</Text>
                <Text
                  style={[
                    styles.quotaValue,
                    { color: colors.textPrimary },
                    userQuota.remaining === 0 && { color: colors.danger },
                  ]}
                >
                  {userQuota.used} / {userQuota.quota}
                </Text>
              </View>
              <View style={[styles.quotaBar, { backgroundColor: colors.fillTertiary }]}>
                <View
                  style={[
                    styles.quotaFill,
                    {
                      width: `${(userQuota.used / userQuota.quota) * 100}%`,
                      backgroundColor: userQuota.remaining === 0 ? colors.danger : colors.primary,
                    },
                  ]}
                />
              </View>
              {userQuota.remaining === 0 && (
                <Text style={[styles.quotaWarning, { color: colors.danger }]}>
                  Cannot create more users. Quota limit reached.
                </Text>
              )}
            </View>
          )}
          {!isEditMode && (
            <>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                keyboardType="email-address"
                icon={<Mail size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                secureTextEntry
                icon={<Lock size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />
            </>
          )}

          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            icon={<User size={18} color={colors.textTertiary} strokeWidth={1.5} />}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            icon={<User size={18} color={colors.textTertiary} strokeWidth={1.5} />}
          />

          {/* Admin Toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <View style={[styles.toggleIcon, { backgroundColor: colors.primaryDim }]}>
              <ShieldCheck size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Administrator</Text>
            <Switch
              value={isAdmin}
              onValueChange={setIsAdmin}
              trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={{ height: spacing.xl }} />

          <PrimaryButton
            title={isEditMode ? 'Save Changes' : 'Create User'}
            onPress={handleSave}
            loading={saving}
            disabled={!isEditMode && userQuota && userQuota.remaining <= 0}
          />

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
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
  title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  scrollContent: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm,
  },
  quotaCard: {
    borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1,
  },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  quotaLabel: { fontSize: 14 },
  quotaValue: { fontSize: 14, fontWeight: '700' },
  quotaBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  quotaFill: { height: '100%', borderRadius: 3 },
  quotaWarning: { fontSize: 12, marginTop: 6 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.lg,
    marginTop: spacing.sm, borderWidth: 1,
  },
  toggleIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  toggleLabel: { flex: 1, fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
});
