# Design System Specification

## 1. Overview & Creative North Star
**Creative North Star: The Forensic Archive**

This design system is a departure from the "friendly" SaaS aesthetic. It is a high-precision, editorial framework designed for a clinical AI workspace. It prioritizes data integrity and professional authority over approachability. By merging the starkness of Swiss International Style with the technical rigor of medical documentation, the system achieves a "Forensic Archive" feel—where every pixel is intentional, and every piece of information is treated with gravity.

The design breaks traditional "boxed" layouts by using **Architectural Asymmetry** and **Scale Shock**. By pairing massive, poster-like headings with minute, monospaced metadata, we create a visual tension that feels premium, serious, and undeniably precise.

---

## 2. Colors
The palette is rooted in a "Void Black" environment, using high-chroma accents to guide the eye through complex clinical data.

### The Palette
- **Background**: `#0A0A0A` (The deep canvas)
- **Primary/Accent**: `#FF3D00` (Neon Orange—used for critical actions and data highlights)
- **Foreground**: `#FAFAFA` (High-readability text)
- **Muted/Surface**: `#1A1A1A` (For secondary containers)
- **Borders/Rules**: `#262626` (For architectural definition)

### The "Rule of Rules"
While standard UI relies on shadows for depth, this design system utilizes **Hairline Architecture**. 
- **1px Rule:** Used for structural division. Never use borders to "box in" content; use them as horizontal or vertical axes that extend to the edge of the container.
- **2px Accent Rule:** Reserved exclusively for the `primary` (`#FF3D00`) color to indicate active states, progress, or critical focus points.
- **Tonal Layering:** Depth is achieved by nesting `surface-container` tiers. A `surface-container-low` panel should sit against the `background` to create a subtle shift in "matter" without requiring a drop shadow.

---

## 3. Typography
Typography is the core of this system's editorial identity. We use a high-contrast scale to create a "Poster" effect within a functional workspace.

### The Typefaces
- **Headings (Inter Tight):** High-impact, sharp, and condensed.
- **Data/Labels (JetBrains Mono):** The "Clinical" voice. Used for technical data, labels, and micro-copy.
- **Body (Inter):** Maximum legibility for long-form AI analysis.

### Typography Scale
- **Display LG (128px):** `-0.04em` tracking. Used for hero numbers or section starts.
- **Headline LG (72px):** `-0.02em` tracking. Serious, authoritative section headers.
- **Title MD (1.125rem):** The standard header for cards and modules.
- **Label SM (0.6875rem / JetBrains Mono):** All-caps. Used for technical metadata (e.g., `PATIENT_ID`, `AI_CONFIDENCE_SCORE`).

---

## 4. Elevation & Depth
In a clinical environment, shadows are distracting. We define hierarchy through **Tonal Precision** and **Glass Overlays**.

- **Zero-Shadow Policy:** No component shall cast a blur-based shadow. Importance is dictated by color contrast and rule weight.
- **The Layering Principle:** Use the `surface-container-highest` (`#353534`) to "lift" an element visually. The higher the container tier, the more "important" the data.
- **Clinical Glass:** For floating modals or command palettes, use a `surface` color at 80% opacity with a `20px` backdrop blur. This creates a "frosted lens" effect, suggesting a physical overlay without breaking the sharp, flat aesthetic.
- **Ghost Borders:** For non-interactive containment, use the `outline-variant` (`#5E3F38`) at 20% opacity. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Background `#FF3D00`, Text `#0A0A0A`, moderately rounded (roundedness: 2). Massive impact.
- **Secondary:** 1px Border `#262626`, Text `#FAFAFA`, moderately rounded (roundedness: 2).
- **States:** Hovering over any interactive element should trigger a "Negative" state (Invert background and foreground colors instantly, no easing).

### Input Fields
- **Style:** No four-sided boxes. Use a 1px bottom-border (`#262626`).
- **Focus:** The bottom-border thickens to 2px and shifts to `#FF3D00`. 
- **Label:** Always `Label-SM` (JetBrains Mono) sitting exactly `4px` above the input line.

### Cards & Data Modules
- **Construction:** Moderately rounded corners (roundedness: 2). No dividers between list items.
- **Separation:** Use a `16px` vertical gap or a subtle shift from `surface-container-low` to `surface-container-lowest` to delineate items.
- **Accent Tab:** Every card must have a 2px vertical `primary` rule on the far left or right to signify "Active" or "Selected" status.

### Clinical Data Tables
- **Header:** Background `#1A1A1A`, Text `Label-SM` in JetBrains Mono.
- **Rows:** 1px top-border only. 
- **Asymmetry:** Columns should be weighted—primary data (e.g., Diagnosis) gets 60% of the width, while metadata (e.g., Timestamp) is tucked into the remaining 40%.

---

## 6. Do's and Don'ts

### Do
- **Embrace White Space:** Use the normal margins to let high-density AI data "breathe."
- **Use Vertical Rhythm:** All elements must snap to a `0.35rem` (1px) baseline grid to ensure clinical precision.
- **Align to the Edge:** Let rule lines run to the very edge of the screen to create an expansive, editorial feel.

### Don't
- **Avoid Overly Sharp Angles:** While a clinical feel is key, moderate roundedness (roundedness: 2) should be applied to UI elements for a softer, more professional finish than extreme sharpness.
- **No Gradients:** Avoid decorative color shifts. Gradients are only permitted for subtle glass highlights or the `primary` CTA to provide "soul."
- **No Center Alignment:** Everything should be left-aligned or right-aligned to maintain the asymmetric editorial tension. Center alignment is too "consumer-friendly" for this workspace.

---

## 7. Layout Philosophy: Asymmetric Precision
Avoid the 12-column bootstrap standard. Instead, use a **3-Column Editorial Grid**:
1.  **The Spine (Left):** Narrow (15%). Contains navigation and high-level system status.
2.  **The Canvas (Center):** Wide (60%). The primary diagnostic area.
3.  **The Inspector (Right):** Medium (25%). Technical metadata and AI confidence logs.

This distribution forces the user's eye to prioritize the clinical data while keeping the "Forensic Archive" accessible at the margins.