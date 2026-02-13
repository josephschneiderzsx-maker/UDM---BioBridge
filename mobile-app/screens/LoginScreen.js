import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Building2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import Logo from '../components/Logo';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadSavedTenant();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
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

  const loadSavedTenant = async () => {
    try {
      const savedTenant = await AsyncStorage.getItem('tenant');
      if (savedTenant) setTenant(savedTenant);
    } catch {}
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || !tenant.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.login(email.trim(), password, tenant.trim());
      navigation.replace('MainTabs');
    } catch (error) {
      if (error.isLicenseExpired) {
        Alert.alert('License Expired', error.message);
      } else {
        Alert.alert('Sign In Failed', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.header}>
              <Logo width={220} />
              <View style={styles.logoSpacer} />
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Sign in to manage your access
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Organization"
                value={tenant}
                onChangeText={setTenant}
                placeholder="Enter organization ID"
                icon={<Building2 size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                icon={<Mail size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                icon={<Lock size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />
            </View>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  logoSpacer: {
    height: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginBottom: spacing.xl,
  },
});
