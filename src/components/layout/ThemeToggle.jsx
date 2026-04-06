import { useTheme } from '../../context/ThemeContext'
import { Button } from '../ui/Button'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  )
}
