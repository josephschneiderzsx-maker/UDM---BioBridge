import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Animated, StyleSheet, Image } from 'react-native';
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
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
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
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish());
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
        <Logo width={280} variant="white" />
      </Animated.View>

      <Animated.View style={[splashStyles.footer, { opacity: fadeAnim }]}>
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
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.separator,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="StatusTab"
        component={StatusStack}
        options={{
          title: 'Doors',
          tabBarIcon: ({ color, size }) => (
            <DoorOpen size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="AddDoorTab"
        component={AddDoorStack}
        options={{
          title: 'Add new door',
          tabBarIcon: ({ color, size }) => (
            <Plus size={size || 22} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStack}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <History size={size || 22} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <User size={size || 22} color={color} strokeWidth={2} />
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
