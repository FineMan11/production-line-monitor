# Design System — Production Line Monitor

This document is the single source of truth for the UI design of the Production Line Monitor.
All pages and components must follow these guidelines. Tailwind CSS v3 is the only styling tool.

---

## 1. Color Palette & Tokens

### Base Colors

| Token | Tailwind Class | Hex | Usage |
|---|---|---|---|
| `page` | `bg-gray-50` | #F9FAFB | Page background |
| `card` | `bg-white` | #FFFFFF | Card / panel surface |
| `card-hover` | `bg-gray-50` | #F9FAFB | Card hover state |
| `border` | `border-gray-200` | #E5E7EB | Default border |
| `border-strong` | `border-gray-300` | #D1D5DB | Emphasized border |
| `divider` | `divide-gray-100` | #F3F4F6 | Table row dividers |

### Text Colors

| Token | Tailwind Class | Usage |
|---|---|---|
| `text-primary` | `text-gray-900` | Headings, important labels |
| `text-secondary` | `text-gray-600` | Body text, descriptions |
| `text-muted` | `text-gray-400` | Placeholder, disabled, hints |
| `text-on-accent` | `text-white` | Text on teal buttons |

### Accent — Teal

| Token | Tailwind Class | Hex | Usage |
|---|---|---|---|
| `accent` | `bg-teal-600` | #0D9488 | Primary buttons, active nav |
| `accent-hover` | `bg-teal-700` | #0F766E | Button hover |
| `accent-light` | `bg-teal-50` | #F0FDFA | Subtle highlight, selected row bg |
| `accent-border` | `border-teal-500` | #14B8A6 | Focus rings, active borders |
| `accent-text` | `text-teal-600` | #0D9488 | Links, icon accent |
| `accent-text-hover` | `text-teal-700` | #0F766E | Link hover |

### Semantic Status Colors (reserved — not used yet)

| Status | Badge bg | Badge text | Dot |
|---|---|---|---|
| Running | `bg-green-100` | `text-green-800` | `bg-green-500` |
| Maintenance | `bg-orange-100` | `text-orange-800` | `bg-orange-500` |
| Engineering | `bg-blue-100` | `text-blue-800` | `bg-blue-500` |
| Down | `bg-red-100` | `text-red-800` | `bg-red-500` |

### Role Badge Colors

| Role | Classes |
|---|---|
| `admin` | `bg-red-100 text-red-700` |
| `supervisor` | `bg-amber-100 text-amber-700` |
| `line_technician` | `bg-teal-100 text-teal-700` |
| `operator` | `bg-gray-100 text-gray-700` |

---

## 2. Typography Scale

Font family: system default (`font-sans` — Inter/Segoe UI/SF Pro depending on OS).
Use `font-mono` only for IDs, codes, and data values.

| Role | Classes | Size / Weight |
|---|---|---|
| Page title (h1) | `text-xl font-semibold text-gray-900` | 20px / 600 |
| Section heading (h2) | `text-sm font-semibold text-gray-500 uppercase tracking-wider` | 12px / 600, caps |
| Card heading | `text-sm font-semibold text-gray-900` | 14px / 600 |
| Body | `text-sm text-gray-600` | 14px / 400 |
| Label | `text-xs font-medium text-gray-700` | 12px / 500 |
| Muted / hint | `text-xs text-gray-400` | 12px / 400 |
| Badge text | `text-xs font-medium` | 12px / 500 |
| Mono ID | `text-sm font-mono font-medium text-gray-900` | 14px / 500, mono |
| Nav item | `text-sm font-medium` | 14px / 500 |

---

## 3. Component Patterns

### Page Wrapper
```jsx
<div className="min-h-screen bg-gray-50">
  <Navbar title="Page Title" />
  <main className="px-6 py-6 max-w-screen-xl mx-auto">
    {/* content */}
  </main>
</div>
```

---

### Navigation Bar
```jsx
<nav className="bg-white border-b border-gray-200 shadow-sm">
  <div className="px-6 h-14 flex items-center justify-between">
    {/* Left: logo + page title */}
    <div className="flex items-center gap-3">
      <span className="text-teal-600 font-bold text-lg">⬡ Monitor</span>
      <span className="text-gray-300">|</span>
      <span className="text-sm font-medium text-gray-900">{title}</span>
    </div>
    {/* Right: user info */}
    <div className="flex items-center gap-3">
      <RoleBadge role={user.role} />
      <span className="text-sm text-gray-700">{user.username}</span>
      <button className="text-sm text-gray-500 hover:text-gray-800 transition">Sign out</button>
    </div>
  </div>
</nav>
```

---

### Section Header
```jsx
<div className="flex items-center gap-3 mb-3">
  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Section Name
  </h2>
  <div className="flex-1 border-t border-gray-200" />
  <span className="text-xs text-gray-400">12 items</span>
</div>
```

---

### Card
```jsx
// Standard card
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
  {/* content */}
</div>

// Compact card (tester station)
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:border-teal-300 hover:shadow-md transition-all">
  {/* content */}
</div>
```

---

### Buttons

```jsx
// Primary — teal
<button className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
  Submit
</button>

// Secondary — white with border
<button className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition">
  Cancel
</button>

// Ghost — no background
<button className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition">
  View
</button>

// Danger — for destructive actions
<button className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition">
  Delete
</button>
```

---

### Form Inputs

```jsx
// Text / select input
<div className="flex flex-col gap-1">
  <label className="text-xs font-medium text-gray-700">Field Label</label>
  <input
    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
               placeholder:text-gray-400 text-gray-900"
    placeholder="Placeholder text"
  />
</div>

// Select
<select className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                   text-gray-900">
  <option>Option</option>
</select>

// Textarea
<textarea
  rows={3}
  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
             resize-none placeholder:text-gray-400 text-gray-900"
/>

// Error state — add to input
// border-red-400 focus:ring-red-400 focus:border-red-400

// Error message
<p className="text-xs text-red-600 mt-1">Error message here</p>
```

---

### Badges

```jsx
// Type badge (tester type, handler type)
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
  INVTG
</span>

// Role badge
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
  line_technician
</span>

// Status dot + label (reserved for later)
<span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
  <span className="w-2 h-2 rounded-full bg-green-500" />
  Running
</span>
```

---

### Alert / Error Banner
```jsx
<div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
  <span>⚠</span>
  <span>{message}</span>
</div>

// Success
<div className="flex items-start gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700">
  <span>✓</span>
  <span>{message}</span>
</div>
```

---

### Table

```jsx
<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
  {/* Optional filter bar above table */}
  <div className="px-4 py-3 border-b border-gray-100 flex gap-3">
    {/* filter controls */}
  </div>
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition">
        <td className="px-4 py-3 text-gray-900">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### Empty State
```jsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
    <span className="text-gray-400 text-xl">○</span>
  </div>
  <p className="text-sm font-medium text-gray-700">No records yet</p>
  <p className="text-xs text-gray-400 mt-1">Records will appear here once added.</p>
</div>
```

---

### Loading Skeleton
```jsx
// Use for cards while data loads
<div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
</div>
```

---

## 4. Layout & Spacing Rules

### Page Padding
- Top-level `<main>`: `px-6 py-6`
- Narrow pages (login, forms): `max-w-sm` or `max-w-md` centred
- Full pages (dashboard, tables): `max-w-screen-xl mx-auto`

### Grid — Square Monitor (≈1280×1024)
The dashboard tester grid uses CSS auto-fill to pack cards efficiently:
```jsx
// Tester card grid
<div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
```
This produces ~8 columns at 1280px. Adjust `minmax` minimum:
- Compact: `120px` → ~9 cols
- Standard: `140px` → ~8 cols
- Spacious: `160px` → ~7 cols

### Spacing Scale
| Use | Value |
|---|---|
| Between page sections | `mb-8` |
| Between section header and grid | `mb-3` |
| Between cards in a grid | `gap-3` |
| Inside a card | `p-3` (compact) or `p-4` (standard) |
| Between form fields | `gap-4` |
| Between label and input | `gap-1` |
| Inside nav bar | `gap-3` horizontal, `h-14` height |

### Two-Column Layout (e.g. Maintenance page)
```jsx
<div className="flex gap-6 items-start">
  <div className="w-72 flex-shrink-0">  {/* Form panel — fixed width */}
    {/* form */}
  </div>
  <div className="flex-1 min-w-0">     {/* List panel — fills remaining space */}
    {/* table */}
  </div>
</div>
```

### Z-Index Scale
| Layer | Value |
|---|---|
| Base content | `z-0` |
| Sticky headers | `z-10` |
| Dropdowns | `z-20` |
| Modals | `z-50` |

---

## 5. Do's and Don'ts

**Do:**
- Use Tailwind utility classes only — no custom CSS except `index.css` Tailwind directives
- Use `transition` on interactive elements (buttons, cards with hover)
- Use `focus:ring-2 focus:ring-teal-500` on all focusable inputs
- Use semantic section headers to group related content
- Show loading skeletons while data fetches — never show a blank screen

**Don't:**
- Don't use `border-radius` beyond `rounded-xl` for cards (keep it clean, not bubbly)
- Don't use more than 2 font weights in one component (`font-medium` + `font-semibold` is enough)
- Don't use color for the only indicator — always pair color with a label or icon
- Don't add `shadow-lg` or `shadow-2xl` to cards — `shadow-sm` is the standard
- Don't use inline styles (`style={}`) — express everything in Tailwind classes

---

## 6. Phase 2 Patterns — Status, Dropdowns, Modals

### Station Status Colors

Backend sends `color_code` as: `"green"` | `"orange"` | `"blue"` | `"red"`.
Always import from `src/components/dashboard/statusColors.js` — never hardcode these.

| Status      | Border           | Dot            | Label           | Badge bg       |
|-------------|------------------|----------------|-----------------|----------------|
| Running     | `border-green-400`  | `bg-green-500`  | `text-green-800`  | `bg-green-100`  |
| Maintenance | `border-orange-400` | `bg-orange-500` | `text-orange-800` | `bg-orange-100` |
| Engineering | `border-blue-400`   | `bg-blue-500`   | `text-blue-800`   | `bg-blue-100`   |
| Down        | `border-red-400`    | `bg-red-500`    | `text-red-800`    | `bg-red-100`    |

Station card border uses `border-2` with the status border class (replaces the default `border-gray-200`).

---

### Three-Dot Action Dropdown (TesterCard)

```jsx
// Trigger — top-right corner of card
<button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
  ···
</button>

// Panel — absolute, right-0, z-20
<div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200
                rounded-lg shadow-md z-20 py-1">
  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
    Normal Action
  </button>
  <button className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition">
    Warning Action (e.g. Close Maintenance)
  </button>
</div>
```

Rules:
- Wrap dropdown + trigger in `relative` container with a `ref` for click-outside detection.
- Use `useEffect` + `mousedown` listener to close on outside click.
- `z-20` for dropdowns, `z-50` for modals (see Z-Index Scale in section 4).

---

### Modal Overlay

```jsx
// Full-screen overlay — click backdrop to dismiss
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
     onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>

  {/* Modal card */}
  <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900">Modal Title</h3>
      <button className="text-gray-400 hover:text-gray-600 transition text-lg leading-none">✕</button>
    </div>

    {/* Body */}
    <div className="px-4 py-4">
      {/* content */}
    </div>
  </div>
</div>
```

Widths: `max-w-sm` (maintenance form) · `max-w-lg` (history table with `max-h-[90vh] flex flex-col`).

---

### Segmented Control (Issue Type Toggle)

```jsx
<div className="flex rounded-lg border border-gray-300 overflow-hidden">
  {[{ value: 'tester', label: 'Tester Issue' }, { value: 'handler', label: 'Handler Issue' }].map(({ value, label }) => (
    <button
      key={value}
      type="button"
      onClick={() => setIssueType(value)}
      className={`flex-1 py-2 text-xs font-medium transition
        ${issueType === value ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  ))}
</div>
```

---

### Offline Area Handler Pill

```jsx
<div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
    JHT
  </span>
  <span className="text-xs font-mono text-gray-700">JHT-01</span>
</div>
```

---

### Open Maintenance Banner (on TesterCard)

```jsx
{openLog && (
  <div className="mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
    🔧 {openLog.technician}
  </div>
)}
```

Status dot animates with `animate-pulse` when the station has an open maintenance log.
