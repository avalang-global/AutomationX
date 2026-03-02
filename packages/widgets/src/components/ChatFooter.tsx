import { useEffect, useRef } from 'react';

import './ChatFooter.css';
import { ThemeOptions } from './ChatWidget';
import { MicrophoneSvgIcon } from './MicrophoneIcon';

export type ButtonStyle = {
  backgroundColor?: string;
  color?: string;
};

export type InputStyle = {
  borderColor?: string;
}

export interface ChatFooterProps {
  isMinimized: boolean;
  loading: boolean;
  listening: boolean;
  textContent: string;
  speechContent: string;
  inputStyle: InputStyle;
  buttonStyle: ButtonStyle;
  theme: ThemeOptions;
  onSetInput: (value: string) => unknown;
  onSendMessage: () => unknown;
  onToggleSpeech: () => unknown;
}

export const ChatFooter: React.FC<ChatFooterProps> = ({
  isMinimized,
  loading,
  listening,
  textContent,
  speechContent,
  inputStyle,
  buttonStyle,
  theme,
  onSetInput,
  onSendMessage,
  onToggleSpeech,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextAreaHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = `${textArea.scrollHeight}px`; // Set height based on content
    }
  };

  // Adjust height on input change
  useEffect(() => {
    adjustTextAreaHeight();
  }, [textContent]);

  // Focus input field on load and when a request is completed
  useEffect(() => {
    if (!loading && !isMinimized) {
      textAreaRef.current?.focus();
    }
  }, [loading, isMinimized]);

  if (isMinimized) {
    return null;
  }

  return (
    <div className="ax-chat-footer">
      <textarea
        ref={textAreaRef}
        placeholder={listening ? 'Listening...' : 'Type a message...'}
        value={listening ? speechContent : textContent}
        style={inputStyle}
        disabled={loading || listening}
        onChange={(e) => {
          onSetInput(e.target.value);
        }}
        onKeyDown={(e) => {
          // Submit on Enter WITHOUT Shift
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
          }
        }}
        rows={1}
      />
      <button onClick={onToggleSpeech} style={{ padding: 10 }}>
        {listening
          ? MicrophoneSvgIcon({
              type: 'off',
              strokeColor: theme.buttonTextColor,
            })
          : MicrophoneSvgIcon({
              type: 'on',
              strokeColor: theme.buttonTextColor,
            })}
      </button>
      <button onClick={onSendMessage} disabled={loading} style={buttonStyle}>
        Send
      </button>
    </div>
  );
};
