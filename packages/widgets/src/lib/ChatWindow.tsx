import React, { useState } from 'react';

interface ChatWindowProps {
  title: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ title }) => {
  const [messages, setMessages] = useState([
    { from: 'bot', text: '👋 Hi there! I’m AutomationX bot.' },
    { from: 'bot', text: 'How can I help you today?' },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { from: 'user', text: input }]);
    setInput('');
    // Simulate mock bot reply
    setTimeout(() => {
      setMessages((msgs) => [
        ...msgs,
        { from: 'bot', text: '🤖 This is a mock response.' },
      ]);
    }, 600);
  };

  return (
    <div className="ax-chat-window">
      <div className="ax-chat-header">{title}</div>
      <div className="ax-chat-body">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`ax-message ${
              msg.from === 'user' ? 'ax-user' : 'ax-bot'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="ax-chat-footer">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};
