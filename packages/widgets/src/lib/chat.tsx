import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWindow } from './ChatWindow';
import './styles.css';

export interface ChatOptions {
  parent?: HTMLElement; // where to attach chat (default: document.body)
  title?: string;
}

export function createChat(options: ChatOptions = {}) {
  const { parent = document.body, title = 'AutomationX Chat' } = options;

  // Create container if not exists
  const container = document.createElement('div');
  container.className = 'automationx-chat-container';
  parent.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(<ChatWindow title={title} />);

  return {
    destroy: () => {
      root.unmount();
      container.remove();
    },
  };
}
