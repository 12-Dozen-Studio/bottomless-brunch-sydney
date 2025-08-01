document.addEventListener("DOMContentLoaded", async () => {
  const venueListEl = document.getElementById("venueList");
  const filterRowEl = document.getElementById("filterRow");

  // Load all data
  const venues = await loadJSON("assets/brunch_venue.json");
  const suburbGroups = await loadJSON("assets/suburb_groups.json");

  // Render filters
  renderSuburbFilters(suburbGroups);

  // Render all venue cards
  renderVenues(venues);

  // Attach filtering / interactivity
  initEventListeners();
});

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function renderSuburbFilters(suburbGroups) {
  // TODO: Generate pill-style buttons for suburb groupings
}

function renderVenues(venues) {
  const venueListEl = document.getElementById("venueList");
  venueListEl.innerHTML = venues.map(renderVenueCard).join("");
}

function renderVenueCard(venue) {
  // TODO: Generate HTML from venue + packages
  return `
    <div class="venue-card border rounded p-4 shadow-sm bg-white">
      <h2 class="text-lg font-bold">${venue.name}</h2>
      <p class="text-sm text-gray-600">${venue.suburb} – ${venue.cuisine}</p>
      <p class="text-xs">${venue.packages.length} packages available</p>
    </div>
  `;
}

function initEventListeners() {
  // TODO: Wire up filtering, modal, favorite buttons, etc.
}