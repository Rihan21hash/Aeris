import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFriendlyAuthErrorMessage } from '../utils/firebaseErrors';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AerisLogo } from '../components/Common/AerisLogo';

export const Login: React.FC = () => {
  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address to receive a password reset link.');
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: 'calc(100vh - 120px)' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--color-border)',
          padding: '38px 34px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Brand header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center gap-2 mb-2">
            <AerisLogo size={36} />
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.08em' }}>
              AERIS
            </span>
          </div>
          <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Sign In to AERIS
          </h4>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Access saved locations and customized alerts
          </span>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 mb-3" style={{ fontSize: '0.85rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {resetSent && (
          <div className="alert alert-success p-2 mb-3" style={{ fontSize: '0.85rem' }}>
            Password reset link sent to your email.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="name@example.com"
            />
          </div>

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">
                Password
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="btn btn-link p-0 text-decoration-none"
                style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}
              >
                Forgot password?
              </button>
            </div>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-100 mb-3"
            style={{
              padding: '10px',
              fontSize: '0.95rem',
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="position-relative text-center my-3">
          <hr style={{ borderColor: 'var(--color-border)' }} />
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#FFFFFF',
              padding: '0 12px',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
            }}
          >
            OR
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-4"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: '#FFFFFF',
            color: 'var(--color-text-primary)',
            fontSize: '0.92rem',
            fontWeight: 600,
            padding: '10px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="text-center" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <NavLink to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}>
            Create one
          </NavLink>
        </div>
      </div>
    </div>
  );
};
