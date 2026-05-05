
---

## `references/staffbase_branding_mapping_guide.md`

```md
# Staffbase Branding Mapping Guide

## Purpose
Use this guide to convert a customer's brand palette into a practical Staffbase-oriented visual mapping.

The goal is not to force every brand color into the UI.
The goal is to create a branded, realistic, readable, and presentation-ready Staffbase concept.

## Mapping Philosophy

### 1. Brand Recognition Over Literal Reproduction
A successful demo should feel unmistakably aligned with the customer brand, but should not overload the interface with color.

Use a restrained palette:
- one strong primary
- one supporting secondary
- one accent
- calm neutrals
- readable text colors

### 2. Readability Before Decoration
Enterprise UI needs:
- clean surfaces
- stable contrast
- restrained emphasis
- obvious active states
- clear navigation hierarchy

A brand-consistent UI that is hard to read is not successful.

### 3. Branding First, CSS Second
Before proposing CSS, determine which parts can already be expressed through Staffbase branding settings.

## Recommended Palette Structure

| Token | Role | Typical Use |
|---|---|---|
| Primary | Core brand color | CTA, active state, key highlights |
| Secondary | Supporting brand color | secondary emphasis, category tone |
| Accent | Limited emphasis color | badge, alert highlight, selected state |
| Background | App/page background | overall canvas |
| Surface | Cards, panels, sections | content containers |
| Text Primary | Main copy color | headings, body text |
| Text Secondary | Supporting copy | metadata, secondary labels |
| Success | Positive state | success message, read state |
| Warning | Attention state | warning label |
| Error | Negative state | destructive or failed state |

## Staffbase Mapping Areas

### Main Branding Color
Use the most recognizable and versatile brand color.
This should usually be the primary brand color.

### Navigation Header Text
Choose a text color with strong contrast against the navigation header background.

### Navigation Header Background
Prefer a stable brand-neutral or brand-primary option that preserves readability.

### Accent Color
Use for:
- active indicators
- selected navigation state
- emphasis lines
- subtle attention moments

### Bottom Bar
If the mobile experience is a demo priority, make this area feel intentionally branded.
Keep icons and active states highly visible.

### Menu Bar Text / Icons
Text and icons should remain clear under all presentation conditions.
Avoid low-contrast brand-on-brand combinations.

### Menu Bar Background
This should support readability first and brand expression second.

### Menu Bar Accent
Use a focused accent for current state or interaction highlight.

### Navigator Accent
Use only when relevant to the demo scenario.

## Suggested Decision Rules

### If Brand Primary Is Very Dark
- use it for headers, CTA, or menu backgrounds
- pair with light text
- keep surfaces lighter

### If Brand Primary Is Very Bright
- use it more selectively
- consider a darker supporting color for text-heavy navigation areas
- use bright primary for active states and calls to action

### If Brand Has Multiple Strong Colors
- select one dominant primary
- choose one secondary
- reserve the remaining color as a minimal accent only if needed

### If Official Colors Are Unknown
- infer from logo and official website
- label confidence as estimated
- avoid overclaiming accuracy

## Output Template

Use a table like this:

| Staffbase Area | Recommended Color | Hex | Handling Method | Reason |
|---|---|---|---|---|
| Main branding color |  |  | Branding |  |
| Navigation header text |  |  | Branding |  |
| Navigation header background |  |  | Branding |  |
| Accent color |  |  | Branding |  |
| Bottom bar |  |  | Branding / CSS |  |
| Menu bar text/icons |  |  | Branding |  |
| Menu bar background |  |  | Branding |  |
| Menu bar accent |  |  | Branding |  |
| Navigator accent |  |  | Branding / CSS |  |

## Recommended Notes to Add
For each mapping, explain:
- why the color was chosen
- whether it is official or estimated
- whether branding settings are enough
- whether custom CSS may be needed for refinement

## Demo Quality Reminder
The best mapping is the one that helps the customer immediately think:
“This already feels like our company.”

## Sources
- Overview of Branding in App or Intranet  
  https://support.staffbase.com/hc/en-us/articles/207136665-Overview-of-Branding-in-App-or-Intranet
- Custom Branding of Your Staffbase Platform With CSS  
  https://support.staffbase.com/hc/en-us/articles/4410307430034-Custom-Branding-of-Your-Staffbase-Platform-With-CSS
