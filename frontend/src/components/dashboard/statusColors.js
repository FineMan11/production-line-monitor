/**
 * Status color maps — single source of truth for all status-related Tailwind classes.
 * Import from here; never hardcode status colors in components.
 *
 * Backend sends color_code as a string: "green" | "orange" | "blue" | "red"
 */

export const STATUS_BORDER = {
  green:  'border-green-400',
  orange: 'border-orange-400',
  blue:   'border-blue-400',
  red:    'border-red-400',
}

export const STATUS_DOT = {
  green:  'bg-green-500',
  orange: 'bg-orange-500',
  blue:   'bg-blue-500',
  red:    'bg-red-500',
}

export const STATUS_LABEL = {
  green:  'text-green-800',
  orange: 'text-orange-800',
  blue:   'text-blue-800',
  red:    'text-red-800',
}

export const STATUS_BG = {
  green:  'bg-green-100',
  orange: 'bg-orange-100',
  blue:   'bg-blue-100',
  red:    'bg-red-100',
}
