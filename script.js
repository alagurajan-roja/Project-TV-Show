// Utility: zero-pad number to 2 digits
function pad2(num) {
  return String(num).padStart(2, "0");
}

// Highlight helper
function highlightText(text, term) {
  if (!term) return text;
  const regex = new RegExp(`(${term})`, "gi");
  return text.replace(regex, `<span class="highlight">$1</span>`);
}

/*
 * Caches (per-visit)
 * - window.showList: array of shows
 * - window.episodesCache: { [showId]: episodesArray }
 */
window.showList = window.showList || null;
window.episodesCache = window.episodesCache || {};

// Current state
let currentShowId = null;
let currentEpisodes = [];

// Entry point
window.onload = init;

async function init() {
  const root = document.getElementById("root");

  try {
    await fetchShowsIfNeeded();
    displayShows(window.showList);
  } catch (err) {
    root.innerHTML = `<p class="error">Failed to load shows: ${err.message}</p>`;
  }
}

/* -------------------------
   FETCHES & CACHING
   ------------------------- */

async function fetchShowsIfNeeded() {
  if (window.showList) return;

  showLoadingMessage("Loading shows, please wait...");

  const url = "https://api.tvmaze.com/shows";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Shows request failed (status ${res.status})`);
  const shows = await res.json();

  // Sort alphabetically
  shows.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  window.showList = shows;
  clearLoadingMessage();
}

async function fetchEpisodesForShowIfNeeded(showId) {
  if (window.episodesCache[showId]) return window.episodesCache[showId];

  showLoadingMessage("Loading episodes for selected show...");

  const url = `https://api.tvmaze.com/shows/${showId}/episodes`;
  const res = await fetch(url);
  if (!res.ok) {
    clearLoadingMessage();
    throw new Error(`Episodes request failed (status ${res.status})`);
  }
  const episodes = await res.json();

  window.episodesCache[showId] = episodes;
  clearLoadingMessage();
  return episodes;
}

/* -------------------------
   SHOWS LISTING VIEW
   ------------------------- */

function displayShows(showList) {
  const root = document.getElementById("root");
  root.innerHTML = "<h1>TV SHOWS</h1>";

  // Controls bar
  const controls = document.createElement("div");
  controls.className = "controls";

  // Filtering label
  const filterLabel = document.createElement("span");
  filterLabel.id = "filtering-label";
  filterLabel.textContent = "Filtering for:";
  controls.appendChild(filterLabel);

  // Search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search by name, genres, or summary...";
  controls.appendChild(searchInput);

  // Results count
  const count = document.createElement("span");
  count.id = "results-count";
  count.textContent = `found ${showList.length} shows`;
  controls.appendChild(count);

  // Dropdown selector
  const showSelector = document.createElement("select");
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Select a show --";
  showSelector.appendChild(defaultOpt);

  window.showList.forEach(show => {
    const opt = document.createElement("option");
    opt.value = show.id;
    opt.textContent = show.name;
    showSelector.appendChild(opt);
  });
  controls.appendChild(showSelector);

  root.appendChild(controls);

  // Container
  const container = document.createElement("div");
  container.className = "shows-container";
  root.appendChild(container);

  // Render function
  function render(list, term = "") {
    container.innerHTML = "";
    if (!list.length) {
      container.innerHTML = "<p class='error'>No shows match your search.</p>";
      count.textContent = "found 0 shows";
      return;
    }
    count.textContent = `found ${list.length} shows`;

    list.forEach(show => {
      const card = document.createElement("article");
      card.className = "show-card";

      // Poster
      if (show.image?.medium) {
        const img = document.createElement("img");
        img.src = show.image.medium;
        img.alt = `${show.name} poster`;
        card.appendChild(img);
      }

      // Middle section
      const mainDiv = document.createElement("div");
      mainDiv.className = "show-main";

      const title = document.createElement("h2");
      title.innerHTML = highlightText(show.name, term);
      title.addEventListener("click", () => selectShowById(show.id));
      mainDiv.appendChild(title);

      const summary = document.createElement("div");
      summary.className = "show-summary";
      summary.innerHTML = show.summary
        ? highlightText(show.summary, term)
        : "No summary available.";
      mainDiv.appendChild(summary);

      card.appendChild(mainDiv);

      // Right info panel
      const infoPanel = document.createElement("div");
      infoPanel.className = "show-info-panel";
      infoPanel.innerHTML = `
        <p><strong>Rated:</strong> ${show.rating?.average ?? "N/A"}</p>
        <p><strong>Genres:</strong> ${highlightText(show.genres.join(" | "), term)}</p>
        <p><strong>Status:</strong> ${show.status}</p>
        <p><strong>Runtime:</strong> ${show.runtime ?? "N/A"} min</p>
      `;
      card.appendChild(infoPanel);

      // 🔗 Link to TVMaze
      const link = document.createElement("a");
      link.href = show.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.className = "show-link";
      link.textContent = "View on TVMaze";
      card.appendChild(link);

      container.appendChild(card);
    });
  }

  // Initial render
  render(showList);

  // Search handler
  searchInput.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    document.getElementById("filtering-label").textContent =
      term ? `Filtering for: "${term}"` : "Filtering for:";
    const filtered = showList.filter(show => {
      const name = show.name.toLowerCase();
      const genres = show.genres.join(" ").toLowerCase();
      const summary = show.summary ? show.summary.toLowerCase() : "";
      return (
        name.includes(term) ||
        genres.includes(term) ||
        summary.includes(term)
      );
    });
    render(filtered, term);
  });

  // Dropdown handler
  showSelector.addEventListener("change", e => {
    const id = e.target.value;
    if (id) {
      selectShowById(Number(id));
    }
  });
}

/* -------------------------
   EPISODE VIEW
   ------------------------- */

async function selectShowById(showId) {
  try {
    currentShowId = showId;
    const episodes = await fetchEpisodesForShowIfNeeded(showId);
    currentEpisodes = episodes.slice();
    displayEpisodeView();
  } catch (err) {
    const root = document.getElementById("root");
    root.innerHTML = `<p class="error">Failed to load episodes: ${err.message}</p>`;
  }
}

function displayEpisodeView() {
  const root = document.getElementById("root");
  root.innerHTML = "<h1>Episodes</h1>";

  // Back navigation
  const backLink = document.createElement("div");
  backLink.className = "nav-link";
  backLink.textContent = "← Back to Shows";
  backLink.addEventListener("click", () => displayShows(window.showList));
  root.appendChild(backLink);

  // Controls
  createControls();
  populateEpisodeSelector(currentEpisodes);
  displayEpisodes(currentEpisodes);
}

/* -------------------------
   UI: Controls creation & population
   ------------------------- */

function createControls() {
  const root = document.getElementById("root");
  const controls = document.createElement("div");
  controls.className = "controls";

  // Show selector
  const showLabel = document.createElement("label");
  showLabel.textContent = "Show:";
  controls.appendChild(showLabel);

  const showSelector = document.createElement("select");
  showSelector.id = "show-selector";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Select a show --";
  showSelector.appendChild(defaultOpt);

  window.showList.forEach(show => {
    const opt = document.createElement("option");
    opt.value = show.id;
    opt.textContent = show.name;
    if (show.id === currentShowId) opt.selected = true;
    showSelector.appendChild(opt);
  });
  controls.appendChild(showSelector);

  // Search input
  const searchLabel = document.createElement("label");
  searchLabel.textContent = "Search Episodes:";
  controls.appendChild(searchLabel);

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = "search";
  searchInput.placeholder = "Search episodes by title or summary...";
  controls.appendChild(searchInput);

  // Episode selector
  const epLabel = document.createElement("label");
  epLabel.textContent = "Jump to:";
  controls.appendChild(epLabel);

  const epSelector = document.createElement("select");
  epSelector.id = "episode-selector";
  controls.appendChild(epSelector);

  const count = document.createElement("p");
  count.className = "results-count";
  count.id = "episode-count";
  root.appendChild(controls);
  root.appendChild(count);

  // Events
  showSelector.addEventListener("change", async e => {
    const id = e.target.value;
    if (!id) return;
    await selectShowById(Number(id));
  });

  searchInput.addEventListener("input", e => {
    applySearchFilter(e.target.value.trim().toLowerCase());
  });

  epSelector.addEventListener("change", e => {
    const val = e.target.value;
    if (!val) {
      displayEpisodes(currentEpisodes);
    } else {
      const selectedEp = currentEpisodes.find(ep => String(ep.id) === val);
      if (selectedEp) displayEpisodes([selectedEp], true);
    }
  });
}

function populateEpisodeSelector(episodes) {
  const selector = document.getElementById("episode-selector");
  if (!selector) return;
  selector.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- All episodes --";
  selector.appendChild(defaultOpt);

  episodes.forEach(ep => {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `S${pad2(ep.season)}E${pad2(ep.number)} - ${ep.name}`;
    selector.appendChild(opt);
  });
}

function applySearchFilter(term) {
  if (!currentEpisodes) return;
  if (!term) {
    populateEpisodeSelector(currentEpisodes);
    displayEpisodes(currentEpisodes);
    return;
  }
  const filtered = currentEpisodes.filter(ep => {
    const name = ep.name ? ep.name.toLowerCase() : "";
    const summary = ep.summary ? ep.summary.toLowerCase() : "";
    return name.includes(term) || summary.includes(term);
  });
  populateEpisodeSelector(filtered);
  displayEpisodes(filtered, false, term);
}

/* -------------------------
   Display episodes
   ------------------------- */

function displayEpisodes(episodeList, scrollToFirst = false, term = "") {
  const root = document.getElementById("root");
  const oldContainer = document.querySelector(".episodes-container");
  if (oldContainer) oldContainer.remove();

  const container = document.createElement("div");
  container.className = "episodes-container";
  root.appendChild(container);

  if (!episodeList.length) {
    const empty = document.createElement("p");
    empty.className = "loading";
    empty.textContent = "No episodes to display.";
    root.appendChild(empty);
  } else {
    episodeList.forEach(episode => {
      const episodeCode = `S${pad2(episode.season)}E${pad2(episode.number)}`;
      const card = document.createElement("article");
      card.className = "episode-card";

      const title = document.createElement("h2");
      const titleLink = document.createElement("a");
      titleLink.href = episode.url;
      titleLink.target = "_blank";
      titleLink.rel = "noopener";
      titleLink.innerHTML = `${highlightText(episode.name, term)} - ${episodeCode}`;
      title.appendChild(titleLink);
      card.appendChild(title);

      if (episode.image?.medium) {
        const img = document.createElement("img");
        img.src = episode.image.medium;
        img.alt = `${episode.name} still`;
        card.appendChild(img);
      }

      const summary = document.createElement("div");
      summary.className = "summary";
      summary.innerHTML = episode.summary
        ? highlightText(episode.summary, term)
        : "No summary available.";
      card.appendChild(summary);

      container.appendChild(card);
    });
    if (scrollToFirst && container.firstElementChild) {
      container.firstElementChild.scrollIntoView({ behavior: "smooth" });
    }
  }

  const count = document.getElementById("episode-count");
  if (count) count.textContent = `Displaying ${episodeList.length} episode(s)`;

  let credit = document.querySelector(".credit");
  if (!credit) {
    credit = document.createElement("p");
    credit.className = "credit";
    credit.innerHTML =
      'Data originally from <a href="https://www.tvmaze.com/" target="_blank" rel="noopener">TVMaze.com</a>';
    root.appendChild(credit);
  }
}

/* -------------------------
   Loading helpers
   ------------------------- */

function showLoadingMessage(text = "Loading...") {
  clearLoadingMessage();
  const root = document.getElementById("root");
  const p = document.createElement("p");
  p.className = "loading";
  p.id = "global-loading";
  p.textContent = text;
  root.appendChild(p);
}

function clearLoadingMessage() {
  const p = document.getElementById("global-loading");
  if (p) p.remove();
}
