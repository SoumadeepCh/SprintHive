# Design System Strategy: The Tactile Ink-Press

## 1. Overview & Creative North Star
**Creative North Star: "The Analog Disruptor"**

This design system rejects the "safe" polish of modern SaaS interfaces in favor of a raw, high-impact aesthetic rooted in the golden age of print comics and the defiant spirit of Neo-Brutalism. By treating the digital screen like a heavy-duty matte cardstock, we create an experience that feels physically stamped rather than rendered.

The system breaks the "template" look through **Extreme Tactile Contrast**. We use intentional asymmetry and "over-inked" strokes to create a signature visual rhythm. While standard UI hides behind soft blurs and subtle transitions, this system screams with clarity, utilizing a "Flat-Stack" architecture where depth is communicated through hard-edged offsets rather than light and shadow.

---

## 2. Colors & Surface Logic
Our palette is a digital reimagining of the CMYK process. Colors are unapologetically bold and high-saturation, grounded by a solid off-white base that mimics unbleached paper.

*   **Primary (`#fde400`):** The "Cyber-Yellow." Used for high-action triggers and critical focal points.
*   **Secondary (`#00eefc`):** The "Electric Cyan." Used for supportive interactive elements.
*   **Tertiary (`#ff81f5`):** The "Shock Magenta." Reserved for accents, highlights, and "pop" moments.
*   **Neutral/Surface (`#f6f6f6`):** The "Matte Canvas." All surfaces must feel opaque and non-reflective.

### The "Impact Border" Rule
Forget 1px lines. Every functional container (cards, buttons, inputs) must be bound by a minimum **4px solid black stroke** (`on_surface`). This mimics the "Keyline" in comic printing.

### Surface Hierarchy & Nesting
Instead of using shadows to lift objects, we use **Tonal Offsets**. 
*   Place a `surface_container` card onto a `surface` background.
*   The "lift" is achieved by a **Flat Offset Shadow**: A solid block of `inverse_surface` (Black) shifted 4px to 8px bottom-right.
*   **Strict Matte Policy:** Gradients, transparency, and backdrop blurs are strictly prohibited. Every color must be a "flat ink" fill.

---

## 3. Typography: The Inktrap Authority
Typography is treated as a structural element, not just content. We use high-contrast scales to ensure the "Editorial" feel.

*   **Display & Headlines (Space Grotesk):** Chosen for its deep inktraps and aggressive terminals. At `display-lg` (3.5rem), the font feels like a masthead. Headlines should use `extra-bold` weights to compete with the heavy 4px borders.
*   **Body & Titles (Plus Jakarta Sans):** A clean, geometric sans-serif that maintains legibility against high-contrast backgrounds. 
*   **The "Print Scale" Effect:** Use `label-sm` for micro-copy to mimic "Fine Print" at the bottom of a comic page, creating a sophisticated hierarchy between the loud headlines and the functional data.

---

## 4. Elevation & Depth: The Flat-Stack Principle
In this system, "Up" does not mean "Closer to the light." It means "More Ink."

*   **The Layering Principle:** Depth is achieved by stacking opaque planes. A `surface_container_highest` element is perceived as "higher" because it sits on top of a `surface_container_low` base, separated by a mandatory 4px black border.
*   **Hard-Edge Shadows:** Shadows are never blurred. Use a solid fill of `#0e0e0e` at 100% opacity. 
    *   *Standard elevation:* 4px x 4px offset.
    *   *High-impact elevation (Hero Cards):* 8px x 8px offset.
*   **Zero-Blur Glass:** Do not use glassmorphism. If an element needs to "float," it must be a solid matte block with a heavy flat shadow, suggesting a physical object resting on the page.

---

## 5. Components

### Buttons
*   **Primary:** `primary_container` fill, 4px black border, 4px black flat shadow. On hover, the shadow disappears and the button "pushes" down (translate 4px, 4px).
*   **Secondary:** `secondary_container` fill, 4px black border, 4px black flat shadow.
*   **Tertiary:** No fill, 4px black border, text in `on_surface`.

### Input Fields
*   **State:** Large 1.4rem padding (`spacing.4`). 
*   **Border:** 4px solid black.
*   **Focus State:** The border remains black, but the background shifts to `primary_fixed_dim`. This "ink-soak" effect provides clear feedback without using glows.

### Cards
*   **No Dividers:** Never use lines to separate content within a card. Use "Color Blocking"—fill a sub-section of the card with `surface_container_high` to create a distinct zone.
*   **Padding:** Use a generous `spacing.6` (2rem) to give the bold typography room to breathe.

### Chips
*   **Style:** Rectangular only (`0px` radius). Heavy 2px borders. Use `tertiary_fixed` for selected states to create a "highlighted with a marker" effect.

### Selection Controls
*   **Checkboxes/Radios:** Large, 24px x 24px squares. Checked state is a solid `primary` fill with a heavy black "X" or "Dot" icon. No soft transitions—states should "snap" instantly.

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace asymmetry. Offset your headers or containers by a few pixels to break the "perfect digital grid."
*   **Do** use `0px` border-radius for everything. Sharp corners emphasize the brutalist, architectural nature of the design.
*   **Do** treat white space as "gutter" space. Use `spacing.8` and `spacing.12` to create clear breaks between story beats (sections).

### Don't
*   **Don't** use 1px lines. If it's a border, it's 4px. If it's a divider, use a `surface-container` shift.
*   **Don't** use "Grey." Use the palette's surface tones. If you need a disabled state, use `outline_variant` with a heavy diagonal "hatch" pattern (mimicking print textures).
*   **Don't** use animations that "fade." Use "Snap" or "Pop" transitions (0ms - 100ms duration) to maintain the tactile, mechanical feel.