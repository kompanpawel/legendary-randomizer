import { NavLink } from 'react-router-dom';
import { Shuffle, BarChart2, Database, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { to: '/', icon: Shuffle, label: 'Setup' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
  { to: '/database', icon: Database, label: 'Database' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 safe-bottom">
      <div className="flex">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-xs font-medium transition-colors',
                isActive ? 'text-marvel-red' : 'text-zinc-500 hover:text-zinc-300'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}


