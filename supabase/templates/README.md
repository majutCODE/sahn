# Auth email templates

These live in Supabase **project settings**, not in the migrations, so
`supabase db push` cannot apply them. They are kept here because otherwise the
only record of what Sahn sends people would be a textarea in a web console.

## Applying a change

Copy the file to the clipboard:

```
pbcopy < supabase/templates/magic-link.html
```

Then in the Supabase dashboard: **Authentication → Emails → Magic Link**,
clear the message body, paste, and save. Set the subject to
`Your sign-in link for Sahn`.

Send yourself a link afterwards and check where it lands — the template
respects the project's redirect configuration rather than hardcoding a URL,
and that configuration has pointed at localhost before.

## Editing rules

The files contain no comments on purpose: everything in them is pasted
verbatim into an email.

Email HTML is deliberately old-fashioned — tables, inline styles, no
stylesheet — because a meaningful share of clients strip `<style>` blocks. The
call to action is a real `<a>` styled as a button, so it stays clickable when
the styling is stripped entirely.

The links deliberately do **not** use `{{ .ConfirmationURL }}`. That resolves
to the project's `*.supabase.co` verify endpoint, so a sign-in email would ask
people to click a link on a domain they have never heard of — which is what
phishing looks like. Instead they use:

```
{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink
```

`.RedirectTo` is the callback URL the app requested, already carrying
`?next=/<locale>`, so the whole email stays on sahn-ai.com and the reader's
language is preserved. The `token_hash` branch in
`src/app/auth/callback/route.ts` is what consumes it — if that branch is ever
removed, these emails stop working.

Keep the file pure ASCII. The dashboard field did not round-trip an em dash
in a real send - it arrived as a mojibake byte - so use `-` and HTML entities
such as `&middot;` rather than the characters themselves.

Do not add a background image, a web font, or a tracking pixel. The first two
will not render for most readers, and the third would contradict the privacy
notice in `src/lib/legal.ts`.
