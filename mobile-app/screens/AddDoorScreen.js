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
import { X, Plus, Server, Lock, Clock } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function AddDoorScreen({ navigation }) {
  const [name, setName] = useState('');
  const [terminalIp, setTerminalIp] = useState('');
  const [terminalPort, setTerminalPort] = useState('4370');
  const [defaultDelay, setDefaultDelay] = useState('3000');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(null);
  const [agents, setAgents] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadQuota();
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

  const loadQuota = async () => {
    try {
      const quotaData = await api.getQuota();
      setQuota(quotaData);
    } catch (error) {
      console.error('Failed to load quota:', error);
      // Ne pas bloquer l'utilisateur si le quota ne charge pas
    }
  };

  const loadAgents = async () => {
    try {
      const agentsList = await api.getAgents();
      setAgents(agentsList);
      if (agentsList.length > 0) {
        setAgentId(agentsList[0].id.toString());
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      // Si les agents ne se chargent pas, permettre la saisie manuelle de l'agent_id
      Alert.alert(
        'Warning',
        'Could not load agents list. Please enter the agent ID manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !terminalIp.trim() || !agentId.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    // Vérifier le quota
    if (quota && quota.remaining <= 0) {
      Alert.alert(
        'Quota Exceeded',
        `You have reached your limit of ${quota.quota} doors. Please contact your administrator to increase your quota.`
      );
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

      const result = await api.createDoor(doorData);
      Alert.alert('Success', 'Door created successfully', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
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
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Door</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Quota Info */}
          {quota && (
            <View style={styles.quotaCard}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaLabel}>Door Quota</Text>
                <Text
                  style={[
                    styles.quotaStatus,
                    quota.remaining === 0 && styles.quotaStatusWarning,
                  ]}
                >
                  {quota.used} / {quota.quota}
                </Text>
              </View>
              <View style={styles.quotaBar}>
                <View
                  style={[
                    styles.quotaBarFill,
                    {
                      width: `${(quota.used / quota.quota) * 100}%`,
                      backgroundColor:
                        quota.remaining === 0
                          ? colors.danger
                          : quota.remaining <= 2
                          ? colors.warning
                          : colors.primary,
                    },
                  ]}
                />
              </View>
              {quota.remaining === 0 && (
                <Text style={styles.quotaWarning}>
                  You have reached your door limit
                </Text>
              )}
            </View>
          )}

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
                icon={<Lock size={20} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <Input
                label="Terminal IP Address"
                value={terminalIp}
                onChangeText={setTerminalIp}
                placeholder="192.168.1.100"
                keyboardType="numeric"
                icon={<Server size={20} color={colors.textTertiary} strokeWidth={1.5} />}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="Terminal Port"
                    value={terminalPort}
                    onChangeText={setTerminalPort}
                    placeholder="4370"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Input
                    label="Default Delay (ms)"
                    value={defaultDelay}
                    onChangeText={setDefaultDelay}
                    placeholder="3000"
                    keyboardType="numeric"
                    icon={<Clock size={20} color={colors.textTertiary} strokeWidth={1.5} />}
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
                <View style={styles.agentsList}>
                  <Text style={styles.agentsLabel}>Available Agents:</Text>
                  {agents.map((agent) => (
                    <TouchableOpacity
                      key={agent.id}
                      style={[
                        styles.agentItem,
                        agentId === agent.id.toString() && styles.agentItemSelected,
                      ]}
                      onPress={() => setAgentId(agent.id.toString())}
                    >
                      <Text
                        style={[
                          styles.agentText,
                          agentId === agent.id.toString() && styles.agentTextSelected,
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
              title="Create Door"
              onPress={handleCreate}
              loading={loading}
              disabled={quota && quota.remaining === 0}
              icon={<Plus size={18} color="#FFFFFF" strokeWidth={2.5} />}
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
    backgroundColor: colors.background,
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
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.separator,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  quotaCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quotaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  quotaStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  quotaStatusWarning: {
    color: colors.danger,
  },
  quotaBar: {
    height: 6,
    backgroundColor: colors.fillSecondary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  quotaBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quotaWarning: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
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
  agentsList: {
    marginTop: spacing.md,
  },
  agentsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  agentItem: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  agentItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  agentText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  agentTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
