import showdown from 'showdown';

import './ChatMessage.css';

export type Message = {
  from: 'bot' | 'user';
  text: string;
};

  export type MessageStyle = {
  backgroundColor?: string;
  color?: string;
};

export interface ChatMessageProps {
  avatar?: string;
  message: Message;
  userMessageStyle: MessageStyle;
  botMessageStyle: MessageStyle;
}

const converter = new showdown.Converter({
  tables: true,
  simpleLineBreaks: true,
  simplifiedAutoLink: true,
  openLinksInNewWindow: true,
  omitExtraWLInCodeBlocks: true,
});

export const ChatMessage: React.FC<ChatMessageProps> = ({
  avatar,
  message,
  userMessageStyle,
  botMessageStyle,
}) => {
  const { from, text } = message;
  return (
    <div
      className={`chat-message flex ${from}`}
      style={{ justifyContent: from === 'bot' ? 'flex-start' : 'flex-end' }}
    >
      {message.from === 'bot' && avatar && (
        <img
          src={avatar}
          alt="Avatar"
          className="ax-chat-avatar"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            marginRight: 8,
          }}
        />
      )}
      <div
        className={`ax-message ${from === 'user' ? 'ax-user' : 'ax-bot'}`}
        style={from === 'user' ? userMessageStyle : botMessageStyle}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: converter.makeHtml(text),
          }}
        ></div>
      </div>
    </div>
  );
};
