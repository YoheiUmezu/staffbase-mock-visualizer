# Apply Notes

## Purpose
This document separates what should be handled through standard Staffbase branding configuration and what may require targeted Custom CSS refinement.

## 1. Branding First Recommendation

### Recommended via Standard Branding
- Main branding color: Northstar Blue (#005BBB)
- Navigation header background: Deep Navy (#0B1F33)
- Navigation header text: White (#FFFFFF)
- Accent color: Teal (#00A6A6)
- Menu bar background and text/icon colors
- Core branded navigation expression across app and intranet

### Recommended via Custom CSS
- Bottom navigation selected state refinement
- Badge styling polish for highlighted and acknowledgement moments
- Optional component-level rounding or emphasis for localized content areas
- Optional widget-level styling where business need justifies it

## 2. Scope of Custom CSS
- Intended areas affected: mobile bottom navigation, badges, optional localized widget/page styling
- Platforms affected: mobile first, optionally browser/desktop if validated
- Whether selector scoping is required: yes, especially for mobile and browser differences
- Whether localized targeting is recommended: yes, for page- or widget-specific styling

## 3. Risk Assessment
- Overall risk: low to medium if limited to tutorial-supported patterns
- Main risk areas: global overrides, incorrect assumptions about target objects, sign-in related styling
- Expected maintenance sensitivity: moderate for localized selectors, low for supported tutorial-style selectors
- Whether post-implementation verification is mandatory: yes

## 4. Validation Checklist
- [ ] Desktop web checked
- [ ] Mobile app checked
- [ ] Header readability checked
- [ ] Menu readability checked
- [ ] CTA contrast checked
- [ ] Badge contrast checked
- [ ] Active states checked
- [ ] No unintended global impact observed
- [ ] Any localized selectors validated
- [ ] Sign-in caveats documented if relevant

## 5. Selector Notes
- Root scoping classes used: .mobile, .native
- Localized selectors used: not activated in the sample, only example patterns shown
- Areas requiring future validation: any plugin/page ID based selector
- Example selectors are clearly marked where applicable: yes

## 6. Sign-In Notes
- No sign-in-specific CSS is included in the active proposal
- If sign-in styling is later added, visual treatment may be proposed, but text/layout changes should be treated as operationally constrained
- Native app rollout implications should be reviewed separately if sign-in changes are considered

## 7. Final Recommendation
- Start with standard branding configuration to establish immediate brand fit
- Apply only the small CSS refinement layer that supports the demo narrative
- Keep all additional selectors clearly commented and validated before platform use
