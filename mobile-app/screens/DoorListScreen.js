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
import { LogOut, RefreshCw, DoorOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import DoorCard from '../components/DoorCard';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function DoorListScreen({ navigation }) {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadDoors();
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
        <DoorOpen size={32} color={colors.textTertiary} strokeWidth={2} />
      </View>
      <Text style={styles.emptyTitle}>No doors available</Text>
      <Text style={styles.emptyText}>
        You don't have access to any doors yet.{'\n'}
        Contact your administrator for access.
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadDoors}
        activeOpacity={0.7}
      >
        <RefreshCw size={16} color={colors.primary} strokeWidth={2.5} />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoader = () => (
    <View style={styles.loaderContainer}>
      <View style={styles.loaderDot} />
      <View style={[styles.loaderDot, styles.loaderDotDelay1]} />
      <View style={[styles.loaderDot, styles.loaderDotDelay2]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.inner,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Doors</Text>
              <Text style={styles.subheading}>
                {doors.length} {doors.length === 1 ? 'door' : 'doors'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <LogOut size={18} color={colors.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </Animated.View>

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
    paddingBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subheading: {
    fontSize: 14,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.separator,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  loaderContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  loaderDotDelay1: {
    opacity: 0.6,
  },
  loaderDotDelay2: {
    opacity: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    letterSpacing: 0.1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
    letterSpacing: -0.2,
  },
});
