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
      <div className="flex justify-center">
        <span className="px-2 py-0.5 text-[9px] text-gray-600 rounded-full bg-white/5">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
      {!isSelf && (
        <span className="text-[9px] text-gray-600 mb-0.5 px-1">{senderName}</span>
      )}
      <div
        className={`max-w-[88%] rounded-lg leading-snug ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        } ${
          isSelf
            ? 'bg-purple-600/90 text-white'
            : 'bg-white/5 text-gray-300 border border-white/5'
        }`}
      >
        {content}
      </div>
    </div>
  );
}
