import { cn } from '../../utils/cn';

interface ToggleChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  initials?: string;
  className?: string;
}

export function ToggleChip({ label, selected, onToggle, initials, className }: ToggleChipProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 active:scale-95',
        selected
          ? 'bg-marvel-red border-marvel-red text-white shadow-lg shadow-red-900/30'
          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300',
        className
      )}
      title={label}
    >
      {initials ?? label}
    </button>
  );
}

