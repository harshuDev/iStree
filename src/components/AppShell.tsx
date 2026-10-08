import { useEffect, useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarIcon, HomeIcon, InsightsIcon, LogIcon, UserIcon } from './Icons';
import { useSettings, useUpdateSettings } from '../hooks/queries';
import { deviceTimeZone } from '../lib/dates';
import { InstallBanner } from './InstallBanner';

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/cycle', label: 'Calendar', Icon: CalendarIcon },
  { to: '/check-in', label: 'Log', Icon: LogIcon },
  { to: '/insights', label: 'Insights', Icon: InsightsIcon },
  { to: '/settings', label: 'Account', Icon: UserIcon },
];

export function AppShell() {
  const { data: settings } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const tzSyncAttempted = useRef(false);

  // Server reminders are scheduled in the user's timezone; keep it in sync
  // with the device (travel, daylight-saving rule changes).
  useEffect(() => {
    const tz = deviceTimeZone();
    // Once per session: a failed update rolls back and must not retry in a loop.
    if (!settings || settings.timezone === tz || tzSyncAttempted.current || !navigator.onLine) return;
    tzSyncAttempted.current = true;
    updateSettings({ timezone: tz });
  }, [settings, updateSettings]);

  return (
    <>
      <main className="app">
        <InstallBanner />
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        <div className="bottom-nav__inner">
          {tabs.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              {({ isActive }) => (
                <>
                  <Icon filled={isActive} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
