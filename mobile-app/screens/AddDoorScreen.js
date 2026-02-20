import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Server, Lock, Clock } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../contexts/ThemeContext';

export default function AddDoorScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [terminalIp, setTerminalIp] = useState('');
  const [terminalPort, setTerminalPort] = useState('4370');
  const [defaultDelay, setDefaultDelay] = useState('3000');
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    Promise.all([api.getQuota(), api.getAgents()])
      .then(([q, a]) => { setQuota(q); setAgents(a); })
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || !terminalIp.trim() || !agentId.trim()) {
      Alert.alert('Missing fields', 'Name, IP address and Agent are required.');
      return;
    }
    setLoading(true);
    try {
      await api.createDoor({
        name: name.trim(),
        terminal_ip: terminalIp.trim(),
        terminal_port: parseInt(terminalPort) || 4370,
        default_delay: parseInt(defaultDelay) || 3000,
        agent_id: parseInt(agentId),
      });
      Alert.alert('Success', `"${name}" has been added.`, [
        { text: 'OK', onPress: () => { setName(''); setTerminalIp(''); setAgentId(''); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const atLimit = quota && quota.used >= quota.quota;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Add Door</Text>
        {quota && (
          <Text style={[styles.quota, { color: colors.textSecondary }]}>
            {quota.used}/{quota.quota} doors
          </Text>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {atLimit && (
            <View style={[styles.limitBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger }]}>
              <Text style={[styles.limitText, { color: colors.danger }]}>
                Door limit reached. Upgrade your plan to add more doors.
              </Text>
            </View>
          )}

          <Input
            label="Door Name"
            value={name}
            onChangeText={setName}
            placeholder="Main Entrance"
            autoCapitalize="words"
          />
          <Input
            label="Terminal IP"
            value={terminalIp}
            onChangeText={setTerminalIp}
            placeholder="192.168.1.100"
            keyboardType="decimal-pad"
            icon={<Server size={18} color={colors.textSecondary} strokeWidth={2} />}
          />
          <Input
            label="Port"
            value={terminalPort}
            onChangeText={setTerminalPort}
            placeholder="4370"
            keyboardType="number-pad"
          />
          <Input
            label="Unlock Duration (ms)"
            value={defaultDelay}
            onChangeText={setDefaultDelay}
            placeholder="3000"
            keyboardType="number-pad"
            icon={<Clock size={18} color={colors.textSecondary} strokeWidth={2} />}
          />

          {/* Agent picker */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Agent</Text>
          <View style={[styles.agentList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {agents.length === 0 ? (
              <Text style={[styles.agentEmpty, { color: colors.textTertiary }]}>No agents available</Text>
            ) : (
              agents.map(agent => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentRow,
                    { borderBottomColor: colors.separator },
                    String(agentId) === String(agent.id) && { backgroundColor: colors.primaryDim },
                  ]}
                  onPress={() => setAgentId(String(agent.id))}
                >
                  <View style={[
                    styles.radio,
                    { borderColor: String(agentId) === String(agent.id) ? colors.primary : colors.border },
                  ]}>
                    {String(agentId) === String(agent.id) && (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[styles.agentName, { color: colors.textPrimary }]}>{agent.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <PrimaryButton
            title="Add Door"
            onPress={handleAdd}
            loading={loading}
            disabled={atLimit}
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: '700' },
  quota: { fontSize: 13 },
  content: { padding: 16 },
  limitBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  limitText: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginLeft: 2 },
  agentList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  agentEmpty: { padding: 16, textAlign: 'center', fontSize: 14 },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  agentName: { fontSize: 15 },
});
