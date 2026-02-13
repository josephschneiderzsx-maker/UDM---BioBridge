import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Sun, Moon, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import DoorCard from '../components/DoorCard';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_TOP_PADDING = Math.max(spacing.xl, SCREEN_HEIGHT * 0.02) + (Platform.OS === 'android' ? 10 : 0);

export default function DoorListScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quota, setQuota] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    loadDoors();
    loadQuota();
    checkAdminStatus();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDoors();
      loadQuota();
    });
    return unsubscribe;
  }, [navigation]);

  const checkAdminStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.isAdmin === 'true' || payload.isAdmin === true);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  const loadQuota = async () => {
    try {
      const quotaData = await api.getQuota();
      setQuota(quotaData);
    } catch (error) {
      console.error('Failed to load quota:', error);
    }
  };

  const loadDoors = async () => {
    try {
      setLoading(true);
      const doorsList = await api.getDoors();
      setDoors(doorsList);
    } catch (error) {
      Alert.alert('Error', error.message, [
        {
          text: 'OK',
          onPress: () => {
            if (error.message === 'Session expired') {
              resetToLogin();
            }
          },
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDoors();
  };

  const handleDoorPress = (door) => {
    navigation.navigate('DoorControl', { door });
  };

  const handleDoorLongPress = (door) => {
    if (!isAdmin) return;
    Alert.alert(
      door.name,
      'Choose an action',
      [
        {
          text: 'Edit',
          onPress: () => navigation.navigate('EditDoor', { door }),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteDoor(door),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const confirmDeleteDoor = (door) => {
    Alert.alert(
      'Delete Door',
      `Are you sure you want to delete "${door.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteDoor(door.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadDoors();
              loadQuota();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleActivityLog = () => {
    navigation.navigate('ActivityLog');
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        <Shield size={28} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No doors</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        You don't have access to any doors yet.{'\n'}
        Contact your administrator.
      </Text>
    </View>
  );

  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderDots}>
        <View style={[styles.loaderDot, { opacity: 0.3, backgroundColor: colors.primary }]} />
        <View style={[styles.loaderDot, { opacity: 0.6, backgroundColor: colors.primary }]} />
        <View style={[styles.loaderDot, { opacity: 1, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[styles.inner, { opacity: fadeAnim }]}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ translateY: headerSlideAnim }] },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Logo width={130} />
              <Text style={[styles.greeting, { color: colors.textPrimary }]}>Doors</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
                onPress={handleToggleTheme}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isDark ? (
                  <Sun size={16} color={colors.textSecondary} strokeWidth={2.5} />
                ) : (
                  <Moon size={16} color={colors.textSecondary} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.separator }]}
                  onPress={handleActivityLog}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Clock size={16} color={colors.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{doors.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                {doors.length === 1 ? 'door' : 'doors'}
              </Text>
            </View>
            {quota && (
              <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{quota.used}/{quota.quota}</Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>quota</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Content */}
        {loading && doors.length === 0 ? (
          renderLoader()
        ) : doors.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={doors}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, index }) => (
              <DoorCard
                door={item}
                onPress={handleDoorPress}
                onLongPress={handleDoorLongPress}
                index={index}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
