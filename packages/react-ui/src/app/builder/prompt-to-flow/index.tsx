/**
 * This component is based on the CopilotSidebar component in the builder/copilot/index.tsx file.
 */

import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { CardList } from '@/components/custom/card-list';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';

import { LeftSideBarType, useBuilderStateContext } from '../builder-hooks';
import { SidebarHeader } from '../sidebar-header';

import { ChatMessage } from './chat-message';
import { PromptInput } from '@/components/custom/prompt-input';
import { promptFlowApi, PromptMessage, PromptMessageRoleEnum } from '@/features/flows/lib/prompt-flow-api';
import { flowsApi } from '@/features/flows/lib/flows-api';
// import { LoadingMessage } from './loading-message';

interface DefaultEventsMap {
  [event: string]: (...args: any[]) => void;
}

export const PromptToFlowSidebar = ({ initMessages }: { initMessages: PromptMessage[] }) => {
  const [messages, setMessages] = useState<PromptMessage[]>(initMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [
    flow,
    setLeftSidebar,
    setFlow,
    setVersion,
  ] = useBuilderStateContext((state) => [
    state.flow,
    state.setLeftSidebar,
    state.setFlow,
    state.setVersion,
  ]);
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
      handleAddNewMessage({ role: PromptMessageRoleEnum.assistant, content: response });
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
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, {
        ...message,
        createdAt: new Date().toISOString(),
      }];
      handleUpdateLocationState(newMessages);
      return newMessages;
    });
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
    handleAddNewMessage({ role: PromptMessageRoleEnum.user, content: inputMessage });
    mutate(messages);
    setInputMessage('');
    scrollToLastMessage();
  };

  const handleCloseSidebar = () => {
    // handleUpdateLocationState([]);
    // setMessages([]);
    setLeftSidebar(LeftSideBarType.NONE);
  };

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToLastMessage();
      }, 100);
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader onClose={handleCloseSidebar}>
        AutomationX
      </SidebarHeader>
      <div className="pt-0 p-4 flex flex-col flex-grow overflow-hidden">
        <ScrollArea className="flex-grow overflow-auto">
          <CardList className="pb-3 pr-3" listClassName="gap-6">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                ref={index === messages.length - 1 ? lastMessageRef : null}
              />
            ))}
            {/* {isPending && <LoadingMessage></LoadingMessage>} */}
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
