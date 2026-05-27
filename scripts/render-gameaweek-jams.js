const jamDataUrl = "content/one-game-a-week-jams.json";

initJamPage();

async function initJamPage() {
  const root = document.querySelector("[data-jam-page]");

  if (!root) {
    return;
  }

  try {
    const response = await fetch(`${jamDataUrl}?v=20260527-1g1w`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to load jams: ${response.status}`);
    }

    renderJamPage(await response.json());
  } catch {
    renderJamPage({ jams: [] });
  }
}

function renderJamPage(data) {
  const jams = [...(data.jams ?? [])].sort((left, right) => left.week - right.week);
  const current = jams.filter((jam) => jam.status === "current" || jam.status === "voting");
  const scheduled = jams.filter((jam) => jam.status === "scheduled");
  const past = jams.filter((jam) => jam.status === "past").reverse();

  renderJamList("current-jams", current, "No jam is accepting submissions right now.");
  renderJamList("scheduled-jams", scheduled, "Scheduled jams will appear here when they are published on itch.io.");
  renderJamList("past-jams", past, "Past jams will appear here after the first jam closes.");
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

function createJamCard(jam) {
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
  label.textContent = formatStatus(jam.status);

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
  actions.append(createButton(jam.url, getPrimaryActionLabel(jam)));

  if (jam.entries > 0) {
    actions.append(createButton(jam.entries_url, "View Entries"));
  }

  if (jam.status === "past" && jam.ratings > 0) {
    actions.append(createButton(jam.results_url, "View Results"));
  }

  body.append(label, title, dates);

  if (stats.childElementCount) {
    body.append(stats);
  }

  body.append(actions);
  article.append(body);
  return article;
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

function getPrimaryActionLabel(jam) {
  if (jam.status === "scheduled") {
    return "Join Jam";
  }

  if (jam.status === "current") {
    return "Submit or Join";
  }

  if (jam.status === "voting") {
    return "Rate Entries";
  }

  return "View Jam";
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
