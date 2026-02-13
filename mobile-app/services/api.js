import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  constructor() {
    this.baseUrl = null;
    this.token = null;
    this.tenant = null;
  }

  async initialize() {
    this.baseUrl = await AsyncStorage.getItem('serverUrl');
    this.token = await AsyncStorage.getItem('token');
    this.tenant = await AsyncStorage.getItem('tenant');
  }

  async setServerUrl(url) {
    if (!url) {
      this.baseUrl = null;
      await AsyncStorage.removeItem('serverUrl');
      return;
    }

    // Normaliser l'URL : ajouter http:// si manquant
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'http://' + normalizedUrl;
    }
    
    // Retirer le slash final s'il existe
    normalizedUrl = normalizedUrl.replace(/\/$/, '');
    
    this.baseUrl = normalizedUrl;
    await AsyncStorage.setItem('serverUrl', normalizedUrl);
  }

  async setToken(token, tenant) {
    this.token = token;
    this.tenant = tenant;
    
    // AsyncStorage ne peut pas stocker null/undefined
    if (token) {
      await AsyncStorage.setItem('token', token);
    } else {
      await AsyncStorage.removeItem('token');
    }
    
    if (tenant) {
      await AsyncStorage.setItem('tenant', tenant);
    } else {
      await AsyncStorage.removeItem('tenant');
    }
  }

  async clearAuth() {
    this.token = null;
    this.tenant = null;
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('tenant');
  }

  _licenseExpiredMessage() {
    return 'Your license has expired. You will not be able to use the service within 3 days. Please contact URZIS for renewal or suspension: sales@urzis.com. If you think this is a mistake, we are sorry; contact us for arrangement.';
  }

  async _throwIfNotOk(response, defaultMessage) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      await this.clearAuth();
      throw new Error('Session expired');
    }
    if (response.status === 403 && body.error === 'license_expired') {
      await this.clearAuth();
      const msg = body.message || this._licenseExpiredMessage();
      const err = new Error(msg);
      err.isLicenseExpired = true;
      throw err;
    }
    throw new Error(body.error || body.message || defaultMessage);
  }

  async login(email, password, tenant) {
    await this.initialize();
    if (!this.baseUrl) {
      throw new Error('Server URL not configured');
    }

    const url = `${this.baseUrl}/${tenant}/auth/login`;
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      throw new Error(`Network error: ${error.message}`);
    }

    if (!response.ok) {
      let errorMessage = 'Login failed';
      let responseText;
      try {
        responseText = await response.text();
        if (responseText) {
          try {
            const error = JSON.parse(responseText);
            if (response.status === 403 && error.error === 'license_expired') {
              errorMessage = error.message || error.error || 'License expired. Please contact sales@urzis.com.';
              const err = new Error(errorMessage);
              err.isLicenseExpired = true;
              throw err;
            }
            errorMessage = error.error || error.message || errorMessage;
          } catch (e) {
            if (e.isLicenseExpired) throw e;
            errorMessage = responseText.length > 100 ? responseText.substring(0, 100) + '...' : responseText;
          }
        } else {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
      } catch (e) {
        if (e.isLicenseExpired) throw e;
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    let data;
    let responseText;
    try {
      responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      data = JSON.parse(responseText);
    } catch (error) {
      // Si le parsing JSON échoue, afficher la réponse brute pour debug
      console.error('Response text:', responseText);
      throw new Error(`Invalid response from server: ${error.message}`);
    }
    
    // Vérifier que le token est présent dans la réponse
    if (!data || !data.token) {
      console.error('Server response:', data);
      throw new Error(`No token received from server. Response: ${JSON.stringify(data)}`);
    }
    
    await this.setToken(data.token, tenant);
    return data.token;
  }

  async getDoors() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to fetch doors');
    }
    const data = await response.json();
    return data.doors || [];
  }

  async openDoor(doorId, delay = 3000) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors/${doorId}/open`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ delay }),
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to open door');
    }

    const data = await response.json();
    return data;
  }

  async closeDoor(doorId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors/${doorId}/close`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to close door');
    }

    const data = await response.json();
    return data;
  }

  async getDoorStatus(doorId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors/${doorId}/status`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get door status');
    }

    const data = await response.json();
    return data;
  }

  async getQuota() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/quota`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get quota');
    }

    const data = await response.json();
    return data;
  }

  async getUsersQuota() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }
    const url = `${this.baseUrl}/${this.tenant}/users-quota`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get users quota');
    }
    const data = await response.json();
    return data;
  }

  async getLicenseStatus() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }
    const url = `${this.baseUrl}/${this.tenant}/license-status`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get license status');
    }
    const data = await response.json();
    return data;
  }

  async createDoor(doorData) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doorData),
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to create door');
    }

    const data = await response.json();
    return data;
  }

  async updateDoor(doorId, doorData) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors/${doorId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(doorData),
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to update door');
    }

    const data = await response.json();
    return data;
  }

  async deleteDoor(doorId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/doors/${doorId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to delete door');
    }

    const data = await response.json();
    return data;
  }

  async getCommandResult(commandId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/commands/${commandId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get command result');
    }

    return await response.json();
  }

  // ===== User Profile =====
  async getProfile() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/me`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get profile');
    }
    return await response.json();
  }

  async updateProfile(firstName, lastName) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/me`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to update profile');
    }
    return await response.json();
  }

  async changePassword(currentPassword, newPassword) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/me/password`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to change password');
    }
    return await response.json();
  }

  // ===== User Management (Admin) =====
  async getUsers() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get users');
    }
    const data = await response.json();
    return data.users || [];
  }

  async createUser(userData) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to create user');
    }
    return await response.json();
  }

  async updateUser(userId, userData) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/${userId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to update user');
    }
    return await response.json();
  }

  async deleteUser(userId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/${userId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to delete user');
    }
    return await response.json();
  }

  async getUserPermissions(userId) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/${userId}/permissions`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get permissions');
    }
    const data = await response.json();
    return data.permissions || [];
  }

  async setUserPermissions(userId, permissions) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/users/${userId}/permissions`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to set permissions');
    }
    return await response.json();
  }

  // ===== Events =====
  async getEvents(doorId = null, limit = 50) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    let url = `${this.baseUrl}/${this.tenant}/events?limit=${limit}`;
    if (doorId) url += `&door_id=${doorId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get events');
    }
    const data = await response.json();
    return data.events || [];
  }

  // ===== Notifications =====
  async getNotificationPreferences() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/notifications`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get notification preferences');
    }
    const data = await response.json();
    return data.preferences || [];
  }

  async setNotificationPreference(doorId, notifyOnOpen, notifyOnClose, notifyOnForced) {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) throw new Error('Not authenticated');
    const url = `${this.baseUrl}/${this.tenant}/notifications`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ door_id: doorId, notify_on_open: notifyOnOpen, notify_on_close: notifyOnClose, notify_on_forced: notifyOnForced }),
    });
    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to update notification preferences');
    }
    return await response.json();
  }

  async getAgents() {
    await this.initialize();
    if (!this.baseUrl || !this.token || !this.tenant) {
      throw new Error('Not authenticated');
    }

    const url = `${this.baseUrl}/${this.tenant}/agents`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      await this._throwIfNotOk(response, 'Failed to get agents');
    }

    const data = await response.json();
    return data.agents || [];
  }
}

export default new ApiService();
