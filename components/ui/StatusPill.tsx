type StatusPillProps = {
  connected: boolean;
  label?: string;
  className?: string;
};

export function StatusPill({ connected, label, className = '' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${className} ${
        connected
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
          : 'bg-red-500/10 text-red-300 border-red-500/25'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
        }`}
      />
      {label ?? (connected ? 'Live' : 'Offline')}
    </span>
  );
}
