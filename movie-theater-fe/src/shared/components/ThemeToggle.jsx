import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import './ThemeToggle.css';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isLight ? 'Chuyển chế độ tối' : 'Chuyển chế độ sáng'}
      title={isLight ? 'Chế độ tối' : 'Chế độ sáng'}
    >
      {isLight ? <Moon className="theme-toggle__icon" aria-hidden /> : <Sun className="theme-toggle__icon" aria-hidden />}
    </button>
  );
}
