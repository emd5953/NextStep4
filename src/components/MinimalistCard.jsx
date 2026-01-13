// Minimalist Monochrome Card Component
// Example of how to build components using the design system

import React from 'react';

const MinimalistCard = ({ 
  children, 
  variant = 'default', 
  className = '', 
  hover = false,
  ...props 
}) => {
  const baseClasses = 'card';
  
  const variantClasses = {
    default: '',
    large: 'card--large',
    inverted: 'card--inverted',
    borderless: 'card--borderless'
  };
  
  const hoverClasses = hover ? 'hover-invert' : '';
  
  const cardClasses = [
    baseClasses,
    variantClasses[variant],
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default MinimalistCard;