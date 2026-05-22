import { Loader2 } from 'lucide-react';

type LoadingScreenProps = {
  title?: string;
  subtitle?: string;
};

export function LoadingScreen({
  title = 'Cinema',
  subtitle = 'Loading…',
}: LoadingScreenProps) {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#0a0a0c]">
      <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>
    </div>
  );
}
