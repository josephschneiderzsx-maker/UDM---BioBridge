import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Lock, LogOut, Users, Mail, Save, Smartphone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedThemeSwitch from '../components/AnimatedThemeSwitch';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';
import useResponsive from '../hooks/useResponsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AccountScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const { scaleFont, spacing: rSpacing, isSmallPhone, isTablet, contentMaxWidth } = useResponsive();

  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const HEADER_TOP_PADDING = Math.max(rSpacing(24), SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

  useEffect(() => {
    loadProfile();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setIsAdmin(data.is_admin || false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile(firstName.trim(), lastName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password changed successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await api.clearAuth();
          resetToLogin();
        },
      },
    ]);
  };

  const sectionPadding = isSmallPhone ? 14 : isTablet ? 24 : 20;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: HEADER_TOP_PADDING }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={isSmallPhone ? 18 : 20} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: scaleFont(18) }]}>Account</Text>
          <AnimatedThemeSwitch size={isSmallPhone ? 'small' : 'medium'} />
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: rSpacing(24),
                maxWidth: contentMaxWidth(),
                alignSelf: isTablet ? 'center' : 'stretch',
                width: isTablet ? contentMaxWidth() : '100%',
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator, padding: sectionPadding }]}>
              <View style={styles.sectionHeader}>
                <User size={isSmallPhone ? 14 : 16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>Profile</Text>
              </View>

              {profile && (
                <View style={[styles.emailRow, { backgroundColor: colors.fillTertiary }]}>
                  <Mail size={14} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.emailText, { color: colors.textSecondary, fontSize: scaleFont(14) }]}>{profile.email}</Text>
                </View>
              )}

              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
              />
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
              />
              <PrimaryButton
                title="Save Profile"
                onPress={handleSaveProfile}
                loading={savingProfile}
                variant="secondary"
                size="small"
                icon={<Save size={isSmallPhone ? 14 : 16} color={colors.primary} strokeWidth={2} />}
              />
            </View>

            {/* Password Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator, padding: sectionPadding }]}>
              <View style={styles.sectionHeader}>
                <Lock size={isSmallPhone ? 14 : 16} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: scaleFont(15) }]}>Change Password</Text>
              </View>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
              />
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
              />
              <PrimaryButton
                title="Change Password"
                onPress={handleChangePassword}
                loading={changingPassword}
                variant="secondary"
                size="small"
                icon={<Lock size={isSmallPhone ? 14 : 16} color={colors.primary} strokeWidth={2} />}
              />
            </View>

            {/* Admin: Manage Users */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
                onPress={() => navigation.navigate('UsersList')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrapper, { backgroundColor: colors.primaryDim }]}>
                  <Users size={isSmallPhone ? 16 : 18} color={colors.primary} strokeWidth={2} />
                </View>
                <Text style={[styles.menuText, { color: colors.textPrimary, fontSize: scaleFont(16) }]}>Manage Users</Text>
                <ChevronLeft size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            )}

            {/* Widget Settings */}
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
              onPress={() => navigation.navigate('WidgetSettings')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: colors.primaryDim }]}>
                <Smartphone size={isSmallPhone ? 16 : 18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.menuText, { color: colors.textPrimary, fontSize: scaleFont(16) }]}>Quick Unlock Widget</Text>
              <ChevronLeft size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: colors.dangerDim }]}>
                <LogOut size={isSmallPhone ? 16 : 18} color={colors.danger} strokeWidth={2} />
              </View>
              <Text style={[styles.menuText, { color: colors.danger, fontSize: scaleFont(16) }]}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
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
  scrollContent: { paddingTop: spacing.sm },
  section: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontWeight: '600', letterSpacing: -0.2 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  emailText: {},
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  menuIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: { flex: 1, fontWeight: '500', letterSpacing: -0.2 },
});
