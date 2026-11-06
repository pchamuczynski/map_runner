import { useEffect } from 'react';
import Brand from '../components/Brand';
import './PrivacyPage.css';

/**
 * Public privacy policy at /privacy. Data is kept only to show route progress.
 */
const PrivacyPage = () => {
  useEffect(() => {
    document.title = 'Privacy policy — Treklin';
    return () => {
      document.title = 'Treklin';
    };
  }, []);

  return (
    <main className="privacy-page">
      <a className="privacy-home" href="/" aria-label="Treklin">
        <Brand />
      </a>
      <h1>Privacy policy</h1>
      <p>This policy describes how Treklin (treklin.com) handles your data. It was last updated on 6 November 2026.</p>
      <p>
        We use your data only to track your progress along the routes you create. We do not use it for advertising or for any other purpose. We do not
        provide your data to any third party.
      </p>

      <h2>What we store</h2>
      <p>When you use Treklin we store:</p>
      <ul>
        <li>Your account: name, email, and a password that we keep only as a hash. If you sign in with Google, we store the identity Google confirms.</li>
        <li>The routes you create, and the workouts you add or import: date, activity, distance, and duration.</li>
        <li>
          If you connect Strava or Garmin, the permission needed to read the workouts you choose to import. We keep that connection only so those
          workouts can count toward your routes.
        </li>
      </ul>

      <h2>What we do with it</h2>
      <p>We use this information to show how far you have come on each route. That is the only use.</p>
      <p>
        We do not sell your data, and we do not provide it to any third party. Strava, Garmin, and Google are involved only when you choose to sign in
        or import. We receive the identity or the workouts you allow. We do not send your routes or workouts to those services, and we do not let them
        use your Treklin data.
      </p>
      <p>
        Drawing a route sends the place names you type to the map service that calculates the path. That request does not include your account or your
        workouts.
      </p>

      <h2>How long we keep it</h2>
      <p>We keep your account, routes, and workouts for as long as your account exists, and only so we can keep showing your progress.</p>
    </main>
  );
};

export default PrivacyPage;
