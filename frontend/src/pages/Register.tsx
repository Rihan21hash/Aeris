import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export const Register: React.FC = () => {
  const { signUpWithEmail, signInWithGoogle, isFirebaseReady } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(name, email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
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
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
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
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E5E8',
          padding: '36px 32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center gap-2 mb-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#285B50" strokeWidth="2.5" />
              <path d="M10 16C12 12 16 12 18 16C20 20 24 20 26 16" stroke="#285B50" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#285B50', letterSpacing: '0.08em' }}>
              AERIS
            </span>
          </div>
          <h4 style={{ fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
            Create an AERIS Account
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#687078' }}>
            Monitor air quality intelligence across the world
          </span>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 p-2 mb-3" style={{ fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              placeholder="Jane Doe"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="name@example.com"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
              Password (min. 8 characters)
            </label>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.9rem', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#687078',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#202124' }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFirebaseReady}
            className="btn w-100 mb-3"
            style={{
              backgroundColor: '#285B50',
              color: '#FFFFFF',
              fontWeight: 600,
              padding: '10px',
              fontSize: '0.9rem',
            }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="position-relative text-center my-3">
          <hr style={{ borderColor: '#E2E5E8' }} />
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#FFFFFF',
              padding: '0 10px',
              fontSize: '0.75rem',
              color: '#687078',
            }}
          >
            OR
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading || !isFirebaseReady}
          className="btn w-100 d-flex align-items-center justify-content-center gap-2 mb-4"
          style={{
            border: '1px solid #E2E5E8',
            backgroundColor: '#FFFFFF',
            color: '#202124',
            fontSize: '0.9rem',
            fontWeight: 500,
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

        <div className="text-center" style={{ fontSize: '0.85rem', color: '#687078' }}>
          Already have an account?{' '}
          <NavLink to="/login" style={{ color: '#285B50', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </NavLink>
        </div>
      </div>
    </div>
  );
};

