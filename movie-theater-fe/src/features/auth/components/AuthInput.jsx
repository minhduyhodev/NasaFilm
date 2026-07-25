import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './AuthInput.css';

export const AuthInput = React.forwardRef(
  (
    {
      label,
      placeholder,
      error,
      icon,
      showPasswordToggle,
      onPasswordToggle,
      showPassword,
      type,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
        {label ? <label className="auth-field__label">{label}</label> : null}

        <div className="auth-field__control">
          {icon ? <span className="auth-field__icon">{icon}</span> : null}

          <input
            ref={ref}
            type={showPasswordToggle && showPassword ? 'text' : type}
            placeholder={placeholder}
            className={[
              'auth-field__input',
              icon ? 'auth-field__input--icon' : '',
              showPasswordToggle ? 'auth-field__input--toggle' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />

          {showPasswordToggle ? (
            <button
              type="button"
              className="auth-field__toggle"
              onClick={onPasswordToggle}
              tabIndex={-1}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : null}
        </div>

        {error ? <p className="auth-field__error">{error.message}</p> : null}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';
export default AuthInput;
