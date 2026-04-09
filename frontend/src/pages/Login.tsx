import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);

  const [isLogin, setIsLogin] = React.useState(true);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState(isLogin ? "demo@company.com" : "");
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(name, email);
    if (!isLogin) {
      alert("Registration successful! Proceeding to Dashboard...");
    }
    navigate('/');
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="logo-icon bg-primary">
          <FileText color="white" size={24} />
        </div>
        <h1>DocFlow System</h1>
        <p>Efficient document management for modern teams.</p>
      </div>

      <div className="login-card glass">
        <div className="tabs">
          <button 
            type="button"
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setEmail('demo@company.com'); }}
          >
            Login
          </button>
          <button 
            type="button"
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setEmail(''); }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label>FULL NAME</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <div className="input-wrapper">
              <span className="input-icon">✉</span>
              <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="flex justify-between w-full">
              PASSWORD
              {isLogin && <a href="#" className="forgot-link">Forgot?</a>}
            </label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input 
                type={showPassword ? "text" : "password"} 
                defaultValue={isLogin ? "password123" : ""} 
                required 
              />
              <button 
                type="button" 
                className="toggle-password" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary login-btn">
            {isLogin ? "Sign In →" : "Register →"}
          </button>
        </form>

        <div className="divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <div className="social-logins">
          <button type="button" className="btn-outline social-btn">
            Google
          </button>
          <button type="button" className="btn-outline social-btn">
            Apple
          </button>
        </div>
      </div>

      <div className="login-footer">
        <a href="#">Privacy Policy</a>
        <span className="dot">•</span>
        <a href="#">Contact Support</a>
      </div>
    </div>
  );
};
