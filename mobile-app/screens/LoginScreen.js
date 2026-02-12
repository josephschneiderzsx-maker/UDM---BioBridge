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
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('entreprise-1');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    checkServerUrl();
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
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => navigation.replace('ServerConfig')}
          >
            <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
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
              <Text style={[styles.brandLabel, { color: colors.primary }]}>URZIS</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>PASS</Text>
              <View style={[styles.divider, { backgroundColor: colors.primary }]} />
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  brandLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 16,
  },
  divider: {
    width: 32,
    height: 2,
    borderRadius: 1,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    marginBottom: spacing.xl,
  },
});
