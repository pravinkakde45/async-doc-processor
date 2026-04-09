import React, { useEffect } from 'react';
import { useTopBarContext } from '../context/TopBarContext';
import { useTheme } from '../context/ThemeContext';
import { Save } from 'lucide-react';
import './Settings.css';

export const Settings: React.FC = () => {
  const { setTopbarTitle } = useTopBarContext();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setTopbarTitle(
      <>
        <span>Account</span> {'>'} Settings
      </>
    );
  }, [setTopbarTitle]);

  return (
    <div className="settings-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted text-sm mt-1">Manage your application preferences and account settings.</p>
        </div>
        <button className="btn-primary" onClick={() => alert("Settings saved!")}>
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="card settings-card">
        <div className="settings-group">
          <h3>Appearance</h3>
          <div className="setting-item">
            <div className="setting-info">
              <h4>Dark Mode</h4>
              <p>Toggle between light and dark themes for the application.</p>
            </div>
            <div>
              <button className="btn-outline" onClick={toggleTheme}>
                {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h3>Notifications</h3>
          <div className="setting-item">
            <div className="setting-info">
              <h4>Email Notifications</h4>
              <p>Receive email updates when documents finish processing.</p>
            </div>
            <div>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
