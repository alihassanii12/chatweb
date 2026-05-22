'use client';

import React from 'react';
import { MessageSquare, Send, Smile } from 'lucide-react';
import { ChatMessage } from '@/components/ui/ChatMessage';

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💞', '💓', '💖', '💘', '✨', '🔥', '💯', '🎉', '🍿'],
  },
  {
    name: 'Hands',
    emojis: ['👍', '👎', '👊', '✌️', '🤞', '👌', '👋', '👏', '🙌', '🙏', '💪', '👀'],
  },
];

export type ChatMsgItem = {
  id: number;
  sender_name: string;
  sender_email: string;
  content: string;
  timestamp: string;
};

type RoomChatPanelProps = {
  messages: ChatMsgItem[];
  username: string;
  partnerUsername: string | null;
  partnerIsTyping: boolean;
  compact?: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onEmojiPick: (emoji: string) => void;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  placeholder?: string;
};

export function RoomChatPanel({
  messages,
  username,
  partnerUsername,
  partnerIsTyping,
  compact = false,
  chatInput,
  onChatInputChange,
  onSendChat,
  showEmojiPicker,
  onToggleEmojiPicker,
  onEmojiPick,
  chatContainerRef,
  chatInputRef,
  chatEndRef,
  className = '',
  placeholder = 'Type a message…',
}: RoomChatPanelProps) {
  return (
    <div className={`flex flex-col overflow-hidden min-h-0 ${className}`}>
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 my-auto min-h-[120px]">
            <MessageSquare className="w-7 h-7 text-gray-600 mb-2" />
            <p className="text-gray-500 text-xs">No messages yet</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={`${msg.id}-${index}`}
              content={msg.content}
              senderName={msg.sender_name}
              isSelf={msg.sender_name === username}
              isSystem={msg.sender_name === 'System'}
              compact={compact}
            />
          ))
        )}
        {partnerIsTyping && (
          <div className="flex flex-col items-start py-1 shrink-0">
            <span className="text-[10px] text-purple-400 font-medium px-1">
              {partnerUsername || 'Partner'} is typing…
            </span>
            <div className="px-3 py-2 bg-white/5 rounded-lg flex gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={onSendChat}
        className="p-2 border-t border-white/5 shrink-0 flex gap-1.5 relative safe-bottom lg:pb-2"
      >
        {showEmojiPicker && (
          <div className="emoji-picker-container absolute bottom-[calc(100%+8px)] left-2 right-2 bg-[#16161f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-30 p-2 max-h-[min(38dvh,260px)] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center pb-1 mb-1 border-b border-white/5 shrink-0">
              <span className="text-[10px] text-purple-400 font-semibold">Emoji</span>
              <button
                type="button"
                onClick={onToggleEmojiPicker}
                className="text-[10px] text-gray-500 px-2 py-0.5"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {EMOJI_CATEGORIES.map((category, catIndex) => (
                <div key={catIndex}>
                  <h4 className="text-[9px] text-gray-600 px-1 mb-0.5">{category.name}</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {category.emojis.map((emoji, emojiIndex) => (
                      <button
                        key={emojiIndex}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        onClick={() => onEmojiPick(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-base hover:bg-white/10 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          ref={chatInputRef}
          type="text"
          enterKeyHint="send"
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          placeholder={placeholder}
          className="cinema-input flex-1 text-sm"
        />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={onToggleEmojiPicker}
          className={`p-1.5 rounded border border-white/5 shrink-0 ${
            showEmojiPicker ? 'text-purple-400' : 'text-gray-600'
          }`}
          aria-label="Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          type="submit"
          disabled={!chatInput.trim()}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          className="cinema-btn cinema-btn-primary shrink-0 !px-2"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
