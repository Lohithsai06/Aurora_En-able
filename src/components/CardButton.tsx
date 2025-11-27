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
      className="card-button bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer p-6 border-2 border-transparent hover:border-blue-500"
      onClick={onClick}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${description}`}
    >
      <div className="card-icon mb-4 flex justify-center text-blue-600">
        {icon}
      </div>
      <h3 className="card-title mb-2 text-center">{title}</h3>
      <p className="card-description text-center text-gray-600">{description}</p>
    </div>
  );
}
