import { Loader2, Tv } from 'lucide-react';

type LoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  title = 'Private Cinema',
  subtitle = 'Loading your experience...',
}: LoadingScreenProps) {
  return (
    <div className="cinema-mesh flex-1 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="z-10 flex flex-col items-center gap-5 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-purple-500/30 blur-xl animate-pulse" />
          <div className="relative p-4 cinema-glass rounded-2xl border border-purple-500/25">
            <Tv className="w-9 h-9 text-purple-300" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-purple-200/90">
            {title}
          </h2>
          <p className="text-xs text-gray-500 max-w-[220px]">{subtitle}</p>
        </div>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    </div>
  );
}
