import clsx from 'clsx'

/**
 * Merge Tailwind-friendly class names.
 * @param  {...import('clsx').ClassValue} inputs
 */
export function cn(...inputs) {
  return clsx(inputs)
}
