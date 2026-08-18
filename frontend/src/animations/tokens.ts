// Motion Timing & Physics Tokens

export const duration = {
  instant: 0.1,  // 100ms - fast micro-feedback (clicks, toggles)
  fast: 0.16,    // 160ms - small elements, tooltips, icon swaps
  normal: 0.22,  // 220ms - dropdowns, popups, card transitions
  emphasis: 0.35, // 350ms - modals, page entrances, drawer menus
  complex: 0.5,  // 500ms - major layout restructuring, fullscreen
} as const;

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  out: [0, 0, 0.2, 1],
  in: [0.4, 0, 1, 1],
  inOut: [0.4, 0, 0.2, 1],
} as const;

export const spring = {
  soft: { type: 'spring', stiffness: 260, damping: 25 },
  medium: { type: 'spring', stiffness: 350, damping: 25 },
  bouncy: { type: 'spring', stiffness: 420, damping: 20 },
} as const;

export const hoverScale = {
  button: 1.02,
  card: 1.015,
  icon: 1.1,
  tap: 0.97,
} as const;
