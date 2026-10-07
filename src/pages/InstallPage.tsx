import { Link } from 'react-router-dom';
import { InstallGuide } from '../components/InstallGuide';
import { NotificationsCard } from '../components/NotificationsCard';
import { isStandalone } from '../lib/pwa';

export function InstallPage() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Install iStree</h1>
        <p>Keep iStree on your home screen for a full-screen app, offline access and reminders.</p>
      </header>
      <div className="card">
        <InstallGuide />
      </div>
      {isStandalone() && <NotificationsCard />}
      <Link to="/" className="btn btn--ghost">Back to today</Link>
    </div>
  );
}
