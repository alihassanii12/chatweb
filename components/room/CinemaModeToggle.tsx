'use client';

import { Tv } from 'lucide-react';

type CinemaModeToggleProps = {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
};

export function CinemaModeToggle({ enabled, onToggle, className = '' }: CinemaModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${className} ${
        enabled
          ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
          : 'bg-white/5 text-gray-500 border border-white/10 hover:text-gray-300'
      }`}
      aria-pressed={enabled}
      title={enabled ? 'Turn cinema mode off' : 'Turn cinema mode on'}
    >
      <Tv className="w-4 h-4" />
      <span>{enabled ? 'Cinema on' : 'Cinema'}</span>
    </button>
  );
}
