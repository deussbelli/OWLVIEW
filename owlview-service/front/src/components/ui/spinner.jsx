import React from 'react';

const Spinner = ({ size = 'medium', className = '' }) => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={`animate-spin rounded-full border-t-2 border-blue-500 border-solid ${sizes[size]} ${className}`}
    ></div>
  );
};

export default Spinner;
