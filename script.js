// Utility: zero-pad number to 2 digits
function pad2(num) {
  return String(num).padStart(2, "0");
}

// Global storage for episodes
window.allEpisodes = [];

// Fetch episodes on load instead of getAllEpisodes()
window.onload = fetchEpisodes;

async function fetchEpisodes() {
  const root = document.getElementById("root");

  // Show loading state
  root.innerHTML = "<p>Loading episodes, please wait...</p>";

  try {
    const response = await fetch("https://api.tvmaze.com/shows/82/episodes");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Save fetched episodes globally
    window.allEpisodes = await response.json();

    // Clear loading message
    root.innerHTML = "";

    // Continue as before
    setup();

  } catch (error) {
    root.innerHTML = `<p style="color: red;">⚠️ Failed to load episodes. Please try again later.</p>`;
    console.error("Error fetching episodes:", error);
  }
}

function setup() {
  createControls();
  displayEpisodes(window.allEpisodes);
}

function createControls() {
  const root = document.getElementById("root");

  // Controls container
  const controls = document.createElement("div");
  controls.className = "controls";

  // Search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search episodes...";
  controls.appendChild(searchInput);

  // Episode selector
  const selector = document.createElement("select");
  const defaultOption = document.createElement("option");
  defaultOption.textContent = "All episodes";
  defaultOption.value = "";
  selector.appendChild(defaultOption);

  window.allEpisodes.forEach((ep) => {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `S${pad2(ep.season)}E${pad2(ep.number)} - ${ep.name}`;
    selector.appendChild(opt);
  });

  controls.appendChild(selector);

  // Results count
  const count = document.createElement("p");
  count.className = "results-count";
  root.appendChild(count);

  root.insertBefore(controls, root.children[1]);

  // Event listeners
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = window.allEpisodes.filter(
      (ep) =>
        ep.name.toLowerCase().includes(term) ||
        (ep.summary && ep.summary.toLowerCase().includes(term))
    );
    displayEpisodes(filtered);
    selector.value = ""; // Reset selector when searching
  });

  selector.addEventListener("change", () => {
    const selectedId = parseInt(selector.value);
    if (selectedId) {
      const ep = window.allEpisodes.find((e) => e.id === selectedId);
      displayEpisodes([ep], true); // smooth scroll to episode
    } else {
      displayEpisodes(window.allEpisodes);
    }
  });
}

function displayEpisodes(episodeList, scrollToFirst = false) {
  const root = document.getElementById("root");

  // Remove old container if exists
  const oldContainer = document.querySelector(".episodes-container");
  if (oldContainer) oldContainer.remove();

  const container = document.createElement("div");
  container.className = "episodes-container";
  root.appendChild(container);

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
    if (episode.image) {
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
  if (scrollToFirst && episodeList.length > 0) {
    container.firstElementChild.scrollIntoView({ behavior: "smooth" });
  }

  // Update results count
  const count = document.querySelector(".results-count");
  count.textContent = `Displaying ${episodeList.length} episode(s)`;

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
