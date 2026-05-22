'use client';

import { MessageSquare, Video } from 'lucide-react';

type LayoutMode = 'both' | 'chat_only';

type MobileRoomHeaderProps = {
  connected: boolean;
  partnerUsername: string | null;
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
};

export function MobileRoomHeader({
  connected,
  partnerUsername,
  layoutMode,
  onLayoutChange,
}: MobileRoomHeaderProps) {
  return (
    <header className="lg:hidden border-b border-white/5 shrink-0 z-20 bg-[#0a0a0c]/95">
      <div className="px-2.5 py-1.5 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            connected ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">Cinema</p>
          <p className="text-[10px] text-gray-600 truncate">
            {partnerUsername ?? 'No partner'}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onLayoutChange('both')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${
              layoutMode === 'both'
                ? 'bg-purple-600 text-white'
                : 'text-gray-500 bg-white/5'
            }`}
          >
            <Video className="w-4 h-4" />
            Both
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('chat_only')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${
              layoutMode === 'chat_only'
                ? 'bg-purple-600 text-white'
                : 'text-gray-500 bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
        </div>
      </div>
    </header>
  );
}
