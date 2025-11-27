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
        className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-gray-100 p-8 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
        onClick={onClick}
        onKeyPress={handleKeyPress}
        role="button"
        tabIndex={0}
        aria-label={`Open ${title} tools`}
      >
        {/* decorative gradient blob in top-right */}
        <span className="card-blob absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200 to-purple-200 opacity-40 rounded-full pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mt-1">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mt-2">{description}</p>
            <div>
              <button
                type="button"
                className="text-blue-600 font-medium mt-4 inline-flex items-center hover:underline"
                onClick={onClick}
                aria-label={`Open ${title}`}
              >
                Open Tool →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
}
