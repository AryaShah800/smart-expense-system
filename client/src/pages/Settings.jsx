import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import '../styles/settings.css';

const Settings = () => {
  const { user, login, logout } = useAuth(); // 'login' function updates context/localStorage
  const navigate = useNavigate();

  // 1. Setup state with user's current data
  const [formData, setFormData] = useState({
    username: user?.username || '',
    currency: user?.currency || 'INR',
    theme: user?.theme || 'light',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 2. Handle input changes
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 3. Save profile to backend
  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      // Send the updated data to the backend
      const res = await api.put('/users/profile', formData);

      // Update global context & localStorage with the new user data
      // We merge the existing user object with the new data from backend
      login({ ...user, ...res.data });

      setMessage('Settings saved successfully!');
    } catch (error) {
      console.error(error);
      setMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/users/logout');
      logout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Settings</h2>
      </div>

      {message && <div className={`settings-message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}

      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-card">
          <div className="settings-item">
            <span className="settings-label">Username</span>
            <input
              type="text"
              name="username"
              className="settings-input"
              value={formData.username}
              onChange={handleChange}
            />
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
            <span className="settings-label">Default Currency</span>
            <select
              name="currency"
              className="settings-select"
              value={formData.currency}
              onChange={handleChange}
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>
          <div className="settings-item">
            <span className="settings-label">Theme</span>
            <select
              name="theme"
              className="settings-select"
              value={formData.theme}
              onChange={handleChange}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-save-section">
        <button
          className="save-button-large"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
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