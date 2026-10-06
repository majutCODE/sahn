# Bundled font

`fraunces.ts` holds Fraunces 500 as base64, used by the OG and Twitter image
routes.

It is inlined rather than fetched because a deploy failed when
fonts.googleapis.com was briefly unreachable. satori does not degrade without
a font: with none loaded it throws

    No fonts are loaded. At least one font is required to calculate the layout.

and the prerender failure takes the whole deployment with it. The old code
caught the fetch error, returned null, and then passed an empty font array,
which throws anyway, so the handling was never real.

Reading a .ttf from disk was tried first and does not work here: Next traces
`new URL(..., import.meta.url)` into the bundle, but the URL instance that
crosses the bundler boundary is not the one `node:fs` recognises, so readFile
rejects its own argument type.

Fraunces is licensed under the Open Font License. To change the face,
regenerate `fraunces.ts` from a .ttf rather than editing it by hand.
