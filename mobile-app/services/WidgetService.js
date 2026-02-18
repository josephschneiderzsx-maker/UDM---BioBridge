/**
 * Widget Data Service
 * Manages data sharing between the main app and home screen widgets
 * Uses AsyncStorage with shared app group for iOS and SharedPreferences for Android
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../services/api';

const WIDGET_KEYS = {
  PRIMARY_DOOR: 'widget_primary_door',
  USER_TOKEN: 'widget_user_token',
  TENANT: 'widget_tenant',
  LAST_SYNC: 'widget_last_sync',
  WIDGET_ENABLED: 'widget_enabled',
};

/**
 * Widget Service for managing quick unlock functionality
 */
class WidgetService {
  /**
   * Set the primary door for widget quick unlock
   * @param {Object} door - Door object with id, name, terminal_ip
   */
  async setPrimaryDoor(door) {
    if (!door) {
      await AsyncStorage.removeItem(WIDGET_KEYS.PRIMARY_DOOR);
      return;
    }
    
    const doorData = {
      id: door.id,
      name: door.name,
      terminal_ip: door.terminal_ip,
      default_delay: door.default_delay || 3000,
    };
    
    await AsyncStorage.setItem(WIDGET_KEYS.PRIMARY_DOOR, JSON.stringify(doorData));
    await this.syncWidgetData();
  }

  /**
   * Get the primary door for widget
   */
  async getPrimaryDoor() {
    try {
      const data = await AsyncStorage.getItem(WIDGET_KEYS.PRIMARY_DOOR);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Sync authentication data for widget use
   */
  async syncWidgetData() {
    try {
      const token = await AsyncStorage.getItem('token');
      const tenant = await AsyncStorage.getItem('tenant');
      
      if (token && tenant) {
        await AsyncStorage.setItem(WIDGET_KEYS.USER_TOKEN, token);
        await AsyncStorage.setItem(WIDGET_KEYS.TENANT, tenant);
        await AsyncStorage.setItem(WIDGET_KEYS.LAST_SYNC, new Date().toISOString());
      }
    } catch (error) {
      console.warn('Failed to sync widget data:', error);
    }
  }

  /**
   * Check if widget is enabled and configured
   */
  async isWidgetReady() {
    const primaryDoor = await this.getPrimaryDoor();
    const token = await AsyncStorage.getItem(WIDGET_KEYS.USER_TOKEN);
    return !!(primaryDoor && token);
  }

  /**
   * Enable or disable widget
   */
  async setWidgetEnabled(enabled) {
    await AsyncStorage.setItem(WIDGET_KEYS.WIDGET_ENABLED, JSON.stringify(enabled));
  }

  /**
   * Check if widget is enabled
   */
  async isWidgetEnabled() {
    const value = await AsyncStorage.getItem(WIDGET_KEYS.WIDGET_ENABLED);
    return value ? JSON.parse(value) : false;
  }

  /**
   * Perform biometric authentication for widget unlock
   * @returns {boolean} - True if authenticated
   */
  async authenticateForWidget() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock door',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Quick unlock from widget - requires biometric auth
   * @returns {Object} - { success: boolean, message: string }
   */
  async quickUnlock() {
    try {
      // 1. Biometric authentication first
      const authenticated = await this.authenticateForWidget();
      if (!authenticated) {
        return { success: false, message: 'Authentication required' };
      }

      // 2. Get primary door
      const door = await this.getPrimaryDoor();
      if (!door) {
        return { success: false, message: 'No primary door configured' };
      }

      // 3. Open the door
      await api.openDoor(door.id, door.default_delay || 3000);
      
      return { success: true, message: `${door.name} unlocked` };
    } catch (error) {
      return { success: false, message: error.message || 'Unlock failed' };
    }
  }

  /**
   * Clear all widget data (on logout)
   */
  async clearWidgetData() {
    await Promise.all([
      AsyncStorage.removeItem(WIDGET_KEYS.PRIMARY_DOOR),
      AsyncStorage.removeItem(WIDGET_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(WIDGET_KEYS.TENANT),
      AsyncStorage.removeItem(WIDGET_KEYS.LAST_SYNC),
      AsyncStorage.removeItem(WIDGET_KEYS.WIDGET_ENABLED),
    ]);
  }
}

export default new WidgetService();
