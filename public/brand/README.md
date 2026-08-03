# Sahn brand assets

The mark is an eight-point girih star — the *khātam* — cut from the same
`{8/3}` construction the app draws its doorways with (`src/lib/girih.ts`).
Everything here was generated from that geometry rather than traced, so the
logo and the interface cannot drift apart.

## Files

| File | Use |
|---|---|
| `mark-glaze-on-stone.svg` | App icon, light surfaces |
| `mark-stone-on-ink.svg` | App icon, dark surfaces — the primary |
| `mark-brass-on-ink.svg` | Accent variant, sparingly |
| `mark-glaze.svg` | Transparent, for placing on your own background |
| `wordmark-ink-on-stone.svg` | Horizontal lockup, light |
| `wordmark-stone-on-ink.svg` | Horizontal lockup, dark |
| `wordmark-ar-*.svg` | Arabic lockups (صحن) |

Generated at request time by Next, not committed:

| Route | Output |
|---|---|
| `/icon.svg` | Browser tab favicon |
| `/apple-icon` | 180×180 home-screen icon |
| `/opengraph-image` | 1200×630 link preview |
| `/twitter-image` | Same card for X |

## Palette

```
--ink    #10202B   deep slate-blue, primary dark surface
--stone  #F2EDE4   limewashed plaster, light surface
--glaze  #1F6F6B   glazed teal, primary action  (#2C8D88 on dark)
--brass  #B08A46   accent and highlight only
--clay   #7C4A3B   secondary accent, sparingly
--muted  #6B7B84   captions, metadata, citations
```

## Type

Display is **Fraunces** (Latin) and **IBM Plex Sans Arabic** (Arabic) — Fraunces
has no Arabic glyphs, so Arabic headings take Plex at weight 600 rather than
falling through to a system serif.

## Two things before you hand these to anyone

**The wordmark SVGs reference fonts by name, not outlines.** They render
correctly anywhere Fraunces or IBM Plex Sans Arabic is installed, and fall back
to a generic serif anywhere else. Before sending to a printer, a merch
supplier, or an external designer, open in a vector editor and convert the text
to outlines.

**No favicon `.ico`.** `icon.svg` covers every current browser; only quite old
Windows browsers still need the `.ico`. Worth generating one if analytics show
you need it.
