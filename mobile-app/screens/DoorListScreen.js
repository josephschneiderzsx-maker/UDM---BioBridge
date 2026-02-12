import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LogOut, Plus, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import DoorCard from '../components/DoorCard';
import { colors, spacing, borderRadius } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DoorListScreen({ navigation }) {
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
              navigation.replace('Login');
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

  const handleAddDoor = () => {
    navigation.navigate('AddDoor');
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await api.clearAuth();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Shield size={28} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>No doors</Text>
      <Text style={styles.emptyText}>
        You don't have access to any doors yet.{'\n'}
        Contact your administrator.
      </Text>
    </View>
  );

  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderDots}>
        <View style={[styles.loaderDot, { opacity: 0.3 }]} />
        <View style={[styles.loaderDot, { opacity: 0.6 }]} />
        <View style={[styles.loaderDot, { opacity: 1 }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
              <Text style={styles.brandLabel}>URZIS PASS</Text>
              <Text style={styles.greeting}>Doors</Text>
            </View>
            <View style={styles.headerActions}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddDoor}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LogOut size={16} color={colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{doors.length}</Text>
              <Text style={styles.statLabel}>
                {doors.length === 1 ? 'door' : 'doors'}
              </Text>
            </View>
            {quota && (
              <View style={styles.statPill}>
                <Text style={styles.statValue}>{quota.used}/{quota.quota}</Text>
                <Text style={styles.statLabel}>quota</Text>
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
              <DoorCard door={item} onPress={handleDoorPress} index={index} />
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
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 255, 0.15)',
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.separator,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textTertiary,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
