# paper-notifier

Google Apps Script that emails you once per version when a new PaperMC
release becomes stable.

## How it works

`checkPaper()` runs once a day:

1. `GET https://fill.papermc.io/v3/projects/paper`, collect every version
   matching `^\d+(\.\d+)*$` (drops `-rc`/`-pre`), pick the highest.
2. If it equals the `lastNotifiedVersion` script property, stop.
3. `GET .../versions/<v>/builds?channel=STABLE`. If empty (only ALPHA/BETA),
   stop.
4. Email the first stable build, then store `<v>` as `lastNotifiedVersion`.

A version becomes stable when a new build is published on the STABLE
channel, so missed days only delay the email; they never lose it.

## Setup with clasp

Requires Node.js (`brew install node`).

```sh
npm install -g @google/clasp
```

1. Enable the Apps Script API for your Google account:
   https://script.google.com/home/usersettings
2. Log in (opens a browser; stores tokens in `~/.clasprc.json`, never commit it):
   ```sh
   clasp login
   ```
3. Create the remote project (writes `.clasp.json` with the script ID):
   ```sh
   clasp create --type standalone --title "Paper Notifier" --rootDir src
   git restore src/appsscript.json   # if clasp overwrote the manifest
   ```
4. Push the code:
   ```sh
   clasp push
   ```
5. Open the editor (`clasp open-script`, or `clasp open` on clasp 2.x) and:
   - Run `checkPaper` once and grant the permissions.
   - Run `setup` once to install the daily trigger (~09:00 in the manifest's
     `timeZone`).

Optional: set a `recipient` script property (Project Settings → Script
Properties) to send to an address other than the script owner's.

## Day-to-day

- Edit `src/`, then `clasp push`. The trigger keeps working across pushes.
- Logs: editor → Executions, or `clasp logs`.
- Failures: Google emails a failure summary (configurable per trigger).
- Re-test a notification: delete the `lastNotifiedVersion` property.
