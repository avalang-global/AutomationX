import React, { useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from 'react-speech-kit';

import './ChatWidget.css';
import { Message } from './ChatMessage';
import { ChatHeader } from './ChatHeader';
import { ChatFooter } from './ChatFooter';
import { ChatBody } from './ChatBody';
import { ChatBadge } from './ChatBadge';

export interface ThemeOptions {
  headerColor?: string;
  headerTextColor?: string;
  backgroundColor?: string;
  userMessageColor?: string;
  userMessageTextColor?: string;
  botMessageColor?: string;
  botMessageTextColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  inputBorderColor?: string;
}

export interface PositionOptions {
  vertical: 'bottom' | 'top';
  horizontal: 'right' | 'left';
  offsetX?: number;
  offsetY?: number;
}

export const defaultTheme: ThemeOptions = {
  headerColor: '#333',
  headerTextColor: '#fff',
  backgroundColor: '#fff',
  userMessageColor: '#ccc',
  userMessageTextColor: '#333',
  botMessageColor: '#333',
  botMessageTextColor: '#fff',
  buttonColor: '#333',
  buttonTextColor: '#fff',
  inputBorderColor: '#ccc',
} as const;

const defaultPosition: PositionOptions = {
  vertical: 'bottom',
  horizontal: 'right',
  offsetX: 24,
  offsetY: 24,
} as const;

export interface ChatWidgetProps {
  webhookUrl: string;
  title?: string;
  welcomeMessage?: string;
  theme?: ThemeOptions;
  icon?: string | React.ReactNode;
  position?: PositionOptions;
  avatar?: string;
}

const DEFAULT_WELCOME_MSG = '👋 Hi there! How can I help you today?';

const getOrCreateSessionId = () => {
  const key = 'ax_chat_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  webhookUrl,
  title,
  welcomeMessage = DEFAULT_WELCOME_MSG,
  theme: userTheme = {},
  position: userPosition = {},
  icon,
  avatar,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: welcomeMessage },
  ]);
  const [input, setInput] = useState('');
  const [speechContent, setSpeechContent] = useState('');
  const [isMinimized, setIsMinimized] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSpeechEnd = () => {
    setInput((prev) => (prev ? `${prev} ${speechContent}` : speechContent));
    setSpeechContent('');
    console.log('Speech ended');
  };

  const onSpeechResult = (result: SpeechRecognitionResult | string) => {
    if (typeof result === 'string') {
      setSpeechContent(result);
    } else {
      console.error('Unable to recognize speech');
    }
  };

  const onSpeechError = (event: ErrorEvent) => {
    if (event.error === 'not-allowed') {
      console.error('Speech input not allowed, check browser permissions');
    } else {
      console.error('Error', event.error);
    }
  };

  const { listen, listening, stop } = useSpeechRecognition({
    onResult: onSpeechResult,
    onEnd: onSpeechEnd,
    onError: onSpeechError,
  });

  const toggleSpeech = listening
    ? stop
    : () => {
        listen({ lang: 'en-TH' });
      };

  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    setMessages((msgs) => [...msgs, { from: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) throw new Error('Network error');

      const reply = await res.text();

      setMessages((msgs) => [...msgs, { from: 'bot', text: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((msgs) => [
        ...msgs,
        { from: 'bot', text: '⚠️ Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fill in missing theme options with default ones
  const theme = { ...defaultTheme, ...userTheme };
  const position = { ...defaultPosition, ...userPosition };

  const headerStyle = {
    backgroundColor: theme.headerColor,
    color: theme.headerTextColor,
  };

  const bodyStyle = {
    backgroundColor: theme.backgroundColor,
  };

  const buttonStyle = {
    backgroundColor: theme.buttonColor,
    color: theme.buttonTextColor,
  };

  const inputStyle = {
    borderColor: theme.inputBorderColor,
  };

  const userMessageStyle = {
    backgroundColor: theme.userMessageColor,
    color: theme.userMessageTextColor,
  };

  const botMessageStyle = {
    backgroundColor: theme.botMessageColor,
    color: theme.botMessageTextColor,
  };

  const variant = title ? 'pill' : 'bubble';

  const classes = ['ax-chat-container'];
  if (isMinimized) {
    classes.push('ax-minimized');
    classes.push(variant);
  }

  return (
    <div
      className={classes.join(' ')}
      style={{
        ...bodyStyle,
        position: 'fixed',
        [position.vertical]: position.offsetY,
        [position.horizontal]: position.offsetX,
      }}
    >
      <ChatBadge
        mode={variant}
        isMinimized={isMinimized}
        onMinimizeToggle={() => setIsMinimized(!isMinimized)}
        icon={icon}
        title={title}
      />
      <ChatHeader
        isMinimized={isMinimized}
        onMinimizeToggle={() => setIsMinimized(!isMinimized)}
        icon={icon}
        title={title}
        headerStyle={headerStyle}
      />
      <ChatBody
        isMinimized={isMinimized}
        loading={loading}
        avatar={avatar}
        messages={messages}
        userMessageStyle={userMessageStyle}
        botMessageStyle={botMessageStyle}
      />
      <ChatFooter
        isMinimized={isMinimized}
        loading={loading}
        listening={listening}
        textContent={input}
        speechContent={speechContent}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        theme={userTheme}
        onSetInput={setInput}
        onSendMessage={sendMessage}
        onToggleSpeech={toggleSpeech}
      />
    </div>
  );
};
