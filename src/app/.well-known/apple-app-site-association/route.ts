import { NextResponse } from 'next/server';

/**
 * Universal Links.
 *
 * Without this the emailed sign-in link opens Safari rather than the app, and
 * the person ends up signed in to a browser they were not using. Apple fetches
 * this over https at install time, so it must come from the apex with no
 * redirect, with a JSON content type, and notably WITHOUT a .json extension -
 * the detail most people get wrong.
 *
 * `appID` is TEAMID.BUNDLEID. The team id arrives with the Apple Developer
 * account, so it is read from the environment rather than guessed; until it is
 * set the file serves an empty list, which is the correct answer for "no app
 * claims these links yet".
 */
export const dynamic = 'force-static';

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  const appId = teamId ? `${teamId}.com.sahnai.app` : null;

  return NextResponse.json(
    {
      applinks: {
        details: appId
          ? [
              {
                appIDs: [appId],
                components: [
                  { '/': '/auth/*', comment: 'Sign-in links open the app' },
                  { '/': '/en/*' },
                  { '/': '/ar/*' }
                ]
              }
            ]
          : []
      }
    },
    { headers: { 'content-type': 'application/json' } }
  );
}
