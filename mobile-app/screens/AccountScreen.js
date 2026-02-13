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
import { ChevronLeft, User, Lock, LogOut, Users, Mail, Save } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

export default function AccountScreen({ navigation }) {
  const { colors } = useTheme();
  const { resetToLogin } = useRootNavigation();
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

  useEffect(() => {
    loadProfile();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
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
          await api.clearAuth();
          resetToLogin();
        },
      },
    ]);
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <View style={styles.sectionHeader}>
              <User size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Profile</Text>
            </View>

            {profile && (
              <View style={[styles.emailRow, { backgroundColor: colors.fillTertiary }]}>
                <Mail size={14} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.emailText, { color: colors.textSecondary }]}>{profile.email}</Text>
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
              icon={<Save size={16} color={colors.primary} strokeWidth={2} />}
            />
          </View>

          {/* Password Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <View style={styles.sectionHeader}>
              <Lock size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Change Password</Text>
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
              icon={<Lock size={16} color={colors.primary} strokeWidth={2} />}
            />
          </View>

          {/* Admin: Manage Users */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
              onPress={() => navigation.navigate('UsersList')}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: colors.primaryDim }]}>
                <Users size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.menuText, { color: colors.textPrimary }]}>Manage Users</Text>
              <ChevronLeft size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          )}

          {/* Sign Out */}
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={handleLogout}
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: colors.dangerDim }]}>
              <LogOut size={18} color={colors.danger} strokeWidth={2} />
            </View>
            <Text style={[styles.menuText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: HEADER_TOP_PADDING,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  emailText: {
    fontSize: 14,
  },
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
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
