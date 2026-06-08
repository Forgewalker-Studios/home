const jamDataUrl = "content/one-game-a-week-jams.json";
const leaderboardDataUrl = "content/one-game-a-week-leaderboard.json";
const pageSize = 10;
let leaderboardEntries = [];
let leaderboardPage = 0;
let leaderboardQuery = "";

initJamPage();

async function initJamPage() {
  const root = document.querySelector("[data-jam-page]");

  if (!root) {
    return;
  }

  try {
    const jamResponse = await fetch(`${jamDataUrl}?v=20260528-active-row`, { cache: "no-store" });

    if (!jamResponse.ok) {
      throw new Error(`Unable to load jams: ${jamResponse.status}`);
    }

    renderJamPage(await jamResponse.json());
  } catch {
    renderJamPage({ jams: [] });
  }

  try {
    const leaderboardResponse = await fetch(`${leaderboardDataUrl}?v=20260608-leaderboard`, { cache: "no-store" });

    if (!leaderboardResponse.ok) {
      throw new Error(`Unable to load leaderboard: ${leaderboardResponse.status}`);
    }

    initLeaderboard(await leaderboardResponse.json());
  } catch {
    initLeaderboard({ leaderboard: [] });
  }
}

function renderJamPage(data) {
  const jams = [...(data.jams ?? [])].sort((left, right) => left.week - right.week);
  const accepting = jams.find((jam) => jam.status === "current");
  const voting = [...jams].reverse().find((jam) => jam.status === "voting");
  const next = jams.find((jam) => jam.status === "scheduled");
  const past = jams.filter((jam) => jam.status === "past").reverse();

  renderFeaturedJams([
    {
      emptyMessage: "No jam is accepting submissions right now.",
      jam: accepting,
      label: "Accepting submissions"
    },
    {
      emptyMessage: "No jam is in voting right now.",
      jam: voting,
      label: "Voting"
    },
    {
      emptyMessage: "The next scheduled jam will appear here.",
      jam: next,
      label: "Next up"
    }
  ]);
  renderJamList("past-jams", past, "Past jams will appear here after the first jam closes.");
}

function renderFeaturedJams(slots) {
  const container = document.getElementById("featured-jams");

  if (!container) {
    return;
  }

  container.replaceChildren();
  slots.forEach((slot) => {
    container.append(slot.jam ? createJamCard(slot.jam, slot.label) : createFeaturedPlaceholder(slot));
  });
}

function renderJamList(id, jams, emptyMessage) {
  const container = document.getElementById(id);

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!jams.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    container.append(empty);
    return;
  }

  jams.forEach((jam) => container.append(createJamCard(jam)));
}

function createJamCard(jam, slotLabel = "") {
  const article = document.createElement("article");
  article.className = "jam-card";

  if (jam.image) {
    const image = document.createElement("img");
    image.src = jam.image;
    image.alt = `${jam.title} cover art`;
    image.loading = "lazy";
    image.decoding = "async";
    article.append(image);
  } else {
    article.classList.add("no-image");
  }

  const body = document.createElement("div");
  body.className = "jam-card-body";

  const label = document.createElement("span");
  label.className = "project-label";
  label.textContent = slotLabel || formatStatus(jam.status);

  const title = document.createElement("h2");
  title.textContent = jam.title;

  const dates = document.createElement("p");
  dates.className = "jam-dates";
  dates.textContent = formatJamDates(jam);

  const stats = document.createElement("ul");
  stats.className = "tag-list";
  addStat(stats, "Joined", jam.joined);
  addStat(stats, "Entries", jam.entries);
  addStat(stats, "Ratings", jam.ratings);

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(createButton(jam.url, "View Jam"));

  if (jam.status === "voting" && jam.entries > 0) {
    actions.append(createButton(jam.entries_url, "Rate Entries"));
  } else if (jam.entries > 0) {
    actions.append(createButton(jam.entries_url, "View Entries"));
  }

  if (jam.status === "past" && jam.ratings > 0) {
    actions.append(createButton(jam.results_url, "View Results"));
  }

  body.append(label, title, dates);

  if (stats.childElementCount) {
    body.append(stats);
  }

  if (jam.top_entries?.length) {
    body.append(createPodiumList(jam.top_entries));
  }

  body.append(actions);
  article.append(body);
  return article;
}

function createFeaturedPlaceholder(slot) {
  const article = document.createElement("article");
  article.className = "jam-card no-image placeholder-card";

  const body = document.createElement("div");
  body.className = "jam-card-body";

  const label = document.createElement("span");
  label.className = "project-label";
  label.textContent = slot.label;

  const title = document.createElement("h2");
  title.textContent = "No jam listed";

  const message = document.createElement("p");
  message.className = "jam-dates";
  message.textContent = slot.emptyMessage;

  body.append(label, title, message);
  article.append(body);
  return article;
}

function createPodiumList(entries) {
  const list = document.createElement("ol");
  list.className = "podium-list";
  list.setAttribute("aria-label", "Top ranked entries");

  entries.slice(0, 3).forEach((entry) => {
    const item = document.createElement("li");
    const icon = document.createElement("span");
    const rank = document.createElement("span");
    const link = document.createElement("a");

    icon.className = "podium-icon";

    if (entry.thumbnail) {
      const image = document.createElement("img");
      image.src = entry.thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      icon.append(image);
    }

    rank.className = "podium-rank";
    rank.textContent = `${entry.rank} - `;
    link.href = entry.url;
    link.textContent = entry.title;
    link.title = entry.author ? `${entry.title} by ${entry.author}` : entry.title;

    item.append(icon, rank, link);
    list.append(item);
  });

  return list;
}

function initLeaderboard(data) {
  leaderboardEntries = [...(data.leaderboard ?? [])]
    .filter((entry) => entry.username && Number.isFinite(Number(entry.score)))
    .sort((left, right) => {
      const leftRank = Number(left.rank ?? Number.POSITIVE_INFINITY);
      const rightRank = Number(right.rank ?? Number.POSITIVE_INFINITY);

      return leftRank - rightRank || Number(right.score) - Number(left.score);
    });
  leaderboardPage = 0;
  leaderboardQuery = "";

  const search = document.getElementById("leaderboard-search");
  const previous = document.getElementById("leaderboard-prev");
  const next = document.getElementById("leaderboard-next");

  if (search) {
    search.addEventListener("input", () => {
      leaderboardQuery = search.value.trim().toLowerCase();
      leaderboardPage = 0;
      renderLeaderboard();
    });
  }

  previous?.addEventListener("click", () => {
    leaderboardPage = Math.max(0, leaderboardPage - 1);
    renderLeaderboard();
  });

  next?.addEventListener("click", () => {
    const maxPage = Math.max(0, Math.ceil(getFilteredLeaderboard().length / pageSize) - 1);
    leaderboardPage = Math.min(maxPage, leaderboardPage + 1);
    renderLeaderboard();
  });

  renderLeaderboard();
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  const count = document.getElementById("leaderboard-count");
  const previous = document.getElementById("leaderboard-prev");
  const next = document.getElementById("leaderboard-next");

  if (!container) {
    return;
  }

  const filtered = getFilteredLeaderboard();
  const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  leaderboardPage = Math.min(leaderboardPage, maxPage);
  const page = filtered.slice(leaderboardPage * pageSize, leaderboardPage * pageSize + pageSize);

  container.replaceChildren();

  if (!page.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No leaderboard entries match that search.";
    container.append(empty);
  } else {
    page.forEach((entry) => {
      const index = leaderboardEntries.indexOf(entry);
      container.append(createLeaderboardRow(entry, getLeaderboardRank(entry, index)));
    });
  }

  if (count) {
    const start = filtered.length ? leaderboardPage * pageSize + 1 : 0;
    const end = Math.min(filtered.length, (leaderboardPage + 1) * pageSize);
    count.textContent = `${start}-${end} of ${filtered.length}`;
  }

  if (previous) {
    previous.disabled = leaderboardPage === 0;
  }

  if (next) {
    next.disabled = leaderboardPage >= maxPage;
  }
}

function getFilteredLeaderboard() {
  if (!leaderboardQuery) {
    return leaderboardEntries;
  }

  return leaderboardEntries.filter((entry) => entry.username.toLowerCase().includes(leaderboardQuery));
}

function createLeaderboardRow(entry, rank) {
  const row = document.createElement("li");
  const place = document.createElement("span");
  const profile = document.createElement("a");
  const score = document.createElement("span");

  row.className = "leaderboard-row";
  row.setAttribute("aria-label", `${rank}. ${entry.username}, ${Number(entry.score).toFixed(3)} points`);
  place.className = "leaderboard-rank";
  place.textContent = `${rank}.`;
  profile.href = entry.profile_url || "#";
  profile.textContent = entry.username;
  score.className = "leaderboard-score";
  score.textContent = Number(entry.score).toFixed(3);

  row.append(place, profile, score);
  return row;
}

function getLeaderboardRank(entry, index) {
  const rank = Number(entry.rank);
  return Number.isFinite(rank) ? rank : index + 1;
}

function addStat(list, label, value) {
  if (!value) {
    return;
  }

  const item = document.createElement("li");
  item.textContent = `${value} ${label}`;
  list.append(item);
}

function createButton(href, label) {
  const link = document.createElement("a");
  link.className = "button";
  link.href = href;
  link.textContent = label;
  return link;
}

function formatStatus(status) {
  return {
    current: "Current jam",
    voting: "Voting open",
    scheduled: "Scheduled",
    past: "Past jam"
  }[status] || "Jam";
}

function formatJamDates(jam) {
  const start = formatDate(jam.start_date);
  const end = formatDate(jam.end_date);
  const votingEnd = formatDate(jam.voting_end_date);

  if (!start || !end) {
    return "";
  }

  if (votingEnd) {
    return `${start} to ${end}. Voting through ${votingEnd}.`;
  }

  return `${start} to ${end}.`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
