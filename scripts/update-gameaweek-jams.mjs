import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const basePattern = "https://itch.io/jam/#gameaweek";
const jamTimeZone = "America/New_York";
const startWeek = Number(process.env.GAMEAWEEK_START_WEEK || 1);
const maxConsecutiveMisses = Number(process.env.GAMEAWEEK_MAX_MISSES || 2);
const maxWeeks = Number(process.env.GAMEAWEEK_MAX_WEEKS || 80);
const outputPath = process.env.GAMEAWEEK_OUTPUT
  ? pathToFileURL(process.env.GAMEAWEEK_OUTPUT)
  : new URL("../content/one-game-a-week-jams.json", import.meta.url);

const jams = [];
let consecutiveMisses = 0;

for (let week = startWeek; week < startWeek + maxWeeks && consecutiveMisses < maxConsecutiveMisses; week += 1) {
  const url = getJamUrl(week);
  const response = await fetch(url, {
    headers: {
      "user-agent": "ForgeWalker Studios homepage jam updater"
    }
  });

  if (response.status === 404) {
    consecutiveMisses += 1;
    continue;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  consecutiveMisses = 0;
  jams.push(extractJam(await response.text(), week, url));
}

const previousData = await readPreviousData(outputPath);
const nextData = {
  source_pattern: basePattern,
  jams
};
const generatedAt = hasSameJamData(previousData, nextData)
  ? previousData.generated_at
  : new Date().toISOString();

await mkdir(new URL("../content/", import.meta.url), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source_pattern: nextData.source_pattern,
      generated_at: generatedAt,
      jams: nextData.jams
    },
    null,
    2
  )}\n`
);

console.log(`Wrote ${jams.length} One Game a Week jam(s).`);

function extractJam(html, week, url) {
  const viewJamData = parseViewJamData(html);
  const stats = extractStats(html);
  const title =
    cleanText(matchText(html, /<h1 class="jam_title_header"><a[^>]*>([\s\S]*?)<\/a><\/h1>/i)) ||
    cleanText(matchText(html, /<meta content="([^"]+)" property="og:title"/i)) ||
    `One Game A Week Jam #${week}`;
  const summary = cleanText(matchText(html, /<meta content="([^"]+)" name="description"/i));
  const bannerImage = absolutizeUrl(matchText(html, /<img class="jam_banner\s*" src="([^"]+)"/i), url);

  return {
    week,
    title,
    url,
    entries_url: `${url}/entries`,
    results_url: `${url}/results`,
    community_url: `${url}/community`,
    host: cleanText(matchText(html, /Hosted by <a[^>]*>([\s\S]*?)<\/a>/i)),
    banner_image: bannerImage,
    image: bannerImage,
    summary,
    start_date: toIsoDate(viewJamData.start_date),
    end_date: toIsoDate(viewJamData.end_date),
    voting_end_date: toIsoDate(viewJamData.voting_end_date),
    entries: Number(stats.entries || 0),
    ratings: Number(stats.ratings || 0),
    joined: Number(stats.joined || 0),
    status: classifyJam(viewJamData)
  };
}

function parseViewJamData(html) {
  const json = matchText(html, /new I\.ViewJam\([^,]+,\s*(\{.*?\})\);/i);

  if (!json) {
    return {};
  }

  return JSON.parse(json);
}

function extractStats(html) {
  const stats = {};
  const pattern = /<div class="stat_value">([\s\S]*?)<\/div><div class="stat_label">([\s\S]*?)<\/div>/gi;

  for (const match of html.matchAll(pattern)) {
    const label = cleanText(match[2]).toLowerCase();
    const value = cleanText(match[1]).replace(/[^0-9]/g, "");
    stats[label] = value;
  }

  return stats;
}

function classifyJam(jam) {
  const now = Date.now();
  const start = parseItchDate(jam.start_date)?.getTime();
  const end = parseItchDate(jam.end_date)?.getTime();
  const votingEnd = parseItchDate(jam.voting_end_date)?.getTime();

  if (start && now < start) {
    return "scheduled";
  }

  if (start && end && now >= start && now <= end) {
    return "current";
  }

  if (end && votingEnd && now > end && now <= votingEnd) {
    return "voting";
  }

  return "past";
}

function toIsoDate(value) {
  return parseItchDate(value)?.toISOString() ?? "";
}

function parseItchDate(value) {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);

  if (match) {
    const [, year, month, day, hour, minute, second] = match.map(Number);
    return zonedTimeToUtc({ year, month, day, hour, minute, second }, jamTimeZone);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function zonedTimeToUtc(parts, timeZone) {
  const localTimestamp = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let utcTimestamp = localTimestamp;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    utcTimestamp = localTimestamp - getTimeZoneOffset(utcTimestamp, timeZone);
  }

  const date = new Date(utcTimestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTimeZoneOffset(timestamp, timeZone) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23"
    })
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return (
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    ) - timestamp
  );
}

async function readPreviousData(url) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return null;
  }
}

function hasSameJamData(previousData, nextData) {
  if (!previousData?.generated_at) {
    return false;
  }

  return JSON.stringify(withoutGeneratedAt(previousData)) === JSON.stringify(nextData);
}

function withoutGeneratedAt(data) {
  return {
    source_pattern: data.source_pattern,
    jams: data.jams ?? []
  };
}

function getJamUrl(week) {
  return basePattern.replace("#", String(week));
}

function matchText(value, pattern) {
  return value.match(pattern)?.[1] ?? "";
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
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absolutizeUrl(value, baseUrl) {
  if (!value) {
    return "";
  }

  return new URL(decodeHtml(value), baseUrl).href;
}
