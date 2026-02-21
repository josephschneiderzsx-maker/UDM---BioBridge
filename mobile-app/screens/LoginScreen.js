import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Building2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { 
    scaleFont, spacing, iconSize, 
    isSmallPhone, isVerySmallPhone, isTablet, 
    contentMaxWidth 
  } = useResponsive();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('');
  const [loading, setLoading] = useState(false);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    AsyncStorage.getItem('tenant').then(t => { if (t) setTenant(t); }).catch(() => {});
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
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

  const logoWidth = isVerySmallPhone ? 160 : isSmallPhone ? 180 : isTablet ? 260 : 200;
  const paddingHorizontal = isVerySmallPhone ? 16 : isSmallPhone ? 20 : isTablet ? 32 : 24;
  const logoAreaPadding = isVerySmallPhone ? 40 : isSmallPhone ? 50 : 60;
  const inputIconSize = iconSize(18);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { 
            paddingHorizontal,
            maxWidth: contentMaxWidth(),
            alignSelf: 'center',
            width: '100%',
          }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[
            styles.logoArea,
            { 
              paddingTop: logoAreaPadding,
              paddingBottom: spacing(40),
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <Logo width={logoWidth} variant="white" />
          </Animated.View>

          <Animated.View style={[
            styles.form,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
            <Text style={[styles.title, { 
              color: colors.textPrimary,
              fontSize: scaleFont(isVerySmallPhone ? 24 : 28),
            }]}>
              Sign in
            </Text>
            <Text style={[styles.subtitle, { 
              color: colors.textSecondary,
              fontSize: scaleFont(15),
              marginBottom: spacing(28),
            }]}>
              Access your URZIS PASS account
            </Text>

            <Input
              label="Organization"
              value={tenant}
              onChangeText={setTenant}
              placeholder="your-org"
              autoCapitalize="none"
              icon={<Building2 size={inputIconSize} color={colors.textSecondary} strokeWidth={2} />}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="name@company.com"
              keyboardType="email-address"
              autoComplete="email"
              icon={<Mail size={inputIconSize} color={colors.textSecondary} strokeWidth={2} />}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              icon={<Lock size={inputIconSize} color={colors.textSecondary} strokeWidth={2} />}
            />

            <PrimaryButton title="Sign In" onPress={handleLogin} loading={loading} />
          </Animated.View>

          <View style={[styles.footer, { paddingVertical: spacing(32) }]}>
            <Image
              source={require('../assets/urzis-logo.png')}
              style={[styles.footerLogo, { 
                width: isVerySmallPhone ? 60 : 80,
                height: isVerySmallPhone ? 20 : 26,
              }]}
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
  scroll: { flexGrow: 1 },
  logoArea: { alignItems: 'center' },
  form: { flex: 1 },
  title: { fontWeight: '700', marginBottom: 6 },
  subtitle: {},
  footer: { alignItems: 'center' },
  footerLogo: { opacity: 0.5 },
});
