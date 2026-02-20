import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2, Server, Clock } from 'lucide-react-native';
import api from '../services/api';
import Input from '../components/Input';
import PrimaryButton from '../components/PrimaryButton';
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

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !terminalIp.trim() || !agentId.trim()) {
      Alert.alert('Missing fields', 'Name, IP address and Agent are required.');
      return;
    }
    setLoading(true);
    try {
      await api.updateDoor(door.id, {
        name: name.trim(),
        terminal_ip: terminalIp.trim(),
        terminal_port: parseInt(terminalPort) || 4370,
        default_delay: parseInt(defaultDelay) || 3000,
        agent_id: parseInt(agentId),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete door', `Remove "${door.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDoor(door.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Door</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 size={20} color={colors.danger} strokeWidth={2} />
        </TouchableOpacity>
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

          <Text style={[styles.label, { color: colors.textSecondary }]}>Agent</Text>
          <View style={[styles.agentList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {agents.map(agent => (
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
            ))}
          </View>

          <PrimaryButton
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  deleteBtn: { padding: 4 },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginLeft: 2 },
  agentList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
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
