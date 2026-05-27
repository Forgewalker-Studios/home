const projectDataUrl = "content/forgewalker-itch-projects.json";

const fallbackMessage = "Projects published on the ForgeWalker Studios itch.io page will appear here.";

initProjectSections();

async function initProjectSections() {
  const sections = document.querySelectorAll("[data-project-section]");

  if (!sections.length) {
    return;
  }

  try {
    const response = await fetch(`${projectDataUrl}?v=20260527-forgewalker-itch`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Unable to load projects: ${response.status}`);
    }

    const data = await response.json();
    renderProjectSections(sections, data.projects ?? []);
  } catch {
    renderProjectSections(sections, []);
  }
}

function renderProjectSections(sections, projects) {
  sections.forEach((section) => {
    const limit = Number(section.dataset.projectLimit || 0);
    const visibleProjects = limit > 0 ? projects.slice(0, limit) : projects;

    section.replaceChildren();

    if (!visibleProjects.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = fallbackMessage;
      section.append(empty);
      return;
    }

    visibleProjects.forEach((project) => {
      section.append(createProjectCard(project));
    });
  });
}

function createProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";

  if (project.cover_image) {
    const image = document.createElement("img");
    image.src = project.cover_image;
    image.width = 315;
    image.height = 250;
    image.loading = "lazy";
    image.decoding = "async";
    image.alt = `${project.title} cover art`;
    article.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "project-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = getInitials(project.title);
    article.append(placeholder);
  }

  const copy = document.createElement("div");
  copy.className = "card-copy";

  const label = document.createElement("span");
  label.className = "project-label";
  label.textContent = project.genre || project.category || "Project";

  const heading = document.createElement("h2");
  heading.textContent = project.title;

  const description = document.createElement("p");
  description.textContent = project.description || "A ForgeWalker Studios project on itch.io.";

  const link = document.createElement("a");
  link.href = project.url;
  link.textContent = "View on itch.io";

  copy.append(label, heading, description, link);
  article.append(copy);
  return article;
}

function getInitials(value) {
  return String(value || "ForgeWalker")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
