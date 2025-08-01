let venuesData = [];
let currentFilter = 'All';
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));

document.addEventListener('DOMContentLoaded', init);

async function init() {
  venuesData = await loadJSON('assets/brunch_venue.json');
  renderFilters(getUniqueCuisines(venuesData));
  renderBottomNav();
  renderVenues(venuesData);
  initSearch();
}

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function getUniqueCuisines(venues) {
  const set = new Set(venues.map(v => v.cuisine).filter(Boolean));
  return Array.from(set).sort();
}

function renderFilters(cuisines) {
  const filterRow = document.getElementById('filterRow');
  filterRow.innerHTML = '';
  const all = ['All', ...cuisines];
  all.forEach(cuisine => {
    const btn = document.createElement('button');
    btn.className = 'flex flex-col items-center space-y-2 flex-shrink-0 mr-4 focus:outline-none';
    btn.innerHTML = `
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        <span class="material-icons text-gray-500">restaurant</span>
      </div>
      <span class="text-xs text-gray-700 text-center">${cuisine}</span>`;
    btn.addEventListener('click', () => {
      currentFilter = cuisine;
      filterVenues();
    });
    filterRow.appendChild(btn);
  });
}

function initSearch() {
  const input = document.getElementById('searchInput');
  input.addEventListener('input', filterVenues);
}

function filterVenues() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = venuesData.filter(v => {
    const matchCuisine = currentFilter === 'All' || v.cuisine === currentFilter;
    const matchQuery =
      v.name.toLowerCase().includes(q) || v.suburb.toLowerCase().includes(q);
    return matchCuisine && matchQuery;
  });
  renderVenues(filtered);
}

function renderVenues(venues) {
  const list = document.getElementById('venueList');
  list.innerHTML = '';
  venues.forEach((venue, index) => {
    const card = renderVenueCard(venue, index);
    list.appendChild(card);
  });
}

function renderVenueCard(venue, index) {
  const card = document.createElement('div');
  card.className =
    'bg-white rounded-lg overflow-hidden border border-gray-200 flex cursor-pointer';
  card.dataset.index = index;
  card.innerHTML = `
      <div class="w-1/3">
        <img class="w-full h-full object-cover" src="images/placeholder-brunch.jpg" alt="${venue.name}">
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
          <button data-fav-index="${index}" class="text-gray-400 hover:text-red-500">
            <span class="material-icons text-xl">${favorites.has(index) ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>
        <div class="mt-2 space-y-1">
          ${venue.packages.map(renderPackageRow).join('')}
        </div>
      </div>
    `;
  card.addEventListener('click', () => openModal(venue, index));
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
      <div class="font-medium text-gray-700">${pkg.name}</div>
      <div class="text-right">
        <p class="font-bold text-gray-800">$${pkg.price} pp</p>
        <p class="text-xs text-gray-500">${pkg.days.join(', ')}</p>
      </div>
    </div>
  `;
}

function openModal(venue, index) {
  const container = document.getElementById('modalContainer');
  container.innerHTML = renderModal(venue, index);
  const modal = container.querySelector('.modal');
  requestAnimationFrame(() => {
    modal.classList.remove('translate-y-full');
  });
  container.querySelectorAll('[data-close]').forEach(el =>
    el.addEventListener('click', closeModal)
  );
  const favBtn = container.querySelector('[data-fav-btn]');
  favBtn.addEventListener('click', () => toggleFavorite(index));
}

function closeModal() {
  const container = document.getElementById('modalContainer');
  const modal = container.querySelector('.modal');
  if (!modal) return;
  modal.classList.add('translate-y-full');
  setTimeout(() => (container.innerHTML = ''), 300);
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
  return `
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <div class="absolute inset-0 bg-black bg-opacity-30" data-close="true"></div>
    <div class="modal bg-white rounded-t-lg w-full max-w-md max-h-[75vh] transform translate-y-full transition-transform duration-300 overflow-y-auto p-4">
      <div class="flex justify-between items-start">
        <h2 class="text-lg font-bold">${venue.name}</h2>
        <button class="text-gray-400" data-close="true"><span class="material-icons">close</span></button>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-4">
        ${images}
      </div>
      <div class="mt-4 text-sm text-gray-600">${venue.suburb} • ${venue.cuisine}</div>
      <div class="text-sm text-gray-600">${venue.address}</div>
      <div class="mt-4 space-y-4">
        ${venue.packages.map(renderModalPackage).join('')}
      </div>
      <div class="mt-4 flex space-x-3">
        ${venue.website ? `<a target="_blank" href="${venue.website}" class="px-3 py-2 bg-gray-100 rounded text-sm">Website</a>` : ''}
        ${venue.instagram ? `<a target="_blank" href="${venue.instagram}" class="px-3 py-2 bg-gray-100 rounded text-sm">Instagram</a>` : ''}
        <a target="_blank" href="https://www.google.com/maps?q=${encodeURIComponent(venue.address)}" class="px-3 py-2 bg-gray-100 rounded text-sm">Map</a>
      </div>
      <button data-fav-btn class="mt-4 text-gray-400 hover:text-red-500">
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
      <div class="text-xs text-gray-500">${pkg.days.join(', ')} | ${pkg.sessions.join(', ')} | ${pkg.duration} mins</div>
      <p class="text-xs mt-1 text-gray-600">${pkg.description}</p>
    </div>
  `;
}

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
  if (listBtn) {
    listBtn.textContent = favorites.has(index) ? 'favorite' : 'favorite_border';
  }
  const modalBtn = document.querySelector('#modalContainer [data-fav-btn] span');
  if (modalBtn) {
    modalBtn.textContent = favorites.has(index) ? 'favorite' : 'favorite_border';
  }
}

function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = `
    <a class="flex flex-col items-center text-red-500" href="#">
      <span class="material-icons">home</span>
      <span class="text-xs font-medium">Home</span>
    </a>
    <a class="flex flex-col items-center text-gray-500 hover:text-red-500" href="#">
      <span class="material-icons">map</span>
      <span class="text-xs">Map</span>
    </a>
    <a class="flex flex-col items-center text-gray-500 hover:text-red-500" href="#">
      <span class="material-icons">favorite_border</span>
      <span class="text-xs">Favourites</span>
    </a>
  `;
}
