//You can edit ALL of the code here
/*function setup() {
  const allEpisodes = getAllEpisodes();
  makePageForEpisodes(allEpisodes);
}

function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.textContent = `Got ${episodeList.length} episode(s)`;
}

window.onload = setup; */


// Utility function: zero-pad to 2 digits
function pad2(num) {
  return String(num).padStart(2, "0");
}

function setup() {
  const allEpisodes = getAllEpisodes(); // Provided by episodes.js
  makePageForEpisodes(allEpisodes);
}

function makePageForEpisodes(episodeList) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "TV Show Episodes";
  rootElem.appendChild(heading);

  const container = document.createElement("div");
  container.className = "episodes-container";
  rootElem.appendChild(container);

  episodeList.forEach((episode) => {
    const episodeCode = `S${pad2(episode.season)}E${pad2(episode.number)}`;

    // Card
    const card = document.createElement("article");
    card.className = "episode-card";

    // Title with link (at the top)
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

  // Attribution
  const credit = document.createElement("p");
  credit.className = "credit";
  credit.innerHTML =
    'Data originally from <a href="https://www.tvmaze.com/" target="_blank" rel="noopener">TVMaze.com</a>';
  rootElem.appendChild(credit);
}

window.onload = setup;
