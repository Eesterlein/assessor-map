# Mobile Friendliness Audit — April 2026

## Fixes Applied

### ResultsDrawer (`packages/map-ui-lib/src/components/ResultsDrawer/ResultsDrawer.tsx`)
- **Header buttons** (columns, export, clear, close): `w-7 h-7` (28px) → `w-8 h-8` with `min-w-[44px] min-h-[44px]` for WCAG touch target compliance.
- **Column reorder arrows** (left/right): `w-4 h-4` (16px) → `w-5 h-5` with `min-w-[28px] min-h-[28px]`. These remain smaller than 44px since they're precision controls in a table header, but now large enough to be usable on touch.
- **Drag handle**: `h-3` (12px) → `h-5` (20px) for easier touch dragging.

### CollapsibleControl (`packages/map-ui-lib/src/components/CollapsibleControl/CollapsibleControl.tsx`)
- **Close button**: `w-6 h-6` (24px) → `w-8 h-8` with `min-w-[44px] min-h-[44px]`.

### SearchPanel (`packages/map-ui-lib/src/components/SearchPanel/SearchPanel.tsx`)
- **Close button**: `p-1` (24px total) → `p-2` with `min-w-[44px] min-h-[44px]` and flex centering.

## Components Reviewed — No Changes

### LayerPanel
- Uses adequate padding (`px-2 py-1.5`), `min-w-0` on flex labels. No mobile issues.

### ImageryPanel
- `min-w-48` (192px) at root. Acceptable — panel is always rendered in a container that constrains width.

### MeasurePanel
- Uses `flex-1` buttons with `px-3 py-1.5`. Adequate touch targets.

### SelectionPanel
- Uses `flex-1` buttons with adequate padding. No issues.

### FeatureTooltip
- `min-w-[140px] max-w-[240px]` — tooltip is a hover/click overlay, not a layout element. Acceptable at 375px.

### InfoModal
- `max-w-[640px] max-h-[80vh]` — at 375px, modal fills width naturally. Acceptable.

## Admin App — Not Fixed (Out of Scope for Lib)

### ConfigWizardPage (`apps/admin-app/src/pages/ConfigWizardPage.tsx`)
- `w-[45%]` preview pane breaks at 375px — needs responsive breakpoint to stack vertically.
- Step progress buttons with `flex-1 whitespace-nowrap` become too narrow on small screens.
- No `md:flex-row` / `flex-col` responsive switch on main layout.
- These are admin-only pages typically used on desktop; fixing deferred as low priority.

## Hardcoded Width Grep Results (Reviewed, No Action)

| File | Pattern | Reason Left |
|------|---------|-------------|
| FeatureTooltip.tsx | `min-w-[140px] max-w-[240px]` | Tooltip overlay, not layout |
| ResultsDrawer.tsx | `min-w-[180px]` on column menu | Dropdown menu, acceptable |
| InfoModal.tsx | `max-w-[640px]` | Responsive at small widths |
