import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const sourceUrl = process.env.ITCH_PROFILE_URL || "https://forgewalkerstudios.itch.io/";
const sourceHost = new URL(sourceUrl).host;
const outputPath = process.env.ITCH_PROJECTS_OUTPUT
  ? pathToFileURL(process.env.ITCH_PROJECTS_OUTPUT)
  : new URL("../content/forgewalker-itch-projects.json", import.meta.url);

const response = await fetch(sourceUrl, {
  headers: {
    "user-agent": "ForgeWalker Studios homepage project updater"
  }
});

if (!response.ok) {
  throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
}

const html = await response.text();
const projects = extractProjects(html);

await mkdir(new URL("../content/", import.meta.url), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source_url: sourceUrl,
      generated_at: new Date().toISOString(),
      projects
    },
    null,
    2
  )}\n`
);

console.log(`Wrote ${projects.length} itch.io project(s) from ${sourceHost}.`);

function extractProjects(sourceHtml) {
  const projects = [];
  const titlePattern = /<a\b(?=[^>]*class="[^"]*\btitle\b[^"]*")[^>]*>([\s\S]*?)<\/a>/gi;
  const matches = [...sourceHtml.matchAll(titlePattern)];

  matches.forEach((match, index) => {
    const anchorHtml = match[0];
    const title = cleanText(match[1]);
    const url = absolutizeUrl(decodeHtml(anchorHtml.match(/\bhref="([^"]+)"/i)?.[1] ?? ""));
    const cellStart = sourceHtml.lastIndexOf("<div", match.index);
    const nextMatchIndex = matches[index + 1]?.index ?? sourceHtml.indexOf('<div class="footer"', match.index);
    const cell = sourceHtml.slice(Math.max(cellStart, 0), nextMatchIndex > -1 ? nextMatchIndex : undefined);

    if (!title || !url || new URL(url).host !== sourceHost) {
      return;
    }

    projects.push({
      title,
      slug: getSlug(url),
      url,
      description: extractDescription(cell),
      cover_image: extractCoverImage(cell),
      genre: extractClassText(cell, "game_genre"),
      category: extractClassText(cell, "game_category")
    });
  });

  return dedupeProjects(projects);
}

function extractDescription(cell) {
  const titleAttribute = cell.match(/class="[^"]*\bgame_text\b[^"]*"[^>]*title="([^"]*)"/i)?.[1];

  if (titleAttribute) {
    return cleanText(titleAttribute);
  }

  return extractClassText(cell, "game_text");
}

function extractCoverImage(cell) {
  const image =
    cell.match(/\bdata-lazy_src="([^"]+)"/i)?.[1] ??
    cell.match(/<img\b[^>]*\bsrc="([^"]+)"/i)?.[1] ??
    "";

  return absolutizeUrl(decodeHtml(image));
}

function extractClassText(cell, className) {
  const pattern = new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  return cleanText(cell.match(pattern)?.[1] ?? "");
}

function dedupeProjects(projects) {
  const seen = new Set();

  return projects.filter((project) => {
    const key = project.url.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function cleanText(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absolutizeUrl(value) {
  if (!value) {
    return "";
  }

  return new URL(value, sourceUrl).href;
}

function getSlug(url) {
  return new URL(url).pathname.replace(/^\/+|\/+$/g, "");
}
