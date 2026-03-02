import './ChatBadge.css';
import { MessageSvgIcon } from './MessageIcon';

export interface ChatBadgeProps {
  mode: 'bubble' | 'pill';
  icon?: string | React.ReactNode;
  title?: string;
  isMinimized: boolean;
  onMinimizeToggle: () => unknown;
}

export const ChatBadge: React.FC<ChatBadgeProps> = ({
  mode,
  isMinimized,
  onMinimizeToggle,
  icon,
  title,
}) => {
  if (!isMinimized) {
    return null;
  }

  if (!icon && !title) {
    icon = <MessageSvgIcon />;
  }

  return (
    <div className={`ax-chat-badge ${mode}`} onClick={onMinimizeToggle}>
      {icon &&
        (typeof icon === 'string' ? (
          <img src={icon} alt="badge icon" />
        ) : (
          <span>{icon}</span>
        ))}
      {title && <span>{title}</span>}
    </div>
  );
};
