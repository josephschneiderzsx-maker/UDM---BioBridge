import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Building2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('tenant').then(t => { if (t) setTenant(t); }).catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password || !tenant.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await api.login(email.trim().toLowerCase(), password, tenant.trim().toLowerCase());
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <Logo width={200} variant="white" />
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Sign in</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Access your URZIS PASS account
            </Text>

            <Input
              label="Organization"
              value={tenant}
              onChangeText={setTenant}
              placeholder="your-org"
              autoCapitalize="none"
              icon={<Building2 size={18} color={colors.textSecondary} strokeWidth={2} />}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              keyboardType="email-address"
              autoComplete="email"
              icon={<Mail size={18} color={colors.textSecondary} strokeWidth={2} />}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              icon={<Lock size={18} color={colors.textSecondary} strokeWidth={2} />}
            />

            <PrimaryButton title="Sign In" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.footer}>
            <Image
              source={require('../assets/urzis-logo.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  form: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerLogo: { width: 80, height: 26, opacity: 0.5 },
});
