import { detectPlatform, iosVersion, isIOSSafari, isStandalone, useInstallPrompt } from '../lib/pwa';
import { PlusSquareIcon, ShareIcon } from './Icons';

/**
 * Platform-specific install instructions.
 * - Android/desktop Chrome & Edge: native prompt via `beforeinstallprompt`.
 * - iOS: no programmatic prompt exists, so we walk through Share → Add to Home Screen.
 */
export function InstallGuide() {
  const platform = detectPlatform();
  const { canPrompt, justInstalled, promptInstall } = useInstallPrompt();

  if (isStandalone()) {
    return (
      <div className="alert alert--success">iStree is installed and running from your home screen. 🌸</div>
    );
  }

  if (justInstalled) {
    return (
      <div className="alert alert--success">
        Installed! Open iStree from your home screen to continue and turn on reminders.
      </div>
    );
  }

  if (platform === 'ios') {
    const version = iosVersion();
    return (
      <div className="stack">
        {version !== null && version < 16.4 && (
          <div className="alert alert--info">
            You're on iOS {version}. You can install iStree, but reminders need iOS 16.4 or newer.
          </div>
        )}
        {!isIOSSafari() && (
          <div className="alert alert--info">
            For the smoothest install, open this page in <strong>Safari</strong>.
          </div>
        )}
        <ol className="steps">
          <li>
            <div>
              Tap the <strong>Share</strong> button <ShareIcon /> in Safari's toolbar
              <div className="small muted">At the bottom of the screen on iPhone, top-right on iPad.</div>
            </div>
          </li>
          <li>
            <div>
              Scroll down and choose <strong>Add to Home Screen</strong> <PlusSquareIcon />
              <div className="small muted">If you don't see it, tap "Edit Actions" at the bottom of the list.</div>
            </div>
          </li>
          <li>
            <div>
              Make sure <strong>Open as Web App</strong> is on, then tap <strong>Add</strong>
            </div>
          </li>
          <li>
            <div>
              Open <strong>iStree</strong> from your home screen and turn on reminders in the app
              <div className="small muted">iPhone only allows notifications for apps launched from the home screen.</div>
            </div>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="stack">
      {canPrompt ? (
        <button className="btn btn--block" onClick={() => void promptInstall()}>
          Install iStree
        </button>
      ) : platform === 'android' ? (
        <ol className="steps">
          <li><div>Tap the <strong>⋮</strong> menu in Chrome's top-right corner</div></li>
          <li><div>Choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>)</div></li>
          <li><div>Open iStree from your home screen and turn on reminders</div></li>
        </ol>
      ) : (
        <p className="muted small">
          In Chrome or Edge, click the install icon in the address bar. You can also keep using iStree in this tab —
          desktop browsers support reminders without installing.
        </p>
      )}
    </div>
  );
}
