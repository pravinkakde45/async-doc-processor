import React from 'react';
import { Search, Bell, HelpCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './Topbar.css';

interface TopbarProps {
  title?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        {title && <div className="page-title">{title}</div>}
      </div>
      
      <div className="topbar-right">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search archive..." />
        </div>
        
        <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="icon-btn">
          <Bell size={20} />
        </button>
        <button className="icon-btn">
          <HelpCircle size={20} />
        </button>
        
        <div className="user-avatar" title={user?.name || ''}>
          <div className="avatar-circle">
            <span className="avatar-text">{user?.initials || 'U'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
