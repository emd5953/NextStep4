// Minimalist Monochrome Button Component
// Example of how to build components using the design system

import React from 'react';

const MinimalistButton = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  type = 'button',
  ...props 
}) => {
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    ghost: 'btn--ghost'
  };
  
  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      type={type}
      className={buttonClasses} 
      {...props}
    >
      {children}
    </button>
  );
};

export default MinimalistButton;