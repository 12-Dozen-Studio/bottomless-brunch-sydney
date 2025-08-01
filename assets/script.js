/*
 * Change Log:
 * - Added ARIA attributes, keyboard support, and focus trapping for better accessibility
 * - Optimized filtering by pre-rendering cards and toggling visibility instead of re-rendering
 * - Persisted favourites via localStorage with synced aria-pressed states
 * - Improved modal usability with escape/backdrop closing and scrollable max-height
 * - Added edge case fallbacks for missing images, packages, links, and map display
 * - Structured filtering logic to support combined search and cuisine filters
 */

// ----- Global State -----
let venuesData = [];
const favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));
const filters = { search: '', cuisine: 'All', suburb: '', days: [] }; // extendable
let venueCards = []; // { el, index }
let lastFocused = null; // element to restore focus after modal close
let trapListener = null; // focus trap handler

// Wait for DOM content to boot
document.addEventListener('DOMContentLoaded', init);

async function init() {
  venuesData = await loadJSON('assets/brunch_venue.json');
  renderFilters(getUniqueCuisines(venuesData));
  renderBottomNav();
  renderVenues(venuesData); // pre-render all venue cards
  initSearch();
  filterVenues(); // apply initial filters
}

// ---------- Data Helpers ----------
async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function getUniqueCuisines(venues) {
  const set = new Set(venues.map(v => v.cuisine).filter(Boolean));
  return Array.from(set).sort();
}

// ---------- Filter Rendering ----------
function renderFilters(cuisines) {
  const filterRow = document.getElementById('filterRow');
  filterRow.innerHTML = '';
  const all = ['All', ...cuisines];
  all.forEach(cuisine => {
    const btn = document.createElement('button');
    btn.className = 'flex flex-col items-center space-y-2 flex-shrink-0 mr-4 focus:outline-none';
    btn.setAttribute('aria-label', `${cuisine} cuisine filter`);
    btn.setAttribute('aria-pressed', cuisine === filters.cuisine);
    btn.innerHTML = `
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        <span class="material-icons text-gray-500">restaurant</span>
      </div>
      <span class="text-xs text-gray-700 text-center">${cuisine}</span>`;
    btn.addEventListener('click', () => {
      filters.cuisine = cuisine;
      updateFilterButtons(filterRow, cuisine);
      filterVenues();
    });
    filterRow.appendChild(btn);
  });
}

function updateFilterButtons(container, selected) {
  container.querySelectorAll('button').forEach(btn => {
    const isActive = btn.textContent.trim() === selected;
    btn.setAttribute('aria-pressed', isActive);
  });
}

function initSearch() {
  const input = document.getElementById('searchInput');
  input.setAttribute('aria-label', 'Search venues');
  input.addEventListener('input', e => {
    filters.search = e.target.value.toLowerCase();
    filterVenues();
  });
}

// ---------- Filtering Logic ----------
function filterVenues() {
  venueCards.forEach(({ el, index }) => {
    const match = matchesFilters(venuesData[index]);
    el.classList.toggle('hidden', !match);
    el.setAttribute('aria-hidden', match ? 'false' : 'true');
  });
}

function matchesFilters(v) {
  const q = filters.search;
  const matchQuery =
    !q || v.name.toLowerCase().includes(q) || v.suburb.toLowerCase().includes(q);
  const matchCuisine = filters.cuisine === 'All' || v.cuisine === filters.cuisine;
  const matchSuburb = !filters.suburb || v.suburb === filters.suburb;
  const matchDays =
    !filters.days.length || v.packages.some(p => p.days.some(d => filters.days.includes(d)));
  return matchQuery && matchCuisine && matchSuburb && matchDays;
}

// ---------- Venue Card Rendering ----------
function renderVenues(venues) {
  const list = document.getElementById('venueList');
  list.innerHTML = '';
  venueCards = venues.map((venue, index) => {
    const card = renderVenueCard(venue, index);
    list.appendChild(card);
    return { el: card, index };
  });
}

function renderVenueCard(venue, index) {
  const card = document.createElement('div');
  card.className =
    'bg-white rounded-lg overflow-hidden border border-gray-200 flex cursor-pointer focus:outline-none';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${venue.name} details`);
  card.dataset.index = index;
  card.dataset.name = venue.name.toLowerCase();
  card.dataset.suburb = venue.suburb.toLowerCase();
  card.dataset.cuisine = venue.cuisine;

  card.innerHTML = `
      <div class="w-1/3">
        <img class="w-full h-full object-cover" src="${(venue.imageUrl && venue.imageUrl[0]) || 'images/placeholder-brunch.jpg'}" alt="${venue.name}">
      </div>
      <div class="w-2/3 p-3 flex flex-col justify-between">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-base font-bold text-gray-900">${venue.name}</h2>
            <div class="flex items-center text-xs text-gray-600 mt-1">
              <span class="material-icons text-xs mr-1">location_on</span>
              <span>${venue.suburb}</span>
              <span class="mx-1">•</span>
              <span>${venue.cuisine}</span>
            </div>
          </div>
          <button data-fav-index="${index}" class="text-gray-400 hover:text-red-500" aria-label="Toggle favourite" aria-pressed="${favorites.has(index)}">
            <span class="material-icons text-xl">${favorites.has(index) ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>
        <div class="mt-2 space-y-1">
          ${venue.packages && venue.packages.length ? venue.packages.map(renderPackageRow).join('') : '<p class="text-xs text-gray-500">No packages available.</p>'}
        </div>
      </div>
    `;

  card.addEventListener('click', () => openModal(venue, index));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal(venue, index);
    }
  });

  const favBtn = card.querySelector('[data-fav-index]');
  favBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleFavorite(index);
  });
  return card;
}

function renderPackageRow(pkg) {
  return `
    <div class="flex items-center justify-between text-xs">
      <div class="font-medium text-gray-700">${pkg.name || 'Package'}</div>
      <div class="text-right">
        <p class="font-bold text-gray-800">$${pkg.price} pp</p>
        <p class="text-xs text-gray-500">${(pkg.days && pkg.days.join(', ')) || ''}</p>
      </div>
    </div>
  `;
}

// ---------- Modal Handling ----------
function openModal(venue, index) {
  lastFocused = document.activeElement;
  const container = document.getElementById('modalContainer');
  container.innerHTML = renderModal(venue, index);
  const modal = container.querySelector('.modal');
  const backdrop = container.querySelector('[data-close]');

  // slide up
  requestAnimationFrame(() => {
    modal.classList.remove('translate-y-full');
  });
  document.body.classList.add('overflow-hidden');

  // focus management
  const focusable = modal.querySelectorAll(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  trapListener = e => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') {
      closeModal();
    }
  };
  modal.addEventListener('keydown', trapListener);
  setTimeout(() => first.focus(), 0);

  container.querySelectorAll('[data-close]').forEach(el =>
    el.addEventListener('click', closeModal)
  );
  container.addEventListener('click', e => {
    if (e.target === backdrop) closeModal();
  });

  const favBtn = container.querySelector('[data-fav-btn]');
  favBtn.addEventListener('click', () => toggleFavorite(index));
  favBtn.setAttribute('aria-pressed', favorites.has(index));
}

function closeModal() {
  const container = document.getElementById('modalContainer');
  const modal = container.querySelector('.modal');
  if (!modal) return;
  modal.removeEventListener('keydown', trapListener);
  modal.classList.add('translate-y-full');
  setTimeout(() => {
    container.innerHTML = '';
    document.body.classList.remove('overflow-hidden');
    if (lastFocused) lastFocused.focus();
  }, 300);
}

function renderModal(venue, index) {
  const images = (venue.imageUrl && venue.imageUrl.length
    ? venue.imageUrl
    : [
        'images/placeholder-brunch.jpg',
        'images/placeholder-crowd.jpg',
        'images/placeholder-drinks.jpg'
      ]
  )
    .map(
      src =>
        `<img src="${src}" alt="${venue.name}" class="w-full h-24 object-cover rounded" />`
    )
    .join('');

  const mapSrc = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
    venue.address || venue.suburb
  )}&zoom=15&size=600x200&markers=${encodeURIComponent(venue.address || venue.suburb)}`;
  const mapSection = venue.address
    ? `
      <div class="mt-2">
        <img src="${mapSrc}" alt="Map of ${venue.address}" class="w-full h-32 object-cover rounded" />
        <a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(
          venue.address
        )}" class="text-sm text-blue-600 underline block mt-1">Open in Maps</a>
        <p class="text-sm text-gray-600 mt-1">${venue.address}</p>
      </div>`
    : '';

  const packageList = venue.packages && venue.packages.length
    ? venue.packages.map(renderModalPackage).join('')
    : '<p class="text-sm text-gray-500">No packages available.</p>';

  return `
  <div class="fixed inset-0 z-50 flex items-end justify-center" aria-labelledby="modalTitle" role="dialog" aria-modal="true">
    <div class="absolute inset-0 bg-black bg-opacity-30" data-close="true" tabindex="-1"></div>
    <div class="modal bg-white rounded-t-lg w-full max-w-md max-h-[75vh] transform translate-y-full transition-transform duration-300 overflow-y-auto p-4">
      <div class="flex justify-between items-start">
        <h2 id="modalTitle" class="text-lg font-bold">${venue.name}</h2>
        <button class="text-gray-400" data-close="true" aria-label="Close"><span class="material-icons">close</span></button>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-4">
        ${images}
      </div>
      <div class="mt-4 text-sm text-gray-600">${venue.suburb} • ${venue.cuisine}</div>
      ${mapSection}
      <div class="mt-4 space-y-4">
        ${packageList}
      </div>
      <div class="mt-4 flex flex-wrap gap-3">
        ${venue.website ? `<a target="_blank" rel="noopener" href="${venue.website}" class="px-3 py-2 bg-gray-100 rounded text-sm">Website</a>` : ''}
        ${venue.instagram ? `<a target="_blank" rel="noopener" href="${venue.instagram}" class="px-3 py-2 bg-gray-100 rounded text-sm">Instagram</a>` : ''}
        ${venue.googleMapsUrl ? `<a target="_blank" rel="noopener" href="${venue.googleMapsUrl}" class="px-3 py-2 bg-gray-100 rounded text-sm">Map</a>` : ''}
      </div>
      <button data-fav-btn class="mt-4 text-gray-400 hover:text-red-500" aria-label="Toggle favourite" aria-pressed="${favorites.has(index)}">
        <span class="material-icons">${favorites.has(index) ? 'favorite' : 'favorite_border'}</span>
      </button>
    </div>
  </div>`;
}

function renderModalPackage(pkg) {
  return `
    <div>
      <div class="flex justify-between text-sm">
        <span class="font-medium text-gray-700">${pkg.name}</span>
        <span class="font-bold text-gray-800">$${pkg.price} pp</span>
      </div>
      <div class="text-xs text-gray-500">${(pkg.days && pkg.days.join(', ')) || ''} | ${(pkg.sessions && pkg.sessions.join(', ')) || ''} | ${pkg.duration} mins</div>
      <p class="text-xs mt-1 text-gray-600">${pkg.description || ''}</p>
    </div>
  `;
}

// ---------- Favourite Handling ----------
function toggleFavorite(index) {
  if (favorites.has(index)) {
    favorites.delete(index);
  } else {
    favorites.add(index);
  }
  localStorage.setItem('favorites', JSON.stringify([...favorites]));
  updateFavoriteIcons(index);
}

function updateFavoriteIcons(index) {
  const listBtn = document.querySelector(`[data-fav-index="${index}"] span`);
  const listBtnWrap = document.querySelector(`[data-fav-index="${index}"]`);
  if (listBtn && listBtnWrap) {
    const fav = favorites.has(index);
    listBtn.textContent = fav ? 'favorite' : 'favorite_border';
    listBtnWrap.setAttribute('aria-pressed', fav);
  }
  const modalBtn = document.querySelector('#modalContainer [data-fav-btn] span');
  const modalBtnWrap = document.querySelector('#modalContainer [data-fav-btn]');
  if (modalBtn && modalBtnWrap) {
    const fav = favorites.has(index);
    modalBtn.textContent = fav ? 'favorite' : 'favorite_border';
    modalBtnWrap.setAttribute('aria-pressed', fav);
  }
}

// ---------- Bottom Navigation ----------
function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = `
    <nav class="bg-white border-t border-gray-200 p-2 fixed bottom-0 w-full max-w-md mx-auto flex justify-around" role="navigation">
      <a class="flex flex-col items-center text-red-500" href="#" aria-current="page" aria-label="Home">
        <span class="material-icons">home</span>
        <span class="text-xs font-medium">Home</span>
      </a>
      <a class="flex flex-col items-center text-gray-500 hover:text-red-500" href="#" aria-label="Map">
        <span class="material-icons">map</span>
        <span class="text-xs">Map</span>
      </a>
      <a class="flex flex-col items-center text-gray-500 hover:text-red-500" href="#" aria-label="Favourites">
        <span class="material-icons">favorite_border</span>
        <span class="text-xs">Favourites</span>
      </a>
    </nav>`;
}

