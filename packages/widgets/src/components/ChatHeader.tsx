import './ChatHeader.css';

export type HeaderStyle = {
  backgroundColor?: string;
  color?: string;
};

export interface ChatHeaderProps {
  icon?: string | React.ReactNode;
  title?: string;
  headerStyle: HeaderStyle;
  isMinimized: boolean;
  onMinimizeToggle: () => unknown;
}

const DEFAULT_TITLE = 'Chat';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  isMinimized,
  onMinimizeToggle,
  icon,
  title,
  headerStyle,
}) => {
  if (isMinimized) {
    return null;
  }

  return (
    <div
      className="ax-chat-header"
      style={headerStyle}
      onClick={onMinimizeToggle}
    >
      {icon &&
        (typeof icon === 'string' ? (
          <img src={icon} alt="Chat icon" className="ax-chat-icon" />
        ) : (
          <span className="ax-chat-icon">{icon}</span>
        ))}
      {title
        ? title
        : icon
        ? null
        : DEFAULT_TITLE && (
            <span className="ax-chat-title">{title ?? DEFAULT_TITLE}</span>
          )}
      {!isMinimized && <span className="ax-minimize-indicator">x</span>}
    </div>
  );
};
