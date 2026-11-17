# Brand Identity and UI Design System

**Brand:** Oak & Pixel  
**Version:** 1.0 working guide  
**Date:** 17 November 2026  
**Authority:** This written specification supersedes inconsistencies in image-generation mockups.

## 1. Brand essence

Oak & Pixel is a website agency with a design voice that mixes **architectural precision** and **editorial restraint**. The public website direction shown in references uses the line **"Every pixel, intentional."**, paired with a clean green/black/white square-mark logo. The CRM is an internal expression of this same identity.

- **Personality:** deliberate, assured, creative, orderly, quietly premium.
- **Promise:** clarity and craftsmanship without unnecessary interface noise.
- **Tone:** concise, calm and useful; avoid inflated corporate language or playful loading jokes.
- **Visual theme:** mineral textures, angular architecture, deep charcoal, refined whites, restrained emerald green.

## 2. NON-NEGOTIABLE RULE: ABSOLUTELY NO CURVED UI CORNERS

**Every interface component has a 0px border radius. No exceptions for cards, buttons, fields, search bars, popovers, menus, dialogs, tags, badges, segmented controls, avatars, navigation, skeletons, tooltips, toasts, calendars or checkboxes.**

- Never use a pill-shaped status, a capsule toggle or a rounded button.
- Prefer square avatar/initial tiles and square notification markers.
- Progress bars have square caps.
- Use straight-line dividers and rectangular highlights.
- Circular chart geometry is not a rounded *component border*, but angular bar charts are preferable when they communicate the metric just as clearly.
- Respect this rule in all third-party widgets, email editor chrome, modal libraries and mobile breakpoints.

Suggested enforcement:

```css
:root { --radius: 0px; }
*, *::before, *::after { border-radius: 0 !important; }
```

For production, use design-system token enforcement as the primary mechanism and the global override as a safeguard. Test third-party/portal-rendered content so the rule does not unintentionally distort external documents.

## 3. Logo and mark usage

The logo from the concepts combines a compact **2 x 2 pixel grid** and the `Oak & Pixel` wordmark. Use approved vector master artwork before final production exports. Preserve spacing and clear space; never stretch, rotate, add gradients to the wordmark or reconstruct a low-quality logo from a screenshot. Place the brand mark consistently in the sidebar/header and sign-in view.

**Do not claim a formal, approved logo master or font license exists from the mockups alone.**

## 4. Color system (implementation proposal, not approved master palette)

The following hex values are **starter tokens** approximating the reference aesthetic. Test contrast and obtain design/owner approval before freezing:

| Semantic token | Dark theme proposal | Light theme proposal |
| --- | --- | --- |
| `--app-bg` | `#071116` | `#F6F8F7` |
| `--surface-1` | `#09171C` | `#FFFFFF` |
| `--surface-2` | `#101F24` | `#EFF3F1` |
| `--text-primary` | `#F5F7F6` | `#10191B` |
| `--text-secondary` | `#B7C2C0` | `#526063` |
| `--border` | `#465357` | `#BBC4C5` |
| `--accent` | `#008B55` | `#006C43` |
| `--accent-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--focus` | `#22C77B` | `#006C43` |
| `--warning` | `#E8AA45` | `#8A5700` |
| `--danger` | `#F27C7C` | `#AB3030` |

Do not use green for every positive-looking object. Green is primarily action, focus or important state. Gray neutrals carry secondary information; amber and red are reserved for relevant warnings/errors. Audit all combinations for WCAG contrast.

## 5. Typography and scale

- **Display/headlines:** refined editorial serif matching the public website and architectural login concepts. *Candidate*: Instrument Serif or another approved licensed family.
- **UI text/body:** neutral, highly legible sans serif. *Candidate*: Inter.
- **Monospace:** only for IDs, invoice numbers and technical metadata where it improves scanning.
- **Scale, proposed:** page heading 32-40px desktop, panel heading 19-22px, body 13-15px, metadata 11-12px, form fields 14px. Avoid oversized text and excessive letter-spacing.
- Use tight, intentional hierarchy; consistent sentence case in content; restrained uppercase eyebrow labels.

## 6. Layout and composition

- Desktop left navigation is a deliberate, sharp-edged **floating rail or expanded floating side panel**, not an unbroken heavy wall.
- Header remains compact. Global search, date, `New`, notifications, theme control and profile are aligned to the same grid.
- Content uses a consistent spacing grid (4px increments; common 8/12/16/24/32px gaps).
- Favor structured tables with a selected-record inspector over scattered decorative cards.
- Thin borders create structure; excessive shadows and glass effects are prohibited.
- Use architectural monochrome/stone imagery in hero bands and login backgrounds, with generous negative space and low visual competition with text.
- Every panel, card, dropdown, tab bar, skeleton and overlay is perfectly rectangular.

## 7. Component specifications

| Component | Required behavior |
| --- | --- |
| Primary button | Solid deep green, square edges, subtle hover shade, visible focus, explicit busy/disabled state |
| Secondary button | Thin outlined rectangle, high-contrast text, square corners |
| Field / search | Border 1px, squared, compact height, label and error outside field where possible |
| Card | Thin border, zero radius, shallow surface contrast, no excessive gradients |
| Table | Flat header, thin row separators, visible selected row, aligned currency and dates |
| Status badge | Rectangular chip, text + tone (not colour alone), no pill shape |
| Popover / modal | Rectangular anchored or centered panel, keyboard trap as required, no corner radius |
| Sidebar | Floating hard-edge container; selected state is a sharp green rectangle |
| Theme toggle | Square segmented control, sun/moon icons, no oval track or circular thumb |
| Toast | Square, concise, dismissible, announced accessibly |
| Skeleton | Square placeholders approximating final text/table structure |
| Progress | Straight bar with squared caps, percentage label |

## 8. Motion system

- **Purpose:** orientation, acknowledgment and continuity, never decoration for its own sake.
- Standard transitions: typically 150-250ms; more complex layout transitions may be slightly longer if usability is improved.
- Animate opacity and transform, not the whole page with heavy filters.
- Sidebar active indicator slides precisely; view transitions use a subtle fade/translate and preserve scroll where appropriate.
- Kanban reorder uses spring-like physics with restrained movement; undo/retry state must be visible after failure.
- Hover states should be tactile but never cause cards to bounce or unexpectedly resize.
- Respect `prefers-reduced-motion`: replace elaborate animations with instant/crossfade states.

## 9. Loading and empty states

- Keep header/sidebar stable during data loading.
- Show skeletons with the same height and density as the content they replace.
- Display useful empty actions such as `Add your first client` or `Connect your Titan mailbox`.
- Never mark a message sent before SMTP acceptance; never mark an invoice paid merely because someone clicked a button.
- Favor readable inline error messages and retry actions over ambiguous spinners.

## 10. Accessibility and themes

Keyboard navigation, robust focus indicators, readable contrast, touch targets, accessible status announcements and reduced motion are mandatory. Persist theme preference per user, fall back to system preference if unset, and initialize theme before first meaningful paint to prevent a light/dark flash.

## 11. Copy standards

Say `New client`, `Send email`, `Save changes`, `Record payment`, `Connection needs attention`, `Message queued` and `No matching clients`. Avoid vague `Submit`, ambiguous `Done`, or overstated `Delivered` when the system only knows SMTP acceptance.

## 12. Quality gate

A component is not done until it works in both modes, at all supported breakpoints, by keyboard, with loading/error/empty states and **0px corner radius**. Visually QA third-party widgets explicitly. The accompanying PNG screenshots are references, not exact executable specifications.
