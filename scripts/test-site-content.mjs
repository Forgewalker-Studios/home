import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const validJamStatuses = new Set(["scheduled", "current", "voting", "past"]);
const forbiddenPublicTerms = /\b(AI|assisted|human-led|release decisions|editing|edited)\b/i;

await testLocalHtmlLinks();
await testPublicPageCopy();
await testJamData();

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
  }
}

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}
