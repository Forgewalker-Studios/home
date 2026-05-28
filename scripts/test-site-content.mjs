import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const validJamStatuses = new Set(["scheduled", "current", "voting", "past"]);
const forbiddenPublicTerms = /\b(AI|assisted|human-led|release decisions|editing|edited)\b/i;

await testLocalHtmlLinks();
await testPublicPageCopy();
await testJamData();
await testLeaderboardData();

console.log("Site content checks passed.");

async function testLocalHtmlLinks() {
  const files = (await readdir(root)).filter((file) => file.endsWith(".html"));
  const existing = new Set(files);

  for (const file of files) {
    const html = await readText(file);
    const links = [...html.matchAll(/href="([^"]+\.html)(?:#[^"]*)?"/g)].map((match) => match[1]);

    for (const link of links) {
      assert.ok(existing.has(link), `${file} links to missing local page ${link}`);
    }
  }
}

async function testPublicPageCopy() {
  const publicFiles = (await readdir(root)).filter((file) => file.endsWith(".html"));

  for (const file of publicFiles) {
    assert.equal(forbiddenPublicTerms.test(await readText(file)), false, `${file} contains public process commentary`);
  }
}

async function testJamData() {
  const data = JSON.parse(await readText("content/one-game-a-week-jams.json"));

  assert.equal(data.source_pattern, "https://itch.io/jam/#gameaweek");
  assert.ok(Array.isArray(data.jams), "Jam data must include a jams array");
  assert.ok(data.jams.length >= 4, "Jam data should include the first four One Game a Week jams");

  for (const [index, jam] of data.jams.entries()) {
    const week = index + 1;
    assert.equal(jam.week, week, `Jam week ${week} should be contiguous`);
    assert.equal(jam.url, `https://itch.io/jam/${week}gameaweek`);
    assert.ok(jam.title.includes(`#${week}`), `Jam week ${week} title should include its number`);
    assert.ok(validJamStatuses.has(jam.status), `Jam week ${week} has an invalid status`);
    assert.ok(Date.parse(jam.start_date) < Date.parse(jam.end_date), `Jam week ${week} start must be before end`);
    assert.ok(
      Date.parse(jam.end_date) <= Date.parse(jam.voting_end_date),
      `Jam week ${week} voting end must be after submissions close`
    );

    assert.ok(Array.isArray(jam.top_entries), `Jam week ${week} top entries should be an array`);

    for (const entry of jam.top_entries) {
      assert.match(entry.rank, /^\d+(st|nd|rd|th)$/);
      assert.ok(entry.title, `Jam week ${week} ranked entry must include a title`);
      assert.ok(entry.url.startsWith("https://"), `Jam week ${week} ranked entry must include an absolute URL`);
      assert.ok(entry.thumbnail.startsWith("https://"), `Jam week ${week} ranked entry must include a thumbnail URL`);
    }
  }
}

async function testLeaderboardData() {
  const data = JSON.parse(await readText("content/one-game-a-week-leaderboard.json"));
  const entries = data.leaderboard ?? [];

  assert.ok(Array.isArray(entries), "Leaderboard data must include a leaderboard array");
  assert.ok(entries.length > 0, "Leaderboard data should include at least one entry");

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    assert.ok(entry.username, `Leaderboard entry ${index + 1} must include a username`);
    assert.ok(Number.isFinite(Number(entry.score)), `Leaderboard entry ${index + 1} must include a numeric score`);
    assert.ok(entry.profile_url.startsWith("https://"), `Leaderboard entry ${index + 1} must include a profile URL`);

    if (index > 0) {
      assert.ok(Number(entries[index - 1].score) >= Number(entry.score), "Leaderboard scores should be sorted descending");
    }
  }
}

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}
