import { Users, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { VillainGroup, Henchman } from '../../types/cards';

interface VillainCardProps {
  villain: VillainGroup;
  className?: string;
}

export function VillainCard({ villain, className }: VillainCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 flex items-center gap-3',
        className
      )}
    >
      <div className="p-1.5 rounded-lg bg-zinc-700">
        <Users size={14} className="text-zinc-300" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Łotry</p>
        <p className="text-white text-sm font-medium">{villain.name}</p>
      </div>
    </div>
  );
}

interface HenchmanCardProps {
  henchman: Henchman;
  className?: string;
}

export function HenchmanCard({ henchman, className }: HenchmanCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-2.5 flex items-center gap-3',
        className
      )}
    >
      <div className="p-1.5 rounded-lg bg-zinc-700">
        <Shield size={14} className="text-zinc-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Słudzy</p>
        <p className="text-white text-sm font-medium">{henchman.name}</p>
      </div>
    </div>
  );
}

