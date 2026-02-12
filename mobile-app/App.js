import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { StatusBar, View, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServerConfigScreen from './screens/ServerConfigScreen';
import LoginScreen from './screens/LoginScreen';
import DoorListScreen from './screens/DoorListScreen';
import DoorControlScreen from './screens/DoorControlScreen';
import AddDoorScreen from './screens/AddDoorScreen';
import { colors } from './constants/theme';

const Stack = createStackNavigator();

// Premium splash screen
function SplashScreen({ onFinish }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View
        style={[
          splashStyles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={splashStyles.logo}>
          <View style={splashStyles.logoInner} />
        </View>
        <Animated.Text style={[splashStyles.title, { opacity: fadeAnim }]}>
          UDM
        </Animated.Text>
        <Animated.Text style={[splashStyles.subtitle, { opacity: fadeAnim }]}>
          URZIS DOOR MONITORING
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 32,
    height: 42,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default function App() {
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer
        theme={{
          dark: true,
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
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
