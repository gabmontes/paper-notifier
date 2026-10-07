/**
 * Paper stable release notifier.
 *
 * Once a day, finds the newest plain Paper version (no -rc / -pre suffix) and,
 * if it has at least one STABLE build and hasn't been notified yet, sends an
 * email. The last notified version is kept in Script Properties.
 */

const API = 'https://fill.papermc.io/v3/projects/paper';
const UI = 'https://fill-ui.papermc.io/projects/paper';
const LAST_NOTIFIED_KEY = 'lastNotifiedVersion';
const RECIPIENT_KEY = 'recipient';
const TRIGGER_HOUR = 9; // Hour of day in the project's timeZone (appsscript.json).

/** Entry point for the daily trigger. */
function checkPaper() {
  const props = PropertiesService.getScriptProperties();
  const version = latestPlainVersion(fetchJson(API));
  if (!version) {
    console.log('No plain version found.');
    return;
  }

  const lastNotified = props.getProperty(LAST_NOTIFIED_KEY);
  if (version === lastNotified) {
    console.log(`${version} already notified.`);
    return;
  }

  const build = firstStableBuild(
    fetchJson(`${API}/versions/${encodeURIComponent(version)}/builds?channel=STABLE`)
  );
  if (!build) {
    console.log(`${version} has no STABLE build yet.`);
    return;
  }

  sendNotification(version, build, props.getProperty(RECIPIENT_KEY));
  props.setProperty(LAST_NOTIFIED_KEY, version);
  console.log(`Notified ${version} (build #${build.id}).`);
}

/** Run once manually: (re)installs the daily trigger for checkPaper. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'checkPaper')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkPaper').timeBased().everyDays(1).atHour(TRIGGER_HOUR).create();
  console.log(`Daily trigger installed (~${TRIGGER_HOUR}:00).`);
}

/** Highest version across all families that matches ^\d+(\.\d+)*$ (excludes rc/pre). */
function latestPlainVersion(project) {
  const plain = Object.values(project.versions)
    .flat()
    .filter((v) => /^\d+(\.\d+)*$/.test(v));
  plain.sort(compareVersions);
  return plain.length ? plain[plain.length - 1] : null;
}

/** Earliest STABLE build (lowest id), or null. */
function firstStableBuild(builds) {
  const stable = builds.filter((b) => b.channel === 'STABLE');
  if (!stable.length) return null;
  return stable.reduce((a, b) => (b.id < a.id ? b : a));
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function fetchJson(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error(`GET ${url} -> HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0, 200)}`);
  }
  return JSON.parse(res.getContentText());
}

function sendNotification(version, build, recipient) {
  const to = recipient || Session.getEffectiveUser().getEmail();
  const download = build.downloads && build.downloads['server:default'];
  const lines = [
    `Paper ${version} is now stable.`,
    '',
    `First stable build: #${build.id} (${build.time})`,
    download ? `Download: ${download.url}` : null,
    `Builds: ${UI}`,
  ].filter((l) => l !== null);
  MailApp.sendEmail(to, `Paper ${version} is stable`, lines.join('\n'));
}
