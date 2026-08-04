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

`{{ .ConfirmationURL }}` appears twice: once behind the button, once as
visible text for clients that eat the button. Keep both.

Do not add a background image, a web font, or a tracking pixel. The first two
will not render for most readers, and the third would contradict the privacy
notice in `src/lib/legal.ts`.
