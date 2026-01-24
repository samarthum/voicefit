# VoiceFit Mobile UI Upgrade Spec (Tailored to Web UI)

Goal: Bring the Expo mobile UI to parity with the web app's polished look and feel while keeping a native mobile experience. This spec is derived from the current web design tokens, fonts, and component styles in the repo.

Status: Draft
Owner: TBD
Last Updated: Jan 24, 2026

---

## 0. Source of Truth (Repo References)

- Web design tokens and animations: `apps/web/app/globals.css`
- Web fonts: `apps/web/app/layout.tsx`
- Web UI primitives: `apps/web/components/ui/*.tsx`
- Web command center: `apps/web/components/conversation-input.tsx`
- Web cards: `apps/web/components/today-summary-card.tsx`, `apps/web/components/weekly-trends-card.tsx`, `apps/web/components/meal-card.tsx`
- Mobile current UI: `apps/mobile/components/*`, `apps/mobile/app/(tabs)/*`
- Mobile theme config: `apps/mobile/tailwind.config.js`

---

## 1. Objectives

- Match the web UI's visual polish (typography, color, depth, motion).
- Keep mobile-native ergonomics (touch targets, navigation patterns).
- Create a reusable mobile design system to reduce per-screen styling.
- Improve perceived quality without changing feature behavior.

Non-goals:
- Copy web layouts 1:1.
- Add new product features.

---

## 2. Key Gap Summary (Current Mobile vs Web)

- Colors: mobile uses default shadcn HSL palette, not web's green/blue/orange system.
- Typography: mobile uses system font only; web uses DM Sans + Instrument Serif.
- Components: web uses layered cards, gradients, and polished buttons; mobile uses basic utility styles.
- Iconography: mobile relies on emoji and mixed fallback icons.
- Motion: web has custom animations; mobile has minimal transitions.

---

## 3. Visual System Alignment (Exact Web Tokens)

### 3.1 Fonts (from `apps/web/app/layout.tsx`)

Web uses:
- DM Sans (weights 400, 500, 600, 700) as `--font-sans`
- Instrument Serif (weight 400, normal + italic) as `--font-display`
- JetBrains Mono as `--font-mono`

Mobile requirements:
- Load DM Sans, Instrument Serif, JetBrains Mono via `expo-font`.
- Expose as `fontFamily` tokens in NativeWind so class names match web intent.
- Use display font for headlines (titles), sans for body, mono for metric numbers when needed.

### 3.2 Color Tokens (from `apps/web/app/globals.css`)

Light theme:
- background: #f8fafc
- foreground: #1f2937
- card: #ffffff
- card-foreground: #1f2937
- popover: #ffffff
- popover-foreground: #1f2937
- primary: #16a34a
- primary-foreground: #f0fdf4
- secondary: #3b82f6
- secondary-foreground: #eef2ff
- muted: #f1f5f9
- muted-foreground: #6b7280
- accent: #f97316
- accent-foreground: #7c2d12
- destructive: #ef4444
- border: rgba(15, 23, 42, 0.12)
- input: rgba(15, 23, 42, 0.08)
- ring: rgba(22, 163, 74, 0.25)
- success: #22c55e
- warning: #f59e0b
- chart-1: #f97316
- chart-2: #22c55e
- chart-3: #3b82f6
- chart-4: #a855f7
- chart-5: #f472b6
- breakfast: #f97316
- lunch: #22c55e
- dinner: #3b82f6
- snack: #a855f7

Dark theme (optional, from web):
- background: #0a0a0b
- foreground: #fafafa
- card: #1a1a1d
- card-foreground: #fafafa
- popover: #141416
- popover-foreground: #fafafa
- primary: #22c55e
- primary-foreground: #0a0a0b
- secondary: #3b82f6
- secondary-foreground: #f8fafc
- muted: #141416
- muted-foreground: #a1a1aa
- accent: #f97316
- accent-foreground: #0a0a0b
- destructive: #ef4444
- border: rgba(255, 255, 255, 0.06)
- input: rgba(255, 255, 255, 0.08)
- ring: rgba(34, 197, 94, 0.45)
- success: #22c55e
- warning: #f59e0b

Mobile alignment rule:
- Update `apps/mobile/tailwind.config.js` to use these exact values.
- Preserve alpha colors as rgba strings for border/input/ring.

### 3.3 Radius (from web `--radius: 0.9rem`)

Derived radii (approx):
- sm: 10
- md: 12
- lg: 14
- xl: 18
- 2xl: 22
- 3xl: 26
- 4xl: 30

Mobile rule:
- Use lg/2xl for cards, xl for inputs/buttons, full for pills.

### 3.4 Shadow and Depth (from web components)

Web components use layered shadows:
- Card: `shadow-lg shadow-primary/8`
- Button primary: `shadow-md shadow-primary/20`
- Input: `shadow-sm`

Mobile mapping:
- iOS: use shadowColor (primary for emphasis) and soft radii.
- Android: use elevation 2/6/12 with subtle border.

### 3.5 Surface Effects (from `globals.css`)

Glass panel (web):
- background: rgba(255, 255, 255, 0.72)
- border: 1px solid var(--border)
- blur: 16px

Ambient glow (web):
- radial gradient green glow, 320px circle, 0.15 alpha, blur 8

Gradient mesh background (web):
- 4 radial gradients + base background

Mobile guidance:
- Use semi-transparent card surfaces; optional `expo-blur` for glass.
- Use gradient backgrounds sparingly on Home and command center.

### 3.6 Motion Easing (from `globals.css`)

Web easings:
- --ease-organic: cubic-bezier(0.34, 1.56, 0.64, 1)
- --ease-soft: cubic-bezier(0.4, 0, 0.2, 1)
- --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)

Web animations:
- fade-up 0.5s ease-soft
- fade-in 0.3s ease-soft
- pulse-ring 1.5s ease-out infinite
- pulse-soft 1.6s ease-in-out infinite
- shimmer 1.6s linear infinite

Mobile guidance:
- Implement similar timing with Reanimated or Animated.

### 3.7 Layout Spacing (from web components)

Common web spacing values to mirror:
- Page horizontal padding: 16 (mobile already uses 16)
- Card internal padding: `px-6` (24), `py-7` (28)
- Section gaps: 12-16
- Pills: `px-3 py-1.5` for small chips
- Lists: vertical gap 12

Mobile rule:
- Use 16 as default page padding, 24 inside cards, 12 between list items.

---

## 4. Mobile Theme and Token Implementation

### 4.1 Tailwind Config (NativeWind)

Update `apps/mobile/tailwind.config.js`:
- Replace `colors` with exact web tokens above.
- Add semantic colors: `accent`, `warning`, `success`, `breakfast`, `lunch`, `dinner`, `snack`, `chart-1`..`chart-5`.
- Add `border` and `input` as rgba strings.
- Add `radius` tokens and `fontFamily` entries for DM Sans, Instrument Serif, JetBrains Mono.
 - Remove current default HSL palette and `fontFamily.sans = ["System"]`.

Example mapping (values must match web):
- `primary.DEFAULT = "#16a34a"`
- `secondary.DEFAULT = "#3b82f6"`
- `accent.DEFAULT = "#f97316"`
- `muted.DEFAULT = "#f1f5f9"`
- `border = "rgba(15, 23, 42, 0.12)"`

### 4.2 Font Loading

Add font loading in `apps/mobile/app/_layout.tsx`:
- Use `expo-font` to load:
  - DMSans-Regular/Medium/SemiBold/Bold
  - InstrumentSerif-Regular/Italic
  - JetBrainsMono-Regular
- Ensure `fontFamily` tokens align with the Tailwind config.

---

## 5. Component System (Mobile)

Create `apps/mobile/components/ui` with styles that mirror web primitives.

### 5.0 Web Primitive Style Map (Exact Classes)

Use these as the source for mobile equivalents:

- Card (`apps/web/components/ui/card.tsx`):
  - `bg-gradient-to-br from-card via-card to-card/95`
  - `rounded-2xl border border-border/60`
  - `py-7 shadow-lg shadow-primary/8`
  - `hover:shadow-xl shadow-primary/8` (no hover on mobile, use slight elevation)

- Button (`apps/web/components/ui/button.tsx`):
  - Base: `rounded-xl text-sm font-medium transition-all duration-200`
  - Primary: `bg-primary text-primary-foreground shadow-md shadow-primary/20`
  - Active: `active:scale-[0.98]`
  - Sizes: `h-10 px-5`, `h-12 px-8` for lg

- Input (`apps/web/components/ui/input.tsx`):
  - `h-11 rounded-xl border px-4`
  - `bg-background/80 backdrop-blur-sm`
  - `shadow-sm transition-all duration-200`
  - Focus ring: `focus-visible:ring-[3px] ring-ring/50`

- Badge (`apps/web/components/ui/badge.tsx`):
  - `rounded-full border px-3 py-1 text-xs font-medium`
  - Gradient backgrounds for variants

- Tabs (`apps/web/components/ui/tabs.tsx`):
  - List: `rounded-xl p-1.5 bg-muted/60 shadow-inner`
  - Trigger: `rounded-lg px-4 py-2.5 text-sm font-medium`

- Progress (`apps/web/components/ui/progress.tsx`):
  - `h-3 rounded-full bg-muted/60`
  - Indicator: gradient `from-primary to-primary/80`

These class patterns should be translated to NativeWind + RN styles.

### 5.1 Button (match `apps/web/components/ui/button.tsx`)

Variants:
- default: green primary with soft shadow and slight scale on press
- secondary: blue gradient
- outline: border with muted background
- ghost: transparent with hover/press background
- destructive: red gradient

Sizes:
- sm: 36 height, rounded-lg
- md: 40-44 height, rounded-xl
- lg: 48 height, rounded-xl

States:
- disabled opacity 50%
- loading shows spinner

### 5.2 Card (match `apps/web/components/ui/card.tsx`)

Style:
- Background gradient from `card` to `card/95`
- Border: `border` at 60%
- Radius: 2xl
- Shadow: soft, with subtle primary tint

### 5.3 Input (match `apps/web/components/ui/input.tsx`)

Style:
- Height 44
- Rounded-xl
- Background `background/80`
- Border `border`
- Focus ring with `ring`
- Placeholder `muted-foreground`

### 5.4 Badge (match `apps/web/components/ui/badge.tsx`)

Variants:
- default: primary gradient
- secondary: secondary gradient
- destructive: red gradient
- outline: muted background
- meal types: breakfast, lunch, dinner, snack gradients

### 5.5 Progress

Style:
- Height 6
- Rounded-full
- Background muted/60
- Indicator gradient from primary to primary/80

### 5.6 Tabs (match `apps/web/components/ui/tabs.tsx`)

Style:
- Pills with rounded-lg
- Active state: card background, slight shadow
- Inactive: muted with subdued text

### 5.7 Sheet / Bottom Sheet

Match web sheet overlay:
- Dimmed overlay: black/50
- Content surface: card background, top radius 24
- Handle indicator muted

### 5.8 Skeleton

Add shimmer skeletons (match web shimmer behavior).

---

## 6. Command Center (Conversation Input)

Reference: `apps/web/components/conversation-input.tsx`

Mobile target:
- Glass panel look:
  - `bg-card/95` + `border-border/70`
  - `backdrop-blur-2xl` (approx via blur or semi-opaque surface)
- Ambient glow behind mic button:
  - Green radial `rgba(34,197,94,0.35)` to transparent
- Shadow:
  - Collapsed: `shadow-[0_-4px_18px_rgba(15,23,42,0.1)]`
  - Expanded: `shadow-[0_-8px_28px_rgba(15,23,42,0.12)]`
- Collapsed state with hint text and mic button.
- Expanded state with:
  - Header row: sparkles icon + "Command Center"
  - Suggestion pills (Meal/Workout/Steps/Weight) styled as:
    - `rounded-full border border-border/60 bg-muted/60 text-muted-foreground`
  - Text input with embedded mic + send:
    - `rounded-2xl bg-background border border-border/70`
    - Placeholder in `muted-foreground/60`
  - Status text row with pulse dot

Key details to match:
- Animation between collapsed and expanded (ease-organic).
- Mic button states (recording vs idle).
- Progress text while transcribing/interpreting.

---

## 7. Screen-Specific Design Alignment

### 7.1 Home (mobile files: `apps/mobile/app/(tabs)/(home)/*`)

- Match web card styling:
  - `border-border/60`, `bg-card/70`, `rounded-2xl`, `shadow-lg shadow-primary/8`
- Consider a subtle gradient mesh background on the Home screen to mirror web:
  - Green/blue/orange/purple radial gradients over `background`.
- TodaySummaryCard specifics (from web):
  - Add glow blobs: `bg-emerald-500/10` (top right) and `bg-purple-500/10` (bottom left).
  - Calories panel uses `bg-muted/40`, label `text-[11px] uppercase tracking-[0.2em]`.
  - Steps panel uses `bg-card/60`, emerald icon tile, shimmer state when loading.
  - Weight panel uses blue accent and subtle gradient divider line.
  - Progress bars: `h-1.5` with gradient indicator (orange for calories, emerald for steps).
- WeeklyTrendsCard specifics (from web):
  - Tabs are pill-style: `rounded-full border border-border/60 bg-card/70`.
  - Chart colors:
    - Calories: `accent` (#f97316)
    - Steps: `success` (#22c55e)
    - Weight: `#1d4ed8`
    - Workouts: emerald pills with check icon
  - Chart styling:
    - Stroke width 3
    - Dot radius 4, active dot 6
    - Axis tick size 11 with muted foreground
  - Workouts tab uses 7-cell grid with `rounded-2xl border border-border/60 px-2 py-3`.

### 7.2 Meals (mobile files: `apps/mobile/app/(tabs)/(meals)/*`, `apps/mobile/components/meal-card.tsx`)

- Replace emoji icons with Lucide + meal badge.
- Match web meal card styling (from `apps/web/components/meal-card.tsx`):
  - Card: `border-border/60 bg-card/70`
  - Badge: `text-[10px] px-2 py-0.5`
  - Calories: number in orange (`text-orange-300`) + `kcal` in muted text
  - Metadata row: `text-xs muted`, separated by dot
- Add subtle elevation on press (no hover on mobile).

### 7.3 Workouts (mobile files: `apps/mobile/app/(tabs)/(workouts)/*`, `apps/mobile/components/workout-set-card.tsx`)

- Session cards:
  - Title with `font-semibold`, time in muted small text.
  - Set count pill: `bg-primary/10 text-primary` similar to web.
- Detail view:
  - Section headers should use `bg-muted` strip and `border-border/60`.
  - Exercise cards should follow card styling and spacing from web.
- Set rows:
  - Use pill badge for exercise type.
  - Replace emoji badges with accent colors (cardio = orange, resistance = blue).

### 7.4 Metrics (mobile files: `apps/mobile/app/(tabs)/(metrics)/*`)

- Summary tiles:
  - Match TodaySummaryCard sub-panels (`bg-card/60`, border/60, rounded-2xl).
  - Use consistent icon tiles for weight/steps (blue and emerald).
- History list:
  - Use list item rows with right-aligned value stacks.
  - Muted label (text-xs) above value.

### 7.5 Settings (mobile files: `apps/mobile/app/(tabs)/(settings)/*`)

- Account card:
  - Circle avatar with initials and `bg-primary/10`.
  - Name `font-semibold`, email muted.
- Goals section:
  - Inputs use shared Input styling (rounded-xl, border/60, background/80).
  - Helper text uses `text-xs muted`.
- Buttons:
  - Save uses primary button style.
  - Sign out uses destructive outline (border + text red).

### 7.6 Navigation (mobile file: `apps/mobile/app/(tabs)/_layout.tsx`)

- Tab bar active tint should use `primary` (#16a34a), not blue.
- Inactive tint should use `muted-foreground` (#6b7280).
- Background `#ffffff`, border `rgba(15, 23, 42, 0.12)`.
- Icon size 24, label size 11, weight 500.

---

## 8. Iconography Plan

Web uses Lucide (see `apps/web/components/*`).

Mobile actions:
- Add lucide-react-native for consistent icons.
- Replace emoji usage in:
  - `apps/mobile/components/meal-card.tsx`
  - `apps/mobile/components/workout-set-card.tsx`
  - `apps/mobile/components/conversation-input.tsx`
  - Empty state icons across screens

Tab icons:
- Keep SF Symbols on iOS via expo-symbols.
- Use lucide-react-native on Android for consistent fallback.

---

## 9. Motion and Feedback

Add:
- Fade-in on screen load (250-300ms, ease-soft).
- Pulse ring on mic idle (1.5s).
- Recording state pulse or scale.
- Shimmer skeleton for loading panels.
- Bottom sheet open/close spring.

---

## 10. Implementation Plan (Phased)

Phase A: Tokens + Fonts
- Update `apps/mobile/tailwind.config.js` with web tokens.
- Load fonts in `apps/mobile/app/_layout.tsx`.
- Verify `font-display` and `font-sans` usage in new components.

Phase B: UI Primitives
- Build Button, Card, Input, Badge, Progress, Tabs, Skeleton.
- Migrate existing screens to use primitives.

Phase C: High-Impact Screens
- ConversationInput
- Home cards
- Meals list
- Workouts list + detail

Phase D: Remaining Screens and Polish
- Metrics
- Settings
- Motion refinements
- Icon replacement

---

## 11. Acceptance Criteria

- Colors match web token values exactly.
- Typography uses DM Sans + Instrument Serif on mobile.
- Primary components (Card, Button, Input) visually match web.
- Emoji icons removed from primary UI.
- Motion parity for recording and sheet transitions.

## 11.1 Design QA Checklist

- Home: card shadows and glows visible on both iOS and Android.
- Meals: badge colors match meal type tokens; calorie count styling matches web.
- Workouts: set type badges use orange/blue accents.
- Metrics: summary tiles align with Home panels.
- Settings: inputs match web input height and radius.
- Command center: glass panel look and mic pulse present.

---

## 12. Open Questions

- Should mobile support dark mode now or stay light-only?
- Do we want Instrument Serif for headings on mobile, or a lighter serif-only usage?
- Should we add `expo-blur` and `expo-linear-gradient` to match glass and gradients?

---

## 13. Checklist

- [ ] Tokens updated in `apps/mobile/tailwind.config.js`
- [ ] Fonts loaded and mapped
- [ ] UI primitives created
- [ ] Command center redesigned
- [ ] Home updated
- [ ] Meals updated
- [ ] Workouts updated
- [ ] Metrics updated
- [ ] Settings updated
- [ ] Icons standardized
- [ ] Motion pass complete
