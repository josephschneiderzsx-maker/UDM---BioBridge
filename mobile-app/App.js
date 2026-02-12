import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { StatusBar, View, Animated, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServerConfigScreen from './screens/ServerConfigScreen';
import LoginScreen from './screens/LoginScreen';
import DoorListScreen from './screens/DoorListScreen';
import DoorControlScreen from './screens/DoorControlScreen';
import AddDoorScreen from './screens/AddDoorScreen';
import EditDoorScreen from './screens/EditDoorScreen';
import { colors } from './constants/theme';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Stack = createStackNavigator();

function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Line accent animation
    setTimeout(() => {
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }, 300);

    // Subtitle fade
    setTimeout(() => {
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 500);

    // Exit
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const animatedWidth = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

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
        <View style={splashStyles.logoMark}>
          <View style={splashStyles.logoShield}>
            <View style={splashStyles.logoShieldInner} />
          </View>
        </View>

        <Text style={splashStyles.brand}>URZIS</Text>

        <Animated.View
          style={[splashStyles.accentLine, { width: animatedWidth }]}
        />

        <Animated.Text
          style={[splashStyles.product, { opacity: subtitleFade }]}
        >
          PASS
        </Animated.Text>
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
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 170, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 255, 0.15)',
  },
  logoShield: {
    width: 30,
    height: 36,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoShieldInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 8,
    marginBottom: 8,
  },
  accentLine: {
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
    marginBottom: 8,
  },
  product: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 6,
  },
});

function AppNavigator() {
  const { colors, isDark } = useTheme();
  const [initialRoute, setInitialRoute] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      const serverUrl = await AsyncStorage.getItem('serverUrl');
      const token = await AsyncStorage.getItem('token');
      const tenant = await AsyncStorage.getItem('tenant');

      if (!serverUrl) {
        setInitialRoute('ServerConfig');
      } else if (!token || !tenant) {
        setInitialRoute('Login');
      } else {
        setInitialRoute('DoorList');
      }
    } catch (error) {
      setInitialRoute('ServerConfig');
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
      <NavigationContainer
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
          <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="DoorList" component={DoorListScreen} />
          <Stack.Screen
            name="DoorControl"
            component={DoorControlScreen}
            options={{
              ...TransitionPresets.ModalSlideFromBottomIOS,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="AddDoor"
            component={AddDoorScreen}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="EditDoor"
            component={EditDoorScreen}
            options={{
              ...TransitionPresets.SlideFromRightIOS,
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
