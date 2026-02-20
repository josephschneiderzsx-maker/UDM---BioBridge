import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function UserPermissionsScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = route.params;
  const [doors, setDoors] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [doorsList, permsList] = await Promise.all([
        api.getDoors(),
        api.getUserPermissions(user.id),
      ]);
      setDoors(doorsList);
      setPermissions(permsList.map(p => p.door_id || p));
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDoor = (doorId) => {
    setPermissions(prev =>
      prev.includes(doorId)
        ? prev.filter(id => id !== doorId)
        : [...prev, doorId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setUserPermissions(user.id, permissions);
      Alert.alert('Saved', 'Permissions updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Permissions</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      {/* User info */}
      <View style={[styles.userCard, { backgroundColor: colors.card, borderBottomColor: colors.separator }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDim }]}>
          <User size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={doors}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              DOOR ACCESS
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.doorName, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.doorIp, { color: colors.textSecondary }]}>{item.terminal_ip}</Text>
              <Switch
                value={permissions.includes(item.id)}
                onValueChange={() => toggleDoor(item.id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          )}
        />
      )}
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
  saveBtn: { padding: 4, minWidth: 40, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '600' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 2, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  doorName: { flex: 1, fontSize: 15, fontWeight: '500' },
  doorIp: { fontSize: 13, marginRight: 12 },
});
