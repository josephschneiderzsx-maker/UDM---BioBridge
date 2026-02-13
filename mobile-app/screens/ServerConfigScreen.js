import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wifi } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function ServerConfigScreen({ navigation }) {
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      setError('Please enter a server URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.setServerUrl(serverUrl.trim());
      navigation.replace('Login');
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Animated.View
          style={[
            styles.inner,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Wifi size={28} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Connect</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your URZIS PASS server address
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Server URL"
              value={serverUrl}
              onChangeText={(text) => {
                setServerUrl(text);
                setError('');
              }}
              placeholder="https://server.example.com:8080"
              keyboardType="url"
              error={error}
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Contact your system administrator if you don't know the server address
            </Text>
          </View>

          <View style={styles.footer}>
            <PrimaryButton
              title="Continue"
              onPress={handleSave}
              loading={loading}
            />
            <View style={styles.brandFooter}>
              <Image
                source={require('../assets/urzis-logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: spacing.xl,
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: spacing.xl,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  brandFooter: {
    marginTop: 40,
    opacity: 0.5,
  },
  brandLogo: {
    width: 100,
    height: 30,
  },
});
