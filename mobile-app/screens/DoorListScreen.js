import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Alert, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radio, Sun, Moon } from 'lucide-react-native';
import api from '../services/api';
import DoorCard from '../components/DoorCard';
import { SkeletonList } from '../components/SkeletonLoader';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';
import useResponsive from '../hooks/useResponsive';

export default function DoorListScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const insets = useSafeAreaInsets();
  const { 
    scaleFont, spacing, iconSize, tabBarPadding,
    isSmallPhone, isVerySmallPhone, isTablet, contentMaxWidth 
  } = useResponsive();
  
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [quota, setQuota] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [doorsList, profile] = await Promise.all([
        api.getDoors(),
        api.getProfile().catch(() => null),
      ]);
      setDoors(doorsList);
      setIsAdmin(profile?.role === 'admin');

      // Load quota (admin only usually, but try regardless)
      api.getQuota()
        .then(q => setQuota(q))
        .catch(() => {});

      if (profile?.role === 'admin') {
        api.getDiscoveredDevices()
          .then(d => setPendingCount(d.length))
          .catch(() => {});
      }
    } catch (error) {
      if (error.message === 'Session expired') {
        resetToLogin?.();
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation, loadData]);

  const handleDoorPress = (door) => navigation.navigate('DoorControl', { door });

  const handleDoorLongPress = (door) => {
    Alert.alert(door.name, 'What would you like to do?', [
      { text: 'Edit', onPress: () => navigation.navigate('EditDoor', { door }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(door),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (door) => {
    Alert.alert('Delete door', `Remove "${door.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDoor(door.id);
            setDoors(prev => prev.filter(d => d.id !== door.id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const quotaAtLimit = quota && quota.used >= quota.quota;

  const logoWidth = isVerySmallPhone ? 90 : isSmallPhone ? 100 : isTablet ? 140 : 110;
  const themeIconSize = iconSize(20);
  const radioIconSize = iconSize(13);
  const contentPadding = spacing(16);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { 
        borderBottomColor: colors.separator,
        paddingHorizontal: contentPadding,
        paddingVertical: spacing(12),
      }]}>
        <View style={styles.logoWrap}>
          <Logo width={logoWidth} />
          {quota && (
            <View style={[
              styles.quotaBadge,
              { backgroundColor: quotaAtLimit ? colors.dangerDim : colors.primaryDim },
            ]}>
              <Text style={[
                styles.quotaText,
                { 
                  color: quotaAtLimit ? colors.danger : colors.primary,
                  fontSize: scaleFont(11),
                },
              ]}>
                {quota.used}/{quota.quota}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isAdmin && pendingCount > 0 && (
            <TouchableOpacity
              style={[styles.pendingBadge, { backgroundColor: colors.warning }]}
              onPress={() => navigation.navigate('DiscoveredDevices')}
            >
              <Radio size={radioIconSize} color="#000" strokeWidth={2.5} />
              <Text style={[styles.pendingText, { fontSize: scaleFont(12) }]}>{pendingCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
            {isDark
              ? <Sun size={themeIconSize} color={colors.textSecondary} strokeWidth={2} />
              : <Moon size={themeIconSize} color={colors.textSecondary} strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={[styles.content, { padding: contentPadding }]}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={doors}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[
            styles.content,
            { 
              padding: contentPadding,
              paddingBottom: tabBarPadding(),
              maxWidth: contentMaxWidth(),
              alignSelf: 'center',
              width: '100%',
            },
            doors.length === 0 && styles.emptyContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData(); }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <DoorCard
              door={item}
              onPress={handleDoorPress}
              onLongPress={handleDoorLongPress}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { 
                color: colors.textPrimary,
                fontSize: scaleFont(17),
              }]}>
                No doors yet
              </Text>
              <Text style={[styles.emptyText, { 
                color: colors.textSecondary,
                fontSize: scaleFont(14),
              }]}>
                Add your first door from the Add tab.
              </Text>
            </View>
          }
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
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quotaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  quotaText: {
    fontWeight: '700',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  pendingText: { fontWeight: '700', color: '#000' },
  iconBtn: { padding: 4 },
  content: {},
  emptyContent: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontWeight: '600', marginBottom: 8 },
  emptyText: { textAlign: 'center' },
});
