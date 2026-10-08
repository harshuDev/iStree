import { Link } from 'react-router-dom';
import { InstallGuide } from '../components/InstallGuide';
import { NotificationsCard } from '../components/NotificationsCard';
import { isStandalone } from '../lib/pwa';
import { TopBar } from '../components/ui';

export function InstallPage() {
  return (
    <div className="page">
      <TopBar title="Install iStree" />
      <p className="center small muted">Keep iStree on your home screen for a full-screen app, offline access and reminders.</p>
      <div className="card">
        <InstallGuide />
      </div>
      {isStandalone() && <NotificationsCard />}
      <Link to="/" className="btn btn--ghost">Back to today</Link>
    </div>
  );
}
