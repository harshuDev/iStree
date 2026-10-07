import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarIcon, CheckInIcon, HomeIcon, InsightsIcon, SettingsIcon } from './Icons';
import { useSettings, useUpdateSettings } from '../hooks/queries';
import { deviceTimeZone } from '../lib/dates';
import { InstallBanner } from './InstallBanner';

const tabs = [
  { to: '/', label: 'Today', Icon: HomeIcon, end: true },
  { to: '/cycle', label: 'Cycle', Icon: CalendarIcon },
  { to: '/check-in', label: 'Check-in', Icon: CheckInIcon },
  { to: '/insights', label: 'Insights', Icon: InsightsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export function AppShell() {
  const { data: settings } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  // Server reminders are scheduled in the user's timezone; keep it in sync
  // with the device (travel, daylight-saving rule changes).
  useEffect(() => {
    const tz = deviceTimeZone();
    if (settings && settings.timezone !== tz && navigator.onLine) updateSettings({ timezone: tz });
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
              <Icon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
