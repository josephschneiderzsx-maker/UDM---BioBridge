import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoorOpen, Plus, History, User } from 'lucide-react-native';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { RootNavigationProvider } from './contexts/RootNavigationContext';
import useResponsive from './hooks/useResponsive';

import LoginScreen from './screens/LoginScreen';
import ServerConfigScreen from './screens/ServerConfigScreen';
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
import WidgetSettingsScreen from './screens/WidgetSettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = (colors) => ({
  headerShown: false,
  cardStyle: { backgroundColor: colors.background },
  gestureEnabled: true,
  gestureDirection: 'horizontal',
});

function DoorsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="DoorList" component={DoorListScreen} />
      <Stack.Screen name="DoorControl" component={DoorControlScreen} />
      <Stack.Screen name="EditDoor" component={EditDoorScreen} />
      <Stack.Screen name="DiscoveredDevices" component={DiscoveredDevicesScreen} />
      <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}

function AddStack() {
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
      <Stack.Screen name="WidgetSettings" component={WidgetSettingsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isSmallPhone, isVerySmallPhone, isTablet, scaleFont, iconSize } = useResponsive();

  // Calculate proper tab bar height based on device and safe area
  const baseTabBarHeight = isVerySmallPhone ? 50 : isSmallPhone ? 54 : isTablet ? 72 : 58;
  
  // Add extra padding for system navigation (gesture or buttons)
  // This ensures the tab bar content doesn't overlap with system UI
  const bottomPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8) // Android: use inset or minimum padding
    : insets.bottom; // iOS: use safe area inset

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: baseTabBarHeight + bottomPadding,
    paddingBottom: bottomPadding,
    paddingTop: isSmallPhone ? 6 : 8,
  };

  const labelFontSize = scaleFont(isVerySmallPhone ? 10 : 11, false);
  const tabIconSize = iconSize(isVerySmallPhone ? 20 : isSmallPhone ? 21 : isTablet ? 26 : 22);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: labelFontSize,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tab.Screen
        name="DoorsTab"
        component={DoorsStack}
        options={{
          title: 'Doors',
          tabBarIcon: ({ color }) => <DoorOpen size={tabIconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="AddTab"
        component={AddStack}
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <Plus size={tabIconSize} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStack}
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <History size={tabIconSize} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <User size={tabIconSize} color={color} strokeWidth={2} />,
        }}
      />
    </Tab.Navigator>
  );
}


function AppNavigator() {
  const { colors, isDark } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const navigationRef = useRef(null);

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'tenant'])
      .then(([tokenPair, tenantPair]) => {
        const hasAuth = tokenPair[1] && tenantPair[1];
        setInitialRoute(hasAuth ? 'MainTabs' : 'Login');
      })
      .catch(() => setInitialRoute('Login'));
  }, []);

  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
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
              border: colors.border,
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
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
      </RootNavigationProvider>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
