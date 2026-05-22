'use client';

import { Film, MessageSquare, Video } from 'lucide-react';

export type RoomTab = 'chat' | 'library' | 'call';

type MobileTabBarProps = {
  activeTab: RoomTab;
  onTabChange: (tab: RoomTab) => void;
  showTypingDot?: boolean;
  /** Library tab only when cinema / watch mode is on */
  cinemaMode?: boolean;
};

const BASE_TABS: { id: RoomTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'call', label: 'Call', icon: Video },
];

const LIBRARY_TAB = { id: 'library' as const, label: 'Library', icon: Film };

export function MobileTabBar({
  activeTab,
  onTabChange,
  showTypingDot,
  cinemaMode = false,
}: MobileTabBarProps) {
  const tabs = cinemaMode
    ? [BASE_TABS[0], LIBRARY_TAB, BASE_TABS[1]]
    : BASE_TABS;

  return (
    <nav className="lg:hidden flex border-b border-white/5 shrink-0 bg-[#0a0a0c]">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[52px] transition-colors ${
              active
                ? 'text-purple-400 bg-purple-600/10'
                : 'text-gray-500 active:bg-white/5'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : 'text-gray-500'}`} />
            <span className="text-xs font-medium">{label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-purple-500 rounded-full" />
            )}
            {id === 'chat' && showTypingDot && !active && (
              <span className="absolute top-2 right-[30%] w-2 h-2 rounded-full bg-purple-500" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
