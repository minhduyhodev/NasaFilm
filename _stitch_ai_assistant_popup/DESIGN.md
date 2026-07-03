---
name: Cinematic Core
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#e9bcb6'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#af8782'
  outline-variant: '#5e3f3b'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690003'
  primary-container: '#e50914'
  on-primary-container: '#fff7f6'
  inverse-primary: '#c0000c'
  secondary: '#ffb77d'
  on-secondary: '#4d2600'
  secondary-container: '#fd8b00'
  on-secondary-container: '#603100'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#737272'
  on-tertiary-container: '#fbf8f7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-xl-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for high-impact entertainment and streaming platforms. It evokes a **Cinematic Modernist** aesthetic, characterized by high-contrast visual storytelling, immersive dark environments, and energetic accents. 

The brand personality is bold, authoritative, and sophisticated. It targets an audience that values premium content and a frictionless, theater-like digital experience. The UI utilizes **Glassmorphism** for navigational overlays and **Minimalism** for content discovery, ensuring that the media always remains the focal point. Use deep blacks and vibrant warm highlights to create a sense of nighttime excitement and premium quality.

## Colors

The palette is rooted in a "Deep Space" dark mode, providing a canvas that makes imagery pop.

- **Primary (Cinematic Red):** Used for critical calls to action (CTAs), live indicators, and branding. It demands immediate attention.
- **Secondary (Solar Orange):** Used for highlights, hover states, and premium feature badges to add warmth and energy.
- **Neutrals:** A range of grays from `#0A0A0A` (Background) to `#FFFFFF` (Typography). Surface levels are defined by subtle shifts in dark gray to create depth without losing the "true black" aesthetic.
- **Accents:** Vibrant gradients merging Red and Orange should be used sparingly for high-visibility buttons and progress bars to simulate a glowing light effect.

## Typography

Typography follows a hierarchy that prioritizes readability against dark backgrounds. 

**Montserrat** is used for headlines to provide a geometric, modern, and impactful presence. The heavy weights (Bold/ExtraBold) are essential for replicating the "Blockbuster" feel. **Be Vietnam Pro** is used for body text and labels to maintain a friendly yet contemporary tone that ensures legibility in dense metadata sections (casts, descriptions, durations). Use uppercase styling for labels and secondary navigation to reinforce the structural, cinematic feel.

## Layout & Spacing

The layout utilizes a **Fluid Grid** model with generous safe areas to maintain a premium, uncluttered look. 

- **Desktop:** 12-column grid with 64px outer margins. Use large horizontal scrolling "shelves" for content categories.
- **Mobile:** 4-column grid with 16px margins. Content cards should utilize the full width or aspect-ratio-locked thumbnails.
- **Rhythm:** An 8px base unit drives all spacing. Use `stack-lg` (32px) between major sections to allow the UI to breathe, and `stack-sm` (8px) for related metadata elements.

## Elevation & Depth

This design system uses **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.

- **Level 0 (Base):** Deep black `#0A0A0A`.
- **Level 1 (Cards/Containers):** Slightly lighter gray `#1A1A1A` with a subtle 1px border of `#333333`.
- **Level 2 (Overlays/Nav):** Semi-transparent dark surfaces with a `20px` backdrop blur (Glassmorphism). This maintains context of the media playing behind the UI.
- **Highlights:** Use inner glows or subtle gradients on primary buttons to simulate a backlit physical surface.

## Shapes

The shape language is **Soft (0.25rem)**. This creates a professional, sharp look that feels modern and precise without being aggressive. 

- **Primary Buttons:** Use `rounded-lg` (0.5rem) to make them feel slightly more tactile and approachable.
- **Media Cards:** Use a strict 4px radius (`rounded-sm`) to maximize the screen real estate of the film posters and maintain a clean grid alignment.
- **Search Inputs:** Utilize pill-shaped forms for a distinct visual departure from rectangular content cards.

## Components

- **Buttons:** Primary buttons use a solid red background or a red-to-orange gradient. Secondary buttons use a ghost style (white outline) or a glass-morphic translucent gray.
- **Content Cards:** Minimalist cards with no visible borders until hover. On hover, apply a subtle scale-up effect (1.05x) and show a play icon overlay.
- **Chips:** Small, semi-transparent gray capsules for genres or tags (e.g., "Action," "4K").
- **Search Bar:** A sleek, low-profile input with a glass-morphic background and a magnifying glass icon.
- **Progress Bars:** Use the primary red for active states, with a glowing shadow effect to indicate the playhead position.
- **Navigation:** A sticky top header with a strong backdrop blur, ensuring navigation is accessible without obstructing the cinematic background.