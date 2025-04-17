import React from 'react';

export const Alert = ({ children, className }) => {
  return (
    <div className={`border-l-4 p-4 ${className}`}>
      {children}
    </div>
  );
};

export const AlertTitle = ({ children, className }) => {
  return (
    <h3 className={`font-bold text-lg ${className}`}>
      {children}
    </h3>
  );
};
