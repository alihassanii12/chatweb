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
  { id: 'library', label: 'List', icon: Film },
  { id: 'call', label: 'Call', icon: Video },
];

export function MobileTabBar({ activeTab, onTabChange, showTypingDot }: MobileTabBarProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0a0a0c]/95 safe-bottom">
      <div className="flex h-11">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0 ${
                active ? 'text-purple-400' : 'text-gray-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium">{label}</span>
              {id === 'chat' && showTypingDot && !active && (
                <span className="absolute top-1.5 right-1/4 w-1.5 h-1.5 rounded-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
