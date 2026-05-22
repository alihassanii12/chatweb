'use client';

import { Film, MessageSquare, Video } from 'lucide-react';

export type RoomTab = 'chat' | 'library' | 'call';

type MobileTabBarProps = {
  activeTab: RoomTab;
  onTabChange: (tab: RoomTab) => void;
  showTypingDot?: boolean;
};

const TABS: { id: RoomTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'library', label: 'Library', icon: Film },
  { id: 'call', label: 'Call', icon: Video },
];

export function MobileTabBar({ activeTab, onTabChange, showTypingDot }: MobileTabBarProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 cinema-glass border-t border-white/10 safe-bottom"
      aria-label="Room sections"
    >
      <div className="flex items-stretch">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 touch-manipulation transition-colors ${
                active ? 'text-purple-300' : 'text-gray-500 active:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
              {id === 'chat' && showTypingDot && !active && (
                <span className="absolute top-2 right-[calc(50%-20px)] w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              )}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
