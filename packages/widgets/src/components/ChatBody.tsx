import { useEffect, useRef } from 'react';

import './ChatBody.css';
import { ChatMessage, Message, MessageStyle } from './ChatMessage';

export interface ChatBodyProps {
  isMinimized: boolean;
  loading: boolean;
  avatar?: string;
  messages: Message[];
  userMessageStyle: MessageStyle;
  botMessageStyle: MessageStyle;
}

export const ChatBody: React.FC<ChatBodyProps> = ({
  isMinimized,
  loading,
  avatar,
  messages,
  userMessageStyle,
  botMessageStyle,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isMinimized) {
    return null;
  }

  return (
    <div className="ax-chat-body">
      {messages.map((msg, i) => (
        <ChatMessage
          key={i}
          avatar={avatar}
          message={msg}
          userMessageStyle={userMessageStyle}
          botMessageStyle={botMessageStyle}
        />
      ))}
      {loading && (
        <div className="ax-message ax-bot ax-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
