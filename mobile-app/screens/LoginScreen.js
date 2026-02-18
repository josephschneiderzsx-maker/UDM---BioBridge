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
import useResponsive from '../hooks/useResponsive';

export default function LoginScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const {
    scaleFont,
    spacing: rSpacing,
    isSmallPhone,
    isTablet,
    contentMaxWidth,
    buttonHeight,
  } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadSavedTenant();
    
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
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

  const cardPadding = isSmallPhone ? 16 : isTablet ? 28 : 20;
  const logoWidth = isSmallPhone ? 160 : isTablet ? 260 : 200;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
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
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Logo with scale animation */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: logoScaleAnim }],
                  marginBottom: rSpacing(24),
                },
              ]}
            >
              <Logo width={logoWidth} />
            </Animated.View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontSize: scaleFont(isSmallPhone ? 22 : 26),
                },
              ]}
            >
              Welcome back
            </Text>
            <Text
              style={[
                styles.description,
                {
                  color: colors.textSecondary,
                  fontSize: scaleFont(isSmallPhone ? 14 : 15),
                  marginBottom: rSpacing(24),
                },
              ]}
            >
              Sign in to manage your doors
            </Text>

            {/* Form Card with slide animation */}
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  padding: cardPadding,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Input
                label="Organization"
                value={tenant}
                onChangeText={setTenant}
                placeholder="Enter organization ID"
                icon={
                  <Building2
                    size={isSmallPhone ? 16 : 18}
                    color={colors.textTertiary}
                    strokeWidth={1.5}
                  />
                }
                testID="login-tenant-input"
              />

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoComplete="email"
                icon={
                  <Mail
                    size={isSmallPhone ? 16 : 18}
                    color={colors.textTertiary}
                    strokeWidth={1.5}
                  />
                }
                testID="login-email-input"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                icon={
                  <Lock
                    size={isSmallPhone ? 16 : 18}
                    color={colors.textTertiary}
                    strokeWidth={1.5}
                  />
                }
                testID="login-password-input"
              />

              <View style={[styles.buttonContainer, { marginTop: rSpacing(16) }]}>
                <PrimaryButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  size={isSmallPhone ? 'medium' : 'large'}
                />
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                {
                  marginTop: rSpacing(32),
                  opacity: fadeAnim,
                },
              ]}
            >
              <Image
                source={require('../assets/urzis-logo.png')}
                style={[
                  styles.footerLogo,
                  {
                    width: isSmallPhone ? 70 : 90,
                    height: isSmallPhone ? 24 : 30,
                  },
                ]}
                resizeMode="contain"
              />
            </Animated.View>
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
    paddingBottom: spacing.xxxl,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonContainer: {},
  footer: {
    alignItems: 'center',
    opacity: 0.5,
  },
  footerLogo: {},
});
