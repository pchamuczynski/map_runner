/**
 * Sign in / create account dialog: email + password, or Google.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { renderGoogleButton } from '../services/auth/googleIdentity';
import { useAuth } from '../state/contexts';
import './AuthDialog.css';

const PASSWORD_MIN_LENGTH = 8;

const GoogleButton = ({ mode, onCredential, onError }) => {
  const containerRef = useRef(null);
  const handlerRef = useRef(onCredential);
  handlerRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    renderGoogleButton(containerRef.current, {
      text: mode === 'register' ? 'signup_with' : 'signin_with',
      onCredential: (credential) => handlerRef.current(credential),
    }).catch((error) => !cancelled && onError(error.message));
    return () => {
      cancelled = true;
    };
  }, [mode, onError]);

  return <div ref={containerRef} className="google-button" />;
};

const AuthDialog = ({ onClose }) => {
  const { register, logIn, logInWithGoogle, googleSignInAvailable } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  useEscapeKey(onClose);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister && values.password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
      return;
    }
    run(() => (isRegister ? register(values) : logIn(values)));
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError('');
  };

  const setField = (field) => (e) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  // Portal: opened from the header, whose stacking context would otherwise keep it below the map.
  return createPortal(
    <div className="dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="dialog-header">
          <div>
            <h3 id="auth-title">{isRegister ? 'Create your account' : 'Sign in'}</h3>
            <p className="dialog-subtitle">Keep your routes safe and use them on any device.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {googleSignInAvailable && (
          <>
            <GoogleButton mode={mode} onCredential={(credential) => run(() => logInWithGoogle(credential))} onError={setError} />
            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="auth-name">Name (optional)</label>
              <input id="auth-name" type="text" autoComplete="name" maxLength={60} value={values.name} onChange={setField('name')} />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={values.email}
              onChange={setField('email')}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? PASSWORD_MIN_LENGTH : undefined}
              maxLength={128}
              value={values.password}
              onChange={setField('password')}
              required
            />
            {isRegister && <p className="field-hint">At least {PASSWORD_MIN_LENGTH} characters. A longer passphrase is stronger.</p>}
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to Map Runner?'}{' '}
          <button type="button" className="link-btn" onClick={switchMode}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default AuthDialog;
