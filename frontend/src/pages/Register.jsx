import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SproutIcon, ArrowRightIcon } from '../components/Icons';
import './Login.css'; // Reuse login styles

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState('family');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Farmer fields
  const [farmName, setFarmName] = useState('');
  const [village, setVillage] = useState('');
  
  // Family fields
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    try {
      setError(null);
      setLoading(true);
      
      const additionalData = {
        full_name: fullName,
        phone: phone,
      };
      
      if (role === 'farmer') {
        additionalData.farm_name = farmName;
        additionalData.village = village;
        // Geolocation for demo
        additionalData.latitude = 17.4210;
        additionalData.longitude = 78.4420;
      } else {
        additionalData.delivery_address = deliveryAddress;
        // Geolocation for demo
        additionalData.latitude = 17.404;
        additionalData.longitude = 78.456;
      }
      
      const { isUnconfirmed } = await signUp(email, password, role, additionalData);
      setRegisteredEmail(email);

      if (isUnconfirmed) {
        setConfirmationPending(true);
      } else {
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (confirmationPending) {
    return (
      <div className="login-page-container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
        <div className="login-bg-glow"></div>
        <div className="login-content-card card" style={{ maxWidth: '540px', padding: '2.5rem', textAlign: 'center' }}>
          <div className="login-brand-header">
            <div className="login-logo-circle" style={{ backgroundColor: '#059669', margin: '0 auto 1rem auto' }}>
              <SproutIcon size={28} color="#ffffff" />
            </div>
            <h1 className="login-brand-title">
              AgriLink<span>X</span>
            </h1>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '1.25rem', borderRadius: '12px', margin: '1.5rem 0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold' }}>Registration Successful! 📧</h3>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500' }}>
              Please check your email to confirm your AgriLinkX account.
            </p>
          </div>

          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            We sent a confirmation link to <strong style={{ color: '#0f172a' }}>{registeredEmail}</strong>. Click the link in the email to confirm your address and then sign in.
          </p>

          <Link to="/login" className="btn btn-primary btn-lg w-full" style={{ justifyContent: 'center' }}>
            <span>Proceed to Sign In</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container" style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div className="login-bg-glow"></div>
      <div className="login-content-card card" style={{ maxWidth: '600px' }}>
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <SproutIcon size={28} color="#ffffff" />
          </div>
          <h1 className="login-brand-title">
            AgriLink<span>X</span>
          </h1>
          <p className="login-brand-subtitle">
            Create an Account
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem', color: '#dc2626', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="login-role-selector" style={{ marginBottom: '2rem' }}>
          <button
            type="button"
            disabled={loading}
            className={`role-btn ${role === 'family' ? 'active' : ''}`}
            onClick={() => setRole('family')}
          >
            Family (Buyer)
          </button>
          <button
            type="button"
            disabled={loading}
            className={`role-btn ${role === 'farmer' ? 'active' : ''}`}
            onClick={() => setRole('farmer')}
          >
            Farmer / FPO
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                disabled={loading}
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                disabled={loading}
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                required 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              disabled={loading}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              disabled={loading}
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              minLength="6"
            />
          </div>

          {role === 'farmer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <div className="form-group">
                <label>Farm Name</label>
                <input 
                  type="text" 
                  disabled={loading}
                  value={farmName} 
                  onChange={(e) => setFarmName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Location / Village</label>
                <input 
                  type="text" 
                  disabled={loading}
                  value={village} 
                  onChange={(e) => setVillage(e.target.value)} 
                  required 
                />
              </div>
            </div>
          )}

          {role === 'family' && (
            <div className="form-group" style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <label>Delivery Address</label>
              <textarea 
                disabled={loading}
                value={deliveryAddress} 
                onChange={(e) => setDeliveryAddress(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                rows="2"
              />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full" style={{ marginTop: '2rem' }}>
            <span>{loading ? 'Registering...' : 'Complete Registration'}</span>
            {!loading && <ArrowRightIcon size={18} />}
          </button>
        </form>

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          Already have an account? <Link to="/login" style={{ color: '#059669', fontWeight: 'bold' }}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
