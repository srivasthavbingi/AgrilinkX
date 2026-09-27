import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SproutIcon, ArrowRightIcon } from '../components/Icons';
import './Login.css';

export default function Login() {
  const { signIn, sendConfirmationEmailAgain } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [emailSendInfo, setEmailSendInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    try {
      setError(null);
      setEmailSendInfo(null);
      setLoading(true);
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSendConfirmationAgain = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      setSendingEmail(true);
      setError(null);
      const res = await sendConfirmationEmailAgain(email);
      setEmailSendInfo(res.message);
    } catch (err) {
      setError(err.message || 'Failed to send confirmation email again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const fillDemo = (demoEmail) => {
    if (loading) return;
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="login-page-container">
      <div className="login-bg-glow"></div>
      <div className="login-content-card card">
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <SproutIcon size={28} color="#ffffff" />
          </div>
          <h1 className="login-brand-title">
            AgriLink<span>X</span>
          </h1>
          <p className="login-brand-subtitle">
            Secure Authentication
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            <div>{error}</div>
            {error.includes('confirm your email') && (
              <button
                type="button"
                onClick={handleSendConfirmationAgain}
                disabled={sendingEmail}
                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#059669', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {sendingEmail ? 'Sending...' : 'Send confirmation email again'}
              </button>
            )}
          </div>
        )}

        {emailSendInfo && (
          <div className="alert alert-success" style={{ marginBottom: '1rem', color: '#047857', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {emailSendInfo}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              disabled={loading}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              disabled={loading}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              required 
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            <span>{loading ? 'Logging in...' : 'Sign In'}</span>
            {!loading && <ArrowRightIcon size={18} />}
          </button>
        </form>

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          Don't have an account? <Link to="/register" style={{ color: '#059669', fontWeight: 'bold' }}>Register here</Link>
        </div>

        {/* Demo Data Fill */}
        <div className="demo-access-panel" style={{ marginTop: '2rem' }}>
          <div className="demo-header" style={{ fontSize: '0.8rem', opacity: 0.7, textAlign: 'center', marginBottom: '0.5rem' }}>
            TEST ACCOUNTS
          </div>
          <div className="demo-buttons-grid" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={loading}
              className="btn btn-outline btn-sm demo-btn"
              onClick={() => fillDemo('farmer@example.com')}
            >
              <span>👨‍🌾 Demo Farmer</span>
            </button>
            <button
              type="button"
              disabled={loading}
              className="btn btn-outline btn-sm demo-btn"
              onClick={() => fillDemo('family@example.com')}
            >
              <span>🏠 Demo Family</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
