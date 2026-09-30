import { useState } from 'react';
import { useAuth } from '../state/contexts';
import AuthDialog from './AuthDialog';
import './AccountMenu.css';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

/** Header area: "Sign in" for guests, the account and "Log out" for signed-in users. */
const AccountMenu = () => {
  const { user, status, accountsAvailable, logOut } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');

  if (!accountsAvailable || status !== 'ready') return null;

  if (user.isGuest) {
    return (
      <>
        <button type="button" className="btn btn-primary account-sign-in" onClick={() => setDialogOpen(true)}>
          Sign in
        </button>
        {dialogOpen && <AuthDialog onClose={() => setDialogOpen(false)} />}
      </>
    );
  }

  const handleLogOut = async () => {
    setError('');
    try {
      await logOut();
    } catch {
      setError('Could not sign out. Check your connection.');
    }
  };

  return (
    <div className="account-menu">
      {user.avatarUrl ? (
        <img className="account-avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" width={32} height={32} />
      ) : (
        <span className="account-avatar account-initials" aria-hidden="true">
          {initials(user.name) || '?'}
        </span>
      )}
      <span className="account-name" title={user.email}>
        {user.name}
      </span>
      <button type="button" className="btn btn-secondary account-log-out" onClick={handleLogOut}>
        Log out
      </button>
      {error && (
        <span className="account-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default AccountMenu;
