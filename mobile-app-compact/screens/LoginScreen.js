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
  Image,
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
            <View style={styles.logoContainer}>
              <Logo width={200} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Welcome back
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Sign in to manage your doors
            </Text>

            <View style={[styles.card, {
              backgroundColor: colors.surface,
              borderColor: colors.separator,
              shadowColor: '#000',
            }]}>
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

              <View style={styles.buttonContainer}>
                <PrimaryButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Image
                source={require('../assets/urzis-logo.png')}
                style={styles.footerLogo}
                resizeMode="contain"
              />
            </View>
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
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    opacity: 0.5,
  },
  footerLogo: {
    width: 90,
    height: 30,
  },
});
