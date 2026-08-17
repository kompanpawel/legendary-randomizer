import { cn } from '../../utils/cn';

interface BadgeProps {
  label: string;
  color?: 'red' | 'gold' | 'covert' | 'instinct' | 'ranged' | 'strength' | 'tech' | 'zinc';
  className?: string;
}

const colorMap: Record<string, string> = {
  red: 'bg-marvel-red/20 text-red-300 border-marvel-red/30',
  gold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  covert: 'bg-purple-700/20 text-purple-300 border-purple-700/30',
  instinct: 'bg-amber-600/20 text-amber-300 border-amber-600/30',
  ranged: 'bg-blue-700/20 text-blue-300 border-blue-700/30',
  strength: 'bg-red-700/20 text-red-300 border-red-700/30',
  tech: 'bg-zinc-600/20 text-zinc-300 border-zinc-600/30',
  zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function Badge({ label, color = 'zinc', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        colorMap[color],
        className
      )}
    >
      {label}
    </span>
  );
}

