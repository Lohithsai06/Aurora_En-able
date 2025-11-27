import { ReactNode } from 'react';

interface CardButtonProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

export default function CardButton({ title, description, icon, onClick }: CardButtonProps) {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="card-button"
      onClick={onClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${description}`}
      style={{ overflow: 'visible' }}
    >
      <div className="card-icon">
        {icon}
      </div>
      <h3
        className="card-title"
        style={{
          color: '#111',
          WebkitTextFillColor: '#111',
          opacity: 1,
          display: 'block',
          zIndex: 2,
        }}
      >
        {title}
      </h3>
      <p
        className="card-description"
        style={{
          color: '#444',
          WebkitTextFillColor: '#444',
          opacity: 1,
          zIndex: 2,
        }}
      >
        {description}
      </p>
    </div>
  );
}
