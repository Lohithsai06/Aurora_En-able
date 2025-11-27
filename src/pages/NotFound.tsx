import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="text-center">
        <h1 className="text-9xl mb-4">404</h1>
        <p className="text-2xl mb-8 text-gray-600">Page Not Found</p>
        <p className="mb-8 text-gray-500">
          The page you're looking for doesn't exist.
        </p>
        <BigButton onClick={() => navigate('/')} variant="primary">
          Go Home
        </BigButton>
      </div>
    </div>
  );
}
