import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Animated, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import GlassBackground from './components/GlassBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DoorOpen, Plus, User, History } from 'lucide-react-native';
import Logo from './components/Logo';
import { RootNavigationProvider } from './contexts/RootNavigationContext';
import LoginScreen from './screens/LoginScreen';
import DoorListScreen from './screens/DoorListScreen';
import DoorControlScreen from './screens/DoorControlScreen';
import AddDoorScreen from './screens/AddDoorScreen';
import DiscoveredDevicesScreen from './screens/DiscoveredDevicesScreen';
import EditDoorScreen from './screens/EditDoorScreen';
import AccountScreen from './screens/AccountScreen';
import UsersListScreen from './screens/UsersListScreen';
import CreateUserScreen from './screens/CreateUserScreen';
import UserPermissionsScreen from './screens/UserPermissionsScreen';
import ActivityLogScreen from './screens/ActivityLogScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import useResponsive from './hooks/useResponsive';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(logoFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onFinish());
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View
        style={[
          splashStyles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Logo width={Math.min(SCREEN_WIDTH * 0.65, 280)} variant="white" />
      </Animated.View>

      <Animated.View style={[splashStyles.footer, { opacity: logoFadeAnim }]}>
        <Image
          source={require('./assets/urzis-logo.png')}
          style={splashStyles.footerLogo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  footerLogo: {
    width: 120,
    height: 40,
    opacity: 0.8,
  },
});

const stackScreenOptions = (colors) => ({
  headerShown: false,
  cardStyle: { backgroundColor: colors.background },
  gestureEnabled: true,
  ...TransitionPresets.SlideFromRightIOS,
});

function StatusStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="DoorList" component={DoorListScreen} />
      <Stack.Screen
        name="DoorControl"
        component={DoorControlScreen}
        options={{
          ...TransitionPresets.ModalSlideFromBottomIOS,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="EditDoor" component={EditDoorScreen} />
      <Stack.Screen name="DiscoveredDevices" component={DiscoveredDevicesScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}

function AddDoorStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="AddDoor" component={AddDoorScreen} />
    </Stack.Navigator>
  );
}

function HistoryStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
    </Stack.Navigator>
  );
}

function AccountStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="UsersList" component={UsersListScreen} />
      <Stack.Screen name="CreateUser" component={CreateUserScreen} />
      <Stack.Screen name="UserPermissions" component={UserPermissionsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const { isSmallPhone, isTablet, scaleFont } = useResponsive();

  // Responsive tab bar dimensions
  const tabBarHeight = isSmallPhone ? 58 : isTablet ? 72 : 64;
  const tabBarMargin = isSmallPhone ? 16 : 20;
  const tabBarBottom = Platform.OS === 'ios' ? (isSmallPhone ? 24 : 28) : (isSmallPhone ? 12 : 16);
  const iconSize = isSmallPhone ? 20 : isTablet ? 26 : 22;
  const labelSize = isSmallPhone ? 10 : isTablet ? 14 : 12;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: tabBarMargin,
          right: tabBarMargin,
          bottom: tabBarBottom,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.15,
          shadowRadius: 12,
          elevation: 8,
          backgroundColor: 'transparent',
          height: tabBarHeight,
        },
        tabBarBackground: () => (
          <GlassBackground
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="StatusTab"
        component={StatusStack}
        options={{
          title: 'Doors',
          tabBarIcon: ({ color, focused }) => (
            <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <DoorOpen size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />
            </Animated.View>
          ),
        }}
      />
      <Tab.Screen
        name="AddDoorTab"
        component={AddDoorStack}
        options={{
          title: 'Add',
          tabBarIcon: ({ color, focused }) => (
            <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <Plus size={iconSize} color={color} strokeWidth={focused ? 3 : 2.5} />
            </Animated.View>
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStack}
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <History size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />
            </Animated.View>
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Animated.View style={{ transform: [{ scale: focused ? 1.1 : 1 }] }}>
              <User size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />
            </Animated.View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const navigationRef = useRef(null);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const tenant = await AsyncStorage.getItem('tenant');

      if (!token || !tenant) {
        setInitialRoute('Login');
      } else {
        setInitialRoute('MainTabs');
      }
    } catch (error) {
      setInitialRoute('Login');
    }
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={Platform.OS === 'android'}
      />
      <RootNavigationProvider refValue={navigationRef}>
        <NavigationContainer
          ref={navigationRef}
          theme={{
            dark: isDark,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.textPrimary,
              border: colors.separator,
              notification: colors.primary,
            },
          }}
        >
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.background },
              gestureEnabled: true,
              ...TransitionPresets.SlideFromRightIOS,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </RootNavigationProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
