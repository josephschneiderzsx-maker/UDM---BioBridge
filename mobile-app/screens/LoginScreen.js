import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Mail, Lock, Building2, ChevronLeft } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('entreprise-1');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    checkServerUrl();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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

  const checkServerUrl = async () => {
    try {
      await api.initialize();
      if (!api.baseUrl) {
        navigation.replace('ServerConfig');
      }
    } catch (error) {
      navigation.replace('ServerConfig');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || !tenant.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await api.login(email.trim(), password, tenant.trim());
      navigation.replace('DoorList');
    } catch (error) {
      Alert.alert('Sign In Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.replace('ServerConfig')}
          >
            <ChevronLeft size={24} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

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
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.title}>UDM</Text>
              <Text style={styles.subtitle}>
                URZIS DOOR MONITORING
              </Text>
              <Text style={styles.description}>
                Sign in to access your doors
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label="Organization"
                value={tenant}
                onChangeText={setTenant}
                placeholder="Enter organization ID"
                icon={<Building2 size={20} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                icon={<Mail size={20} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                icon={<Lock size={20} color={colors.textTertiary} strokeWidth={1.5} />}
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
    backgroundColor: colors.background,
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  welcomeText: {
    fontSize: 17,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  form: {
    marginBottom: spacing.xl,
  },
});
