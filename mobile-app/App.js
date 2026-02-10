import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServerConfigScreen from './screens/ServerConfigScreen';
import LoginScreen from './screens/LoginScreen';
import DoorListScreen from './screens/DoorListScreen';
import DoorControlScreen from './screens/DoorControlScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Error checking initial state:', error);
      setInitialRoute('ServerConfig');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !initialRoute) {
    return null; // Ou un écran de chargement
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="ServerConfig" 
          component={ServerConfigScreen}
          options={{ title: 'Configuration Serveur' }}
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Connexion' }}
        />
        <Stack.Screen 
          name="DoorList" 
          component={DoorListScreen}
          options={{ title: 'Portes', headerLeft: null }}
        />
        <Stack.Screen 
          name="DoorControl" 
          component={DoorControlScreen}
          options={{ title: 'Contrôle Porte' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
