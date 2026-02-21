import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Lock, LogOut, Users, Smartphone, ChevronRight } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';
import WidgetService from '../services/WidgetService';
import useResponsive from '../hooks/useResponsive';

export default function AccountScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const insets = useSafeAreaInsets();
  const { 
    scaleFont, spacing, iconSize, tabBarPadding,
    isSmallPhone, isVerySmallPhone, isTablet, contentMaxWidth 
  } = useResponsive();
  
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
      setFirstName(p.first_name || '');
      setLastName(p.last_name || '');
      setIsAdmin(p.role === 'admin');
    } catch (error) {
      if (error.message === 'Session expired') resetToLogin?.();
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateProfile(firstName.trim(), lastName.trim());
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await api.clearAuth();
          await WidgetService.clearWidgetData();
          resetToLogin?.();
        },
      },
    ]);
  };

  const contentPadding = spacing(16);
  const avatarSize = isVerySmallPhone ? 38 : isSmallPhone ? 42 : 44;
  const userIconSize = iconSize(22);
  const lockIconSize = iconSize(18);
  const chevronIconSize = iconSize(18);
  const menuIconSize = iconSize(18);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        borderBottomColor: colors.separator,
        paddingHorizontal: contentPadding,
        paddingVertical: spacing(14),
      }]}>
        <Text style={[styles.title, { 
          color: colors.textPrimary,
          fontSize: scaleFont(20),
        }]}>Account</Text>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { 
          padding: contentPadding,
          paddingBottom: tabBarPadding(),
          maxWidth: contentMaxWidth(),
          alignSelf: 'center',
          width: '100%',
        }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={[styles.section, { marginBottom: spacing(24) }]}>
          <Text style={[styles.sectionTitle, { 
            color: colors.textSecondary,
            fontSize: scaleFont(12),
            marginBottom: spacing(8),
          }]}>PROFILE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.profileRow, { padding: spacing(14), gap: spacing(12) }]}>
              <View style={[styles.avatar, { 
                backgroundColor: colors.primaryDim,
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              }]}>
                <User size={userIconSize} color={colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.profileName, { 
                  color: colors.textPrimary,
                  fontSize: scaleFont(16),
                }]}>
                  {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : '...'}
                </Text>
                <Text style={[styles.profileEmail, { 
                  color: colors.textSecondary,
                  fontSize: scaleFont(13),
                }]}>
                  {profile?.email}
                  {isAdmin ? '  ·  Admin' : ''}
                </Text>
              </View>
            </View>
          </View>
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
            autoCapitalize="words"
          />
          <Input
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Doe"
            autoCapitalize="words"
          />
          <PrimaryButton title="Save Profile" onPress={handleSaveProfile} loading={savingProfile} size="small" />
        </View>

        {/* Password */}
        <View style={[styles.section, { marginBottom: spacing(24) }]}>
          <Text style={[styles.sectionTitle, { 
            color: colors.textSecondary,
            fontSize: scaleFont(12),
            marginBottom: spacing(8),
          }]}>CHANGE PASSWORD</Text>
          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
            icon={<Lock size={lockIconSize} color={colors.textSecondary} strokeWidth={2} />}
          />
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <PrimaryButton
            title="Change Password"
            onPress={handleChangePassword}
            loading={changingPassword}
            variant="outline"
            size="small"
          />
        </View>

        {/* Preferences */}
        <View style={[styles.section, { marginBottom: spacing(24) }]}>
          <Text style={[styles.sectionTitle, { 
            color: colors.textSecondary,
            fontSize: scaleFont(12),
            marginBottom: spacing(8),
          }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { padding: spacing(14) }]}>
              <Text style={[styles.rowLabel, { 
                color: colors.textPrimary,
                fontSize: scaleFont(15),
              }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Admin */}
        {isAdmin && (
          <View style={[styles.section, { marginBottom: spacing(24) }]}>
            <Text style={[styles.sectionTitle, { 
              color: colors.textSecondary,
              fontSize: scaleFont(12),
              marginBottom: spacing(8),
            }]}>ADMINISTRATION</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.row, { padding: spacing(14) }]}
                onPress={() => navigation.navigate('UsersList')}
              >
                <View style={styles.rowLeft}>
                  <Users size={menuIconSize} color={colors.primary} strokeWidth={2} />
                  <Text style={[styles.rowLabel, { 
                    color: colors.textPrimary,
                    fontSize: scaleFont(15),
                  }]}>Manage Users</Text>
                </View>
                <ChevronRight size={chevronIconSize} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Widget */}
        <View style={[styles.section, { marginBottom: spacing(24) }]}>
          <Text style={[styles.sectionTitle, { 
            color: colors.textSecondary,
            fontSize: scaleFont(12),
            marginBottom: spacing(8),
          }]}>QUICK ACCESS</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.row, { padding: spacing(14) }]}
              onPress={() => navigation.navigate('WidgetSettings')}
            >
              <View style={styles.rowLeft}>
                <Smartphone size={menuIconSize} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.rowLabel, { 
                  color: colors.textPrimary,
                  fontSize: scaleFont(15),
                }]}>Widget Settings</Text>
              </View>
              <ChevronRight size={chevronIconSize} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={[styles.section, { marginBottom: spacing(32) }]}>
          <PrimaryButton title="Sign Out" onPress={handleLogout} variant="danger" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontWeight: '700' },
  content: {},
  section: {},
  sectionTitle: { fontWeight: '600', marginLeft: 2, letterSpacing: 0.5 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: { fontWeight: '600', marginBottom: 2 },
  profileEmail: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: {},
});
