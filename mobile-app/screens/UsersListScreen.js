import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Shield, UserCog } from 'lucide-react-native';
import api from '../services/api';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

export default function UsersListScreen({ navigation }) {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsers();
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadUsers());
    return unsubscribe;
  }, [navigation]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUserLongPress = (user) => {
    Alert.alert(
      `${user.first_name} ${user.last_name}`,
      user.email,
      [
        {
          text: 'Edit',
          onPress: () => {
            Alert.prompt
              ? promptEditUser(user)
              : editUserDialog(user);
          },
        },
        {
          text: 'Permissions',
          onPress: () => navigation.navigate('UserPermissions', { user }),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteUser(user),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const editUserDialog = (user) => {
    // Navigate to a simple edit - reuse CreateUser screen in edit mode
    navigation.navigate('CreateUser', { editUser: user });
  };

  const promptEditUser = (user) => {
    navigation.navigate('CreateUser', { editUser: user });
  };

  const confirmDeleteUser = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${user.first_name} ${user.last_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUser(user.id);
              loadUsers();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.separator }]}
      onPress={() => navigation.navigate('UserPermissions', { user: item })}
      onLongPress={() => handleUserLongPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.avatar, { backgroundColor: item.is_admin ? colors.primaryDim : colors.fillTertiary }]}>
        <Text style={[styles.avatarText, { color: item.is_admin ? colors.primary : colors.textSecondary }]}>
          {(item.first_name || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.first_name} {item.last_name}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textTertiary }]} numberOfLines={1}>
          {item.email}
        </Text>
      </View>
      {item.is_admin && (
        <View style={[styles.adminBadge, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.adminText, { color: colors.primary }]}>Admin</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Users</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primaryDim }]}
            onPress={() => navigation.navigate('CreateUser')}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadUsers(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <UserCog size={28} color={colors.textTertiary} strokeWidth={1.5} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
              </View>
            )
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  addButton: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0, 170, 255, 0.15)',
  },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxxl },
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: borderRadius.lg, padding: spacing.lg,
    marginBottom: 10, borderWidth: 1,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1, marginRight: spacing.sm },
  userName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, marginBottom: 3 },
  userEmail: { fontSize: 13, letterSpacing: 0.1 },
  adminBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  adminText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, marginTop: spacing.md },
});
