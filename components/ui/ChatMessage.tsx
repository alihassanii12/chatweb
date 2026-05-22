import { UserAvatar } from './UserAvatar';

export type ChatMessageProps = {
  content: string;
  senderName: string;
  isSelf: boolean;
  isSystem?: boolean;
  compact?: boolean;
};

export function ChatMessage({
  content,
  senderName,
  isSelf,
  isSystem = false,
  compact = false,
}: ChatMessageProps) {
  if (isSystem) {
    return (
      <div className="flex justify-center animate-fade-in">
        <span
          className={`px-3 py-1 bg-white/5 border border-white/5 text-gray-500 rounded-full ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {content}
        </span>
      </div>
    );
  }

  const bubble = compact
    ? 'px-3 py-2 text-[11px] max-w-[92%]'
    : 'px-4 py-2.5 text-sm sm:text-xs max-w-[92%] sm:max-w-[85%]';

  return (
    <div
      className={`flex gap-2 animate-fade-in ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <UserAvatar name={senderName} size="sm" className="mt-0.5 shrink-0" />
      <div className={`flex flex-col min-w-0 ${isSelf ? 'items-end' : 'items-start'}`}>
        <span
          className={`font-semibold text-gray-500 mb-1 px-0.5 ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {senderName}
        </span>
        <div
          className={`${bubble} rounded-2xl leading-relaxed ${
            isSelf
              ? 'bg-gradient-to-br from-purple-600 to-violet-700 text-white rounded-tr-sm shadow-md shadow-purple-900/30'
              : 'bg-white/[0.06] text-gray-100 border border-white/8 rounded-tl-sm'
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
