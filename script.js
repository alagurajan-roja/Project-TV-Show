// Utility: zero-pad number to 2 digits
function pad2(num) {
  return String(num).padStart(2, "0");
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

  // Ensure root has header title preserved (if any)
  // Create controls container placeholder if not present
  createControls();

  // Fetch shows (only once per visit)
  try {
    await fetchShowsIfNeeded();
    populateShowSelector();
    // If there is at least one show, auto-select the first alphabetically
    const firstShow = window.showList && window.showList.length ? window.showList[0] : null;
    if (firstShow) {
      // trigger load of that show's episodes
      await selectShowById(firstShow.id);
      // set show selector value visually
      const showSelector = document.getElementById("show-selector");
      if (showSelector) showSelector.value = String(firstShow.id);
    } else {
      root.innerHTML = "<p class='error'>No shows found.</p>";
    }
  } catch (err) {
    root.innerHTML = `<p class="error">Failed to load shows: ${err.message}</p>`;
  }
}

/* -------------------------
   FETCHES & CACHING
   ------------------------- */

async function fetchShowsIfNeeded() {
  if (window.showList) return; // already fetched this visit

  const root = document.getElementById("root");
  showLoadingMessage("Loading shows, please wait...");

  const url = "https://api.tvmaze.com/shows";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Shows request failed (status ${res.status})`);
  const shows = await res.json();

  // Sort alphabetically, case-insensitive
  shows.sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

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

  // store
  window.episodesCache[showId] = episodes;
  clearLoadingMessage();
  return episodes;
}

/* -------------------------
   UI: Controls creation & population
   ------------------------- */

function createControls() {
  const root = document.getElementById("root");

  // Remove existing controls if any (for hot-reload safety)
  const existingControls = document.querySelector(".controls");
  if (existingControls) existingControls.remove();

  // Controls container
  const controls = document.createElement("div");
  controls.className = "controls";

  // Show selector
  const showLabel = document.createElement("label");
  showLabel.htmlFor = "show-selector";
  showLabel.textContent = "Show:";
  controls.appendChild(showLabel);

  const showSelector = document.createElement("select");
  showSelector.id = "show-selector";
  const defaultShowOpt = document.createElement("option");
  defaultShowOpt.value = "";
  defaultShowOpt.textContent = "-- Select a show --";
  showSelector.appendChild(defaultShowOpt);
  controls.appendChild(showSelector);

  // Search input
  const searchLabel = document.createElement("label");
  searchLabel.htmlFor = "search";
  searchLabel.textContent = "Search:";
  controls.appendChild(searchLabel);

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = "search";
  searchInput.placeholder = "Search episodes by title or summary...";
  controls.appendChild(searchInput);

  // Episode selector
  const epLabel = document.createElement("label");
  epLabel.htmlFor = "episode-selector";
  epLabel.textContent = "Jump to:";
  controls.appendChild(epLabel);

  const epSelector = document.createElement("select");
  epSelector.id = "episode-selector";
  controls.appendChild(epSelector);

  // Results count (separate element)
  const count = document.createElement("p");
  count.className = "results-count";
  count.id = "episode-count";

  // Insert controls and count after the page title (if present)
  // If root has children, insert controls as the second child; otherwise append
  if (root.children.length >= 1) {
    root.insertBefore(controls, root.children[1] || null);
  } else {
    root.appendChild(controls);
  }

  // Ensure results count is visible under controls
  root.insertBefore(count, controls.nextSibling);

  // Wire events
  showSelector.addEventListener("change", async (e) => {
    const id = e.target.value;
    if (!id) return;
    await selectShowById(Number(id));
  });

  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.trim().toLowerCase();
    applySearchFilter(term);
  });

  epSelector.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "") {
      displayEpisodes(currentEpisodes);
    } else {
      const selectedEp = currentEpisodes.find((ep) => String(ep.id) === val);
      if (selectedEp) displayEpisodes([selectedEp], true);
    }
  });
}

function populateShowSelector() {
  const showSelector = document.getElementById("show-selector");
  if (!showSelector || !window.showList) return;

  // Remove old options, keep the default first
  const defaultOption = showSelector.querySelector("option[value='']") || null;
  showSelector.innerHTML = "";
  if (defaultOption) showSelector.appendChild(defaultOption);

  window.showList.forEach((show) => {
    const opt = document.createElement("option");
    opt.value = show.id;
    opt.textContent = show.name;
    showSelector.appendChild(opt);
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

  episodes.forEach((ep) => {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `S${pad2(ep.season)}E${pad2(ep.number)} - ${ep.name}`;
    selector.appendChild(opt);
  });
}

/* -------------------------
   Helpers: select show, search, display
   ------------------------- */

async function selectShowById(showId) {
  try {
    currentShowId = showId;
    // fetch episodes for show (cached per visit)
    const episodes = await fetchEpisodesForShowIfNeeded(showId);
    currentEpisodes = episodes.slice(); // copy
    // clear any search input
    const search = document.getElementById("search");
    if (search) search.value = "";

    // populate episode selector and display all
    populateEpisodeSelector(currentEpisodes);
    displayEpisodes(currentEpisodes);
  } catch (err) {
    const root = document.getElementById("root");
    root.innerHTML = `<p class="error">Failed to load episodes for this show: ${err.message}</p>`;
  }
}

function applySearchFilter(term) {
  if (!currentEpisodes) return;
  if (!term) {
    // no filter -> show all
    populateEpisodeSelector(currentEpisodes);
    displayEpisodes(currentEpisodes);
    return;
  }

  const filtered = currentEpisodes.filter((ep) => {
    const name = ep.name ? ep.name.toLowerCase() : "";
    const summary = ep.summary ? ep.summary.toLowerCase() : "";
    return name.includes(term) || summary.includes(term);
  });

  populateEpisodeSelector(filtered);
  displayEpisodes(filtered);
}

/* -------------------------
   Display episodes (cards)
   ------------------------- */

function displayEpisodes(episodeList, scrollToFirst = false) {
  const root = document.getElementById("root");

  // Remove old container if exists
  const oldContainer = document.querySelector(".episodes-container");
  if (oldContainer) oldContainer.remove();

  const container = document.createElement("div");
  container.className = "episodes-container";
  root.appendChild(container);

  if (!episodeList || episodeList.length === 0) {
    const empty = document.createElement("p");
    empty.className = "loading";
    empty.textContent = "No episodes to display.";
    root.appendChild(empty);
  } else {
    episodeList.forEach((episode) => {
      const episodeCode = `S${pad2(episode.season)}E${pad2(episode.number)}`;

      // Card
      const card = document.createElement("article");
      card.className = "episode-card";

      // Title with link
      const title = document.createElement("h2");
      const titleLink = document.createElement("a");
      titleLink.href = episode.url;
      titleLink.target = "_blank";
      titleLink.rel = "noopener";
      titleLink.textContent = `${episode.name} - ${episodeCode}`;
      title.appendChild(titleLink);
      card.appendChild(title);

      // Image
      if (episode.image && episode.image.medium) {
        const img = document.createElement("img");
        img.src = episode.image.medium;
        img.alt = `${episode.name} still image`;
        card.appendChild(img);
      }

      // Summary
      const summary = document.createElement("div");
      summary.className = "summary";
      summary.innerHTML = episode.summary || "";
      card.appendChild(summary);

      container.appendChild(card);
    });

    // Scroll to first episode if needed
    if (scrollToFirst && container.firstElementChild) {
      container.firstElementChild.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Update results count
  const count = document.getElementById("episode-count");
  if (count) count.textContent = `Displaying ${episodeList.length} episode(s)`;

  // Attribution
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
   Loading / error helpers
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
