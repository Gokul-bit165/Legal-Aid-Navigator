import React from 'react';
import { LucideProps, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  icon?: React.ReactElement<LucideProps>;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';
  return (
    <button
      className={`${base} ${disabledClass} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
