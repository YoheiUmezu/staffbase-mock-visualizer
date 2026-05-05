## Purpose
This document summarizes the publicly available official guidance relevant to Staffbase branding and Custom CSS proposals.

It is intended to help create safe, presentation-ready, and implementation-aware CSS suggestions for demos, proposals, and workshops.

## Core Principles

### 1. Branding First
Use standard Staffbase branding settings first whenever possible.

Before proposing Custom CSS, first map the customer brand into standard branding areas such as:
- Main branding color
- Navigation header text
- Navigation header background
- Accent color
- Bottom bar
- Menu bar text/icons
- Menu bar background
- Menu bar accent
- Navigator accent when relevant

Custom CSS should only be used to refine or extend what cannot be handled adequately through standard branding settings.

### 2. Custom CSS Is a Secondary Layer
Public Staffbase guidance states that Custom CSS can break the theme or cause unintended display behavior if applied incorrectly.

Therefore:
- keep CSS overrides minimal
- avoid unnecessary global changes
- document the intent of each CSS block
- require visual validation after applying changes

### 3. Scope Selectors Carefully
When proposing Staffbase-compatible CSS, prefer scoped selectors over broad overrides.

Staffbase publicly documents root-level classes that can be used to scope styles by platform, device, browser, or layout condition.

Examples include:
- .ios
- .iphone
- .ipad
- .android
- .web
- .mobile
- .desktop
- .browser
- .native
- .win
- .mac
- .linux
- .chrome
- .safari
- .moz
- .msie
- .retina
- .non-retina
- .wide
- .compact

Use these only where relevant to narrow the impact of style changes.

### 4. Localize Impact Where Possible
If a change is intended for:
- one page
- one post
- one channel
- one plugin/page type
- one menu page

prefer localized targeting rather than wide global overrides.

If necessary, ID-specific selectors may be used to reduce risk and narrow the affected area.

### 5. Prefer Publicly Supported Patterns
When proposing Staffbase Custom CSS:
- prefer selectors and structures visible in Staffbase public support articles
- prefer classes shown in official tutorials
- avoid presenting undocumented internal selectors as verified production-safe selectors
- avoid fragile deep descendant chains whenever possible

### 6. Separate Demo CSS From Staffbase CSS
Always keep the following separate:
1. mock/demo CSS for presentation visuals
2. Staffbase-compatible custom CSS proposal
3. implementation/apply notes

These should never be mixed into one file.

### 7. Sign-In Constraints
Public Staffbase guidance indicates that some sign-in dialog customizations have operational constraints.

Therefore:
- visual styling ideas may be proposed
- text or layout related sign-in changes should be flagged as constrained
- such changes should not be described as simple CSS-only modifications
- native app rollout implications may exist and should be noted

## Recommended Proposal Structure

### A. Standard Branding Mapping
Explain which visual choices can be handled through standard branding configuration.

### B. Custom CSS Proposal
Only after A, provide a small, documented CSS proposal for refinements.

### C. Apply Notes
Add:
- scope notes
- risk level
- validation checklist
- platform considerations
- sign-in caveats if relevant

## Safe Authoring Rules
Use the following writing style in Staffbase CSS proposals:
- small focused blocks
- comments above each rule group
- restrained specificity
- clear separation of platform-specific rules
- explicit statement when a selector is an example or needs validation

## Avoid
- undocumented selector claims
- monolithic CSS dumps without explanation
- mixing mock UI classes into Staffbase production suggestions
- assuming internal DOM stability
- claiming that all demo visuals can be replicated 1:1 through standard branding alone

## Suggested CSS Comment Style

```css
/* Header color refinement for desktop web only */
.desktop.web .example-selector {
  background-color: #123456;
}
Copy
Copy/* Example of localized targeting for a specific content area */
/* Validate the specific page or object ID before applying */
.page.plugin-xxxxxxxx .page-content {
  border-radius: 12px;
}
Validation Checklist
Before considering a proposal usable:

 Desktop appearance checked
 Mobile appearance checked
 Contrast verified
 Header/navigation readability checked
 Active states checked
 No unintended global bleed observed
 Any sign-in related styling clearly caveated
 Branding-first mapping documented
Sources
Overview of Branding in App or Intranet
https://support.staffbase.com/hc/en-us/articles/207136665-Overview-of-Branding-in-App-or-Intranet
Setting Up Custom Styling with CSS
https://support.staffbase.com/hc/en-us/articles/115002858571-Setting-Up-Custom-Styling-with-CSS
Available CSS Selectors
https://support.staffbase.com/hc/en-us/articles/207492945-Available-CSS-Selectors
Custom Branding of Your Staffbase Platform With CSS
https://support.staffbase.com/hc/en-us/articles/4410307430034-Custom-Branding-of-Your-Staffbase-Platform-With-CSS
Customize the Bottom Navigation Bar for Mobile Apps
https://developers.staffbase.com/tutorials/customize-the-bottom-navigation-bar-for-mobile-apps-with-CSS/
Customize Badges
https://developers.staffbase.com/tutorials/customize-badges/
Customize the User Profile Widget
https://developers.staffbase.com/tutorials/customize-user-profile-widget/
Create a Custom Sign-In Dialog
https://developers.staffbase.com/tutorials/custom-sign-in/