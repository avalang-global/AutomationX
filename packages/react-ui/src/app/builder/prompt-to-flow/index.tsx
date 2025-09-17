// Custom
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CardList } from '@/components/custom/card-list';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';

import { LeftSideBarType, useBuilderStateContext } from '../builder-hooks';
import { SidebarHeader } from '../sidebar-header';

import { ChatMessage } from './chat-message';
import { PromptInput } from '@/components/custom/prompt-input';
import {
  promptFlowApi,
  PromptMessage,
  PromptMessageRoleEnum,
} from '@/features/flows/lib/prompt-to-flow-api';
import { flowsApi } from '@/features/flows/lib/flows-api';

const WELCOME_MESSAGE =
  "Hello! How can I help you today?\nYou can type the changes you'd like for this flow, and I'll help you create or modify it";

export const PromptToFlowSidebar = ({
  initMessages,
}: {
  initMessages: PromptMessage[];
}) => {
  const [isShowWelcomeMessage, setIsShowWelcomeMessage] = useState(false);
  const [messages, setMessages] = useState<PromptMessage[]>(initMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [flow, setLeftSidebar, setFlow, setVersion] = useBuilderStateContext(
    (state) => [
      state.flow,
      state.setLeftSidebar,
      state.setFlow,
      state.setVersion,
    ],
  );
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const scrollToLastMessage = () => {
    setTimeout(() => {
      lastMessageRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }, 1);
  };

  const { isPending, mutate } = useMutation({
    mutationFn: (messages: PromptMessage[]) => {
      return promptFlowApi.chat(flow.id, messages);
    },
    onSuccess: async (response: string) => {
      handleAddNewMessage({
        role: PromptMessageRoleEnum.assistant,
        content: response,
      });
      scrollToLastMessage();
      try {
        const freshFlow = await flowsApi.get(flow.id);
        setFlow(freshFlow);
        setVersion(freshFlow.version, true);
      } catch (e) {
        console.error('Failed to reload flow after chat response', e);
      }
    },
    onError: (error: any) => {
      toast({
        title: t('Error generating code'),
        description: error.message,
      });
    },
  });

  const handleAddNewMessage = (message: PromptMessage) => {
    const messagesToUpdate = [
      ...messages,
      {
        ...message,
        createdAt: new Date().toISOString(),
      },
    ];
    setMessages(messagesToUpdate);
    handleUpdateLocationState(messagesToUpdate);
    return messagesToUpdate;
  };

  const handleUpdateLocationState = (messages: PromptMessage[]) => {
    const currentState = (location.state as Record<string, unknown>) ?? {};
    navigate(location.pathname, {
      replace: true,
      state: { ...currentState, messages },
    });
  };

  const handleSendMessage = () => {
    const trimmedInputMessage = inputMessage.trim();
    if (trimmedInputMessage === '') {
      return;
    }
    const messages = handleAddNewMessage({
      role: PromptMessageRoleEnum.user,
      content: inputMessage,
    });
    mutate(messages);
    setInputMessage('');
    scrollToLastMessage();
  };

  const handleCloseSidebar = () => {
    setLeftSidebar(LeftSideBarType.NONE);
  };

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
    if (messages.length === 0) {
      setIsShowWelcomeMessage(true);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToLastMessage();
      }, 100);
    }
  }, [messages]);

  const welcomeMessage = useMemo(() => {
    return {
      role: PromptMessageRoleEnum.assistant,
      content: WELCOME_MESSAGE,
      createdAt: new Date().toISOString(),
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader onClose={handleCloseSidebar}>AutomationX</SidebarHeader>
      <div className="pt-0 p-4 flex flex-col flex-grow overflow-hidden">
        <ScrollArea className="flex-grow overflow-auto">
          <CardList className="pb-3 pr-3" listClassName="gap-6">
            {isShowWelcomeMessage && <ChatMessage message={welcomeMessage} />}
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                ref={index === messages.length - 1 ? lastMessageRef : null}
              />
            ))}
            <ScrollBar />
          </CardList>
        </ScrollArea>

        <PromptInput
          ref={textAreaRef}
          value={inputMessage}
          onChange={setInputMessage}
          onSubmit={handleSendMessage}
          loading={isPending}
          placeholder={t('Describe your automation flow')}
          icon
        />
      </div>
    </div>
  );
};

PromptToFlowSidebar.displayName = 'PromptToFlowSidebar';
