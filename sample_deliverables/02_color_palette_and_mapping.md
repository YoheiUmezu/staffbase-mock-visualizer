# Staffbase Branding Mapping

| Staffbase Area | Recommended Color | Hex | Handling Method | Reason |
|---|---|---|---|---|
| Main branding color | Northstar Blue | #005BBB | Branding | Most recognizable and versatile brand color |
| Navigation header text | White | #FFFFFF | Branding | Strong contrast over dark or blue headers |
| Navigation header background | Deep Navy | #0B1F33 | Branding | Creates strong enterprise framing |
| Accent color | Teal Accent | #00A6A6 | Branding | Suitable for selection and emphasis |
| Bottom bar | Deep Navy / Blue active | #0B1F33 / #005BBB | Branding / CSS | Useful for strong mobile navigation identity |
| Menu bar text/icons | White / light neutral | #F7FAFC | Branding | Keeps menu readable |
| Menu bar background | Deep Navy | #0B1F33 | Branding | Strong visual anchor |
| Menu bar accent | Blue | #005BBB | Branding | Current-state emphasis |
| Navigator accent | Teal | #00A6A6 | Branding / CSS | Optional modern highlight layer |

## Notes

- The palette is intentionally restrained and enterprise-safe.
- The accent is used sparingly to prevent the interface from feeling noisy.
- Most visible brand expression can be represented through standard Staffbase branding before adding CSS refinement.
# Color Palette and Staffbase Mapping

## Brand Palette

| Token | Hex | Intended Use | Official or Estimated | Confidence |
|---|---|---|---|---|
| Primary | #005BBB | Main brand color, CTA, active highlight | Demo sample | High |
| Secondary | #0B1F33 | Structural color, nav depth, dark surfaces | Demo sample | High |
| Accent | #00A6A6 | Accent states, badges, secondary emphasis | Demo sample | High |
| Background | #F4F7FB | App/page background | Demo sample | High |
| Surface | #FFFFFF | Cards, panels, containers | Demo sample | High |
| Text Primary | #16202A | Headings and body text | Demo sample | High |
| Text Secondary | #5F6B7A | Meta text and supporting labels | Demo sample | High |
| Success | #1F9D55 | Positive confirmation states | Demo sample | Medium |
| Warning | #D9822B | Attention / caution states | Demo sample | Medium |
| Error | #C23030 | Error / urgent attention states | Demo sample | Medium |

## Design Tokens

```css
:root {
  --color-primary: #005BBB;
  --color-secondary: #0B1F33;
  --color-accent: #00A6A6;
  --color-bg: #F4F7FB;
  --color-surface: #FFFFFF;
  --color-text: #16202A;
  --color-text-muted: #5F6B7A;
  --color-success: #1F9D55;
  --color-warning: #D9822B;
  --color-danger: #C23030;
  --radius: 14px;
  --shadow: 0 10px 30px rgba(11, 31, 51, 0.08);
}
