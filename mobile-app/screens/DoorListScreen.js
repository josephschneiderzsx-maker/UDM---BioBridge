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
import GlassBackground from '../components/GlassBackground';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Radio } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../services/api';
import DoorCard from '../components/DoorCard';
import { DoorCardSkeleton } from '../components/SkeletonLoader';
import AnimatedThemeSwitch from '../components/AnimatedThemeSwitch';
import { spacing, borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useRootNavigation } from '../contexts/RootNavigationContext';
import useResponsive from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../components/Logo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DoorListScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { resetToLogin } = useRootNavigation();
  const {
    scaleFont,
    spacing: rSpacing,
    isSmallPhone,
    isVerySmallPhone,
    isTablet,
    contentMaxWidth,
    headerHeight,
    tabBarPadding,
    isLowEndDevice,
    isCompactMode,
    floatingMargin,
  } = useResponsive();

  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quota, setQuota] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingDevicesCount, setPendingDevicesCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(16)).current;
  const listFadeAnim = useRef(new Animated.Value(0)).current;

  // Responsive header height
  const HEADER_TOP_PADDING = Math.max(rSpacing(20), SCREEN_HEIGHT * 0.018) + (Platform.OS === 'android' ? 8 : 0);
  const FLOATING_HEADER_HEIGHT = isCompactMode ? 115 : isLowEndDevice ? 125 : isSmallPhone ? 135 : isTablet ? 175 : 155;
  const TAB_BAR_PADDING_BOTTOM = tabBarPadding();
  const FLOATING_MARGIN = floatingMargin();

  useEffect(() => {
    loadDoors();
    loadQuota();
    checkAdminStatus();
    loadPendingDevices();
    
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
      loadPendingDevices();
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

  const loadPendingDevices = async () => {
    try {
      const devices = await api.getDiscoveredDevices();
      setPendingDevicesCount(devices.length);
    } catch {
      setPendingDevicesCount(0);
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
      
      // Animate list fade in
      Animated.timing(listFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.fillTertiary }]}>
        <Shield size={isSmallPhone ? 24 : 28} color={colors.textTertiary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontSize: scaleFont(18) }]}>
        No doors
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaleFont(14) }]}>
        You don't have access to any doors yet.{'\n'}
        Contact your administrator.
      </Text>
    </View>
  );

  const renderSkeletonLoader = () => (
    <View style={[styles.skeletonContainer, { paddingHorizontal: rSpacing(24) }]}>
      {[0, 1, 2, 3].map((index) => (
        <DoorCardSkeleton key={index} />
      ))}
    </View>
  );

  const renderItem = ({ item, index }) => (
    <DoorCard
      door={item}
      onPress={handleDoorPress}
      onLongPress={handleDoorLongPress}
      index={index}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* Floating Header */}
        <Animated.View
          style={[
            styles.headerFloating,
            {
              transform: [{ translateY: headerSlideAnim }],
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
          ]}
          pointerEvents="box-none"
        >
          <GlassBackground
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={styles.headerBlur}
          />
          <View style={[styles.header, { paddingTop: HEADER_TOP_PADDING }]}>
            <View style={styles.headerTop}>
              <View>
                <Logo width={isSmallPhone ? 110 : isTablet ? 150 : 130} />
                <Text
                  style={[
                    styles.greeting,
                    {
                      color: colors.textPrimary,
                      fontSize: scaleFont(isSmallPhone ? 26 : 32),
                    },
                  ]}
                >
                  Doors
                </Text>
              </View>
              <View style={styles.headerActions}>
                <AnimatedThemeSwitch size={isSmallPhone ? 'small' : 'medium'} />
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statPill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: scaleFont(13) }]}>
                  {doors.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: scaleFont(13) }]}>
                  {doors.length === 1 ? 'door' : 'doors'}
                </Text>
              </View>
              {quota && (
                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: scaleFont(13) }]}>
                    {quota.used}/{quota.quota}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: scaleFont(13) }]}>
                    quota
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        <View style={[styles.contentWrap, { paddingTop: FLOATING_HEADER_HEIGHT }]}>
          {/* Pending devices banner */}
          {isAdmin && pendingDevicesCount > 0 && (
            <TouchableOpacity
              style={[
                styles.discoveredBanner,
                {
                  backgroundColor: colors.primaryDim,
                  borderColor: colors.primary,
                  marginHorizontal: rSpacing(24),
                },
              ]}
              onPress={() => navigation.navigate('DiscoveredDevices')}
              activeOpacity={0.7}
            >
              <Radio size={isSmallPhone ? 14 : 16} color={colors.primary} strokeWidth={2} />
              <Text
                style={[
                  styles.discoveredBannerText,
                  { color: colors.primary, fontSize: scaleFont(13) },
                ]}
              >
                {pendingDevicesCount} new {pendingDevicesCount === 1 ? 'door' : 'doors'} detected — Tap to review
              </Text>
            </TouchableOpacity>
          )}

          {/* Content */}
          {loading && doors.length === 0 ? (
            renderSkeletonLoader()
          ) : doors.length === 0 ? (
            renderEmptyState()
          ) : (
            <Animated.View style={{ flex: 1, opacity: listFadeAnim }}>
              <FlatList
                data={doors}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[
                  styles.listContent,
                  {
                    paddingHorizontal: rSpacing(24),
                    paddingBottom: TAB_BAR_PADDING_BOTTOM,
                    maxWidth: contentMaxWidth(),
                    alignSelf: isTablet ? 'center' : 'stretch',
                    width: isTablet ? contentMaxWidth() : '100%',
                  },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                    progressBackgroundColor={colors.surface}
                  />
                }
              />
            </Animated.View>
          )}
        </View>
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
  headerFloating: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  contentWrap: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
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
    fontWeight: '700',
  },
  statLabel: {},
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  skeletonContainer: {
    paddingTop: spacing.md,
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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  discoveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  discoveredBannerText: {
    fontWeight: '600',
    flex: 1,
  },
});
