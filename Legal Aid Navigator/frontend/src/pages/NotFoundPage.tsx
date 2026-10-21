import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-ivory-200">
    <h1 className="text-4xl font-serif text-crimson-600 mb-4">404 – Page Not Found</h1>
    <p className="text-lg mb-6">Oops! The page you are looking for does not exist.</p>
    <Link to="/" className="text-olive-600 hover:underline text-xl">
      Return to Home
    </Link>
  </div>
);
