/**
 * QUILLART Design System — Tailwind preset.
 * Every value points at a CSS variable from quillart-tokens.css, so switching
 * theme is one attribute (data-theme="light") and needs no `dark:` prefix.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', raised: 'var(--surface-raised)' },
        line: { DEFAULT: 'var(--line)', control: 'var(--line-control)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)', subtle: 'var(--ink-subtle)' },
        action: 'var(--action)',
        'on-action': 'var(--on-action)',
        red: { DEFAULT: 'var(--red)', text: 'var(--red-text)', soft: 'var(--red-soft)' },
        'on-red': 'var(--on-red)',
        gold: { DEFAULT: 'var(--gold)', text: 'var(--gold-text)', soft: 'var(--gold-soft)' },
        'on-gold': 'var(--on-gold)',
        green: { DEFAULT: 'var(--green)', text: 'var(--green-text)', soft: 'var(--green-soft)' },
        'on-green': 'var(--on-green)',
        star: 'var(--star)',
        emblem: 'var(--emblem)',
        focus: 'var(--focus)',
        illus: 'var(--illus)',
        map: {
          land: 'var(--map-land)',
          water: 'var(--map-water)',
          road: 'var(--map-road)',
          'road-major': 'var(--map-road-major)',
          park: 'var(--map-park)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
      },
      fontSize: {
        'display-xl': ['56px', { lineHeight: '60px', letterSpacing: '-0.02em', fontWeight: '700' }],
        display: ['40px', { lineHeight: '44px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'heading-1': ['28px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-2': ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'kpi-xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em', fontWeight: '700' }],
        kpi: ['28px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '26px' }],
        body: ['15px', { lineHeight: '22px' }],
        'body-sm': ['13px', { lineHeight: '18px' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
        'map-label': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        action: 'var(--action-glow)',
        'glow-red': 'var(--glow-red)',
        'glow-gold': 'var(--glow-gold)',
        'glow-green': 'var(--glow-green)',
      },
    },
  },
};
