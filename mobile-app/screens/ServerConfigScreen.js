import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wifi } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../contexts/ThemeContext';

export default function ServerConfigScreen({ navigation }) {
  const { colors } = useTheme();
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch {
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
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryDim }]}>
              <Wifi size={28} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Connect</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your URZIS PASS server address
            </Text>
          </View>

          <Input
            label="Server URL"
            value={serverUrl}
            onChangeText={(text) => { setServerUrl(text); setError(''); }}
            placeholder="http://192.168.1.100:8080"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
          />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Contact your system administrator if you don't know the server address.
          </Text>

          <PrimaryButton
            title="Continue"
            onPress={handleSave}
            loading={loading}
            style={{ marginTop: 24 }}
          />

          <View style={styles.brandFooter}>
            <Image
              source={require('../assets/urzis-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 24, flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  hint: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  brandFooter: { marginTop: 32, alignItems: 'center', opacity: 0.5 },
  brandLogo: { width: 90, height: 28 },
});
