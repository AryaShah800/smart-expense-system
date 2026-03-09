import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/settings.css';

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState('Light');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from user object on mount
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setCurrency(user.currency || 'INR');
      setTheme(user.theme || 'Light');
    }
  }, [user]);

  const handleSaveSettings = async () => {
    if (!username.trim()) {
      setSaveMessage('Username cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      // Call backend API to update profile
      const response = await api.put('/users/profile', {
        username: username.trim(),
        currency,
        theme
      });

      // Update the AuthContext with the new user data
      updateUser(response.data);

      // Update localStorage for immediate UI feedback
      localStorage.setItem('preferredCurrency', currency);
      localStorage.setItem('preferredTheme', theme);

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage(error.response?.data?.message || 'Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout(); // Clears localStorage and context
    navigate('/login'); // Redirects to login page
  };

  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
  const themes = ['Light', 'Dark', 'Auto'];

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="settings-input"
                placeholder="Enter username"
              />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Email</span>
              <span className="settings-value">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Preferences</h3>
        <div className="settings-card">
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Default Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="settings-select"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-label">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="settings-select"
              >
                {themes.map((thm) => (
                  <option key={thm} value={thm}>{thm}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`settings-message ${saveMessage.includes('success') ? 'success' : 'error'}`}>
          {saveMessage}
        </div>
      )}

      <div className="settings-button-group">
        <button 
          className="save-button" 
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="settings-footer">
        <button className="logout-button-large" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
};

export default Settings;