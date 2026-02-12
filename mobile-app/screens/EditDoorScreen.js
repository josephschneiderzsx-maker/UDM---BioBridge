import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { X, Save, Server, Lock, Clock } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function EditDoorScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { door } = route.params;

  const [name, setName] = useState(door.name || '');
  const [terminalIp, setTerminalIp] = useState(door.terminal_ip || '');
  const [terminalPort, setTerminalPort] = useState(String(door.terminal_port || 4370));
  const [defaultDelay, setDefaultDelay] = useState(String(door.default_delay || 3000));
  const [agentId, setAgentId] = useState(String(door.agent_id || ''));
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    loadAgents();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadAgents = async () => {
    try {
      const agentsList = await api.getAgents();
      setAgents(agentsList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !terminalIp.trim() || !agentId.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const doorData = {
        name: name.trim(),
        terminal_ip: terminalIp.trim(),
        terminal_port: parseInt(terminalPort) || 4370,
        default_delay: parseInt(defaultDelay) || 3000,
        agent_id: parseInt(agentId),
      };

      await api.updateDoor(door.id, doorData);
      Alert.alert('Success', 'Door updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
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
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Door</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              <Input
                label="Door Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Main Entrance"
                icon={<Lock size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Terminal IP"
                value={terminalIp}
                onChangeText={setTerminalIp}
                placeholder="192.168.1.100"
                keyboardType="numeric"
                icon={<Server size={18} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Port"
                    value={terminalPort}
                    onChangeText={setTerminalPort}
                    placeholder="4370"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Input
                    label="Delay (ms)"
                    value={defaultDelay}
                    onChangeText={setDefaultDelay}
                    placeholder="3000"
                    keyboardType="numeric"
                    icon={<Clock size={18} color={colors.textTertiary} strokeWidth={1.5} />}
                  />
                </View>
              </View>

              <Input
                label="Agent ID"
                value={agentId}
                onChangeText={setAgentId}
                placeholder="1"
                keyboardType="numeric"
              />

              {agents.length > 0 && (
                <View style={styles.agentsSection}>
                  <Text style={[styles.agentsLabel, { color: colors.textSecondary }]}>Available Agents</Text>
                  {agents.map((agent) => (
                    <TouchableOpacity
                      key={agent.id}
                      style={[
                        styles.agentItem,
                        { backgroundColor: colors.surface, borderColor: colors.separator },
                        agentId === agent.id.toString() && { borderColor: colors.primary, backgroundColor: colors.primaryDim },
                      ]}
                      onPress={() => setAgentId(agent.id.toString())}
                    >
                      <Text
                        style={[
                          styles.agentText,
                          { color: colors.textPrimary },
                          agentId === agent.id.toString() && { color: colors.primary, fontWeight: '600' },
                        ]}
                      >
                        {agent.name} (ID: {agent.id})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              icon={<Save size={16} color="#FFFFFF" strokeWidth={2.5} />}
            />
          </ScrollView>
        </Animated.View>
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
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  form: {
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  agentsSection: {
    marginTop: spacing.sm,
  },
  agentsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  agentItem: {
    padding: 14,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
  },
  agentText: {
    fontSize: 14,
  },
});
