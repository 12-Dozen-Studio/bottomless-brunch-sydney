// --- SVG ICONS ---
const ICONS = {
  cuisine: `<svg class="icon" viewBox="0 0 20 20" aria-label="Cuisine" role="img"><path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2zm0 1.5A6.5 6.5 0 1 0 10 17.5 6.5 6.5 0 0 0 10 3.5zm-2.5 5A1.5 1.5 0 1 1 10 10a1.5 1.5 0 0 1-2.5-1.5zm5 0A1.5 1.5 0 1 1 15 10a1.5 1.5 0 0 1-2.5-1.5z"/></svg>`,
  price: `<svg class="icon" viewBox="0 0 20 20" aria-label="Price" role="img"><path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2zm1 4v2h2v2h-2v2h2v2h-2v2h-2v-2H7v-2h2v-2H7V8h2V6h2z"/></svg>`,
  duration: `<svg class="icon" viewBox="0 0 20 20" aria-label="Duration" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5v5l3 3" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  days: `<svg class="icon" viewBox="0 0 20 20" aria-label="Days" role="img"><rect x="3" y="5" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 8h14" stroke="currentColor" stroke-width="2"/></svg>`,
  sessions: `<svg class="icon" viewBox="0 0 20 20" aria-label="Sessions" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="currentColor"/></svg>`,
  address: `<svg class="icon" viewBox="0 0 20 20" aria-label="Address" role="img"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`,
  website: `<svg class="icon" viewBox="0 0 20 20" aria-label="Website" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h12M10 4a16 16 0 0 1 0 12M10 4a16 16 0 0 0 0 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  instagram: `<svg class="icon" viewBox="0 0 20 20" aria-label="Instagram" role="img"><rect x="4" y="4" width="12" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="5.5" r="1" fill="currentColor"/></svg>`
};
function icon(name) { return ICONS[name] || ''; }

// --- IMAGE UTILS ---
function getVenueImages(venue) {
  if (venue.images && Array.isArray(venue.images) && venue.images.length) return venue.images;
  if (venue.imageUrl) return [venue.imageUrl];
  return [
    'images/placeholder-brunch.jpg',
    'images/placeholder-drinks.jpg',
    'images/placeholder-crowd.jpg'
  ];
}
function getVenueMainImage(venue) {
  const imgs = getVenueImages(venue);
  return imgs[0] || 'images/placeholder-brunch.jpg';
}

// --- FILTER UI SWITCH ---
function renderFilterSelects() {
  const filterSelects = document.getElementById('filter-selects');
  filterSelects.innerHTML = '';
  // Cuisine
  const cuisineSel = document.createElement('select');
  cuisineSel.id = 'cuisine-select';
  cuisineSel.innerHTML = '<option value="">Cuisine</option>' + cuisineList.map(c => `<option value="${c}">${c}</option>`).join('');
  cuisineSel.value = selectedCuisines.size ? Array.from(selectedCuisines)[0] : '';
  cuisineSel.onchange = e => {
    selectedCuisines.clear();
    if (e.target.value) selectedCuisines.add(e.target.value);
    applyFilters();
    cuisineSel.blur();
    updateClearButton();
  };
  // Price
  const priceSel = document.createElement('select');
  priceSel.id = 'price-select';
  priceSel.innerHTML = '<option value="">Price</option>' + priceRanges.map(r => `<option value="${r.label}">${r.label}</option>`).join('');
  priceSel.value = selectedPrices.size ? Array.from(selectedPrices)[0] : '';
  priceSel.onchange = e => {
    selectedPrices.clear();
    if (e.target.value) selectedPrices.add(e.target.value);
    applyFilters();
    priceSel.blur();
    updateClearButton();
  };
  // Duration (sort only, not a filter, but for UI parity)
  const durationSel = document.createElement('select');
  durationSel.id = 'duration-select';
  durationSel.innerHTML = '<option value="">Duration</option>' + [60, 90, 105, 120, 150, 180].map(d => `<option value="${d}">${d} min</option>`).join('');
  durationSel.value = '';
  durationSel.onchange = e => {
    // For now, just sort by duration if selected
    if (e.target.value) {
      sortBy = 'duration';
      applyFilters();
    }
    durationSel.blur();
  };
  filterSelects.appendChild(cuisineSel);
  filterSelects.appendChild(priceSel);
  filterSelects.appendChild(durationSel);
}
function updateFilterUI() {
  if (window.innerWidth <= 600) {
    renderFilterSelects();
    document.getElementById('filter-selects').style.display = 'flex';
    document.getElementById('filter-row-1').style.display = 'flex';
    document.getElementById('filter-row-2').style.display = 'flex';
    document.getElementById('filter-tags').style.display = 'none';
  } else {
    document.getElementById('filter-selects').style.display = 'none';
    document.getElementById('filter-row-1').style.display = 'none';
    document.getElementById('filter-row-2').style.display = 'none';
    document.getElementById('filter-tags').style.display = 'flex';
  }
  updateClearButton();
}
function updateClearButton() {
  const btn = document.getElementById('clear-filters');
  const hasActive = selectedCuisines.size || selectedPrices.size || searchTerm;
  if (hasActive) {
    btn.classList.add('active');
    btn.style.display = 'block';
  } else {
    btn.classList.remove('active');
    btn.style.display = 'none';
  }
}
window.addEventListener('resize', updateFilterUI);

// --- SORTING ---
let sortBy = 'az';
// --- MAP EXPAND/SHRINK ---
function setupMapExpandShrink() {
  const mapSection = document.getElementById('map-section');
  let expanded = false;
  mapSection.classList.remove('map-collapsed');
  mapSection.classList.remove('expanded');
  mapSection.style.height = '150px';
  mapSection.addEventListener('click', () => {
    expanded = !expanded;
    if (expanded) {
      mapSection.classList.add('expanded');
      setTimeout(()=>mainMap && mainMap.invalidateSize(), 350);
    } else {
      mapSection.classList.remove('expanded');
      setTimeout(()=>mainMap && mainMap.invalidateSize(), 350);
    }
  });
  // Shrink map on scroll
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60 && expanded) {
      expanded = false;
      mapSection.classList.remove('expanded');
      setTimeout(()=>mainMap && mainMap.invalidateSize(), 350);
    }
    lastScroll = window.scrollY;
  });
}
// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sort-select').addEventListener('change', e => {
    sortBy = e.target.value;
    applyFilters();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    selectedCuisines.clear();
    selectedPrices.clear();
    searchTerm = '';
    document.getElementById('search-input').value = '';
    applyFilters();
    renderFilterTags();
    updateFilterUI();
  });
  setupMapExpandShrink();
});

// --- GLOBAL STATE ---
let allVenues = [];
let filteredVenues = [];
let selectedCuisines = new Set();
let selectedPrices = new Set();
let searchTerm = '';
let mainMap, mainMapMarkers = [], mainMapInited = false;
let cuisineList = [];
let priceRanges = [
  { label: '<$70', min: 0, max: 69.99 },
  { label: '$70–$100', min: 70, max: 100 },
  { label: '>$100', min: 100.01, max: Infinity }
];

// --- UTILS ---
const dayShort = day => ({
  'Monday':'Mon','Tuesday':'Tue','Wednesday':'Wed','Thursday':'Thu','Friday':'Fri','Saturday':'Sat','Sunday':'Sun'
}[day]||day);
function getVenueMinPrice(venue) {
  if (!venue.packages || !venue.packages.length) return Infinity;
  return Math.min(...venue.packages.map(p=>p.price));
}
function getVenueCuisines(venue) {
  return (venue.cuisine||'').split('/').map(c=>c.trim()).filter(Boolean);
}

// --- FETCH & INIT ---
fetch('brunch_venue.json')
  .then(res => res.json())
  .then(data => {
    allVenues = data;
    cuisineList = Array.from(new Set(
      allVenues.flatMap(getVenueCuisines)
    ));
    renderFilterTags();
    applyFilters();
    setupSearch();
    initMainMap();
    updateFilterUI();
  })
  .catch(() => {
    document.getElementById('venue-list').innerHTML = '<p class="error-msg">Failed to load venues.</p>';
  });

// --- FILTERS & SEARCH ---
function setupSearch() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase();
    applyFilters();
  });
}
function renderFilterTags() {
  const tagBox = document.getElementById('filter-tags');
  tagBox.innerHTML = '';
  // Cuisine tags
  cuisineList.forEach(cuisine => {
    const tag = document.createElement('span');
    tag.className = 'filter-tag' + (selectedCuisines.has(cuisine) ? ' selected' : '');
    tag.textContent = cuisine;
    tag.onclick = () => {
      if (selectedCuisines.has(cuisine)) selectedCuisines.delete(cuisine);
      else selectedCuisines.add(cuisine);
      applyFilters();
      renderFilterTags();
    };
    tagBox.appendChild(tag);
  });
  // Price tags
  priceRanges.forEach(range => {
    const tag = document.createElement('span');
    tag.className = 'filter-tag' + (selectedPrices.has(range.label) ? ' selected' : '');
    tag.textContent = range.label;
    tag.onclick = () => {
      if (selectedPrices.has(range.label)) selectedPrices.delete(range.label);
      else selectedPrices.add(range.label);
      applyFilters();
      renderFilterTags();
    };
    tagBox.appendChild(tag);
  });
}
function applyFilters() {
  filteredVenues = allVenues.filter(venue => {
    // Search
    const matchesSearch = !searchTerm ||
      venue.name.toLowerCase().includes(searchTerm) ||
      (venue.suburb||'').toLowerCase().includes(searchTerm) ||
      (venue.cuisine||'').toLowerCase().includes(searchTerm);
    // Cuisine
    const matchesCuisine = !selectedCuisines.size ||
      getVenueCuisines(venue).some(c => selectedCuisines.has(c));
    // Price
    const minPrice = getVenueMinPrice(venue);
    const matchesPrice = !selectedPrices.size ||
      Array.from(selectedPrices).some(label => {
        const r = priceRanges.find(r=>r.label===label);
        return r && minPrice >= r.min && minPrice <= r.max;
      });
    return matchesSearch && matchesCuisine && matchesPrice;
  });
  // --- SORTING ---
  if (sortBy === 'az') {
    filteredVenues.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'price-low') {
    filteredVenues.sort((a, b) => getVenueMinPrice(a) - getVenueMinPrice(b));
  } else if (sortBy === 'price-high') {
    filteredVenues.sort((a, b) => getVenueMinPrice(b) - getVenueMinPrice(a));
  } else if (sortBy === 'duration') {
    filteredVenues.sort((a, b) => {
      const aDur = a.packages && a.packages[0] ? a.packages[0].duration : 0;
      const bDur = b.packages && b.packages[0] ? b.packages[0].duration : 0;
      return aDur - bDur;
    });
  }
  renderVenues(filteredVenues);
  updateMainMapMarkers();
}

// --- FAVORITES SYSTEM ---
const SAVED_KEY = 'brunch_saved_venues';
let savedVenues = [];
let hasSeenSavedInfo = localStorage.getItem('brunch_seen_saved_info') === '1';
function loadSavedVenues() {
  try {
    savedVenues = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch { savedVenues = []; }
}
function saveSavedVenues() {
  localStorage.setItem(SAVED_KEY, JSON.stringify(savedVenues));
}
function isVenueSaved(venue) {
  return savedVenues.some(v => v.name === venue.name && v.address === venue.address);
}
function toggleSaveVenue(venue) {
  if (isVenueSaved(venue)) {
    savedVenues = savedVenues.filter(v => !(v.name === venue.name && v.address === venue.address));
  } else {
    savedVenues.push(venue);
  }
  saveSavedVenues();
  renderVenues(filteredVenues);
}
function renderSaveStar(venue) {
  const saved = isVenueSaved(venue);
  return `<span class="save-star${saved ? ' saved' : ''}" tabindex="0" role="button" aria-label="${saved ? 'Remove from saved' : 'Save venue'}" title="${saved ? 'Remove from saved' : 'Save venue'}">★</span>`;
}
// --- RENDER SAVED PANEL ---
function showSavedPanel() {
  loadSavedVenues();
  const panel = document.getElementById('saved-panel');
  const content = document.getElementById('saved-content');
  let html = `<h2>Saved Venues</h2>`;
  if (!hasSeenSavedInfo) {
    html += `<div class="info-msg">Your saved list is stored locally in this browser only and may be cleared if you change devices or browsers.</div>`;
    hasSeenSavedInfo = true;
    localStorage.setItem('brunch_seen_saved_info', '1');
  }
  if (!savedVenues.length) {
    html += `<div class="empty-msg">No venues saved yet.</div>`;
  } else {
    html += `<div id="saved-list">` + savedVenues.map((venue, i) => `
      <div class="saved-card">
        <img src="${getVenueMainImage(venue)}" alt="${venue.name} image" />
        <div>
          <div><strong>${venue.name}</strong></div>
          <div style="font-size:0.97em;color:#666;">${venue.suburb || ''}</div>
        </div>
        <button class="remove-saved" aria-label="Remove from saved" data-index="${i}">×</button>
      </div>
    `).join('') + `</div>`;
    html += `<button id="send-list-btn">Send My List</button>`;
  }
  content.innerHTML = html;
  panel.classList.remove('hidden');
  panel.classList.add('active');
}
function hideSavedPanel() {
  const panel = document.getElementById('saved-panel');
  panel.classList.add('hidden');
  panel.classList.remove('active');
}
document.getElementById('view-saved').addEventListener('click', showSavedPanel);
document.getElementById('close-saved').addEventListener('click', hideSavedPanel);
document.getElementById('saved-panel').addEventListener('click', e => {
  if (e.target === document.getElementById('saved-panel')) hideSavedPanel();
});
document.addEventListener('click', e => {
  if (e.target.classList.contains('remove-saved')) {
    const idx = +e.target.getAttribute('data-index');
    savedVenues.splice(idx, 1);
    saveSavedVenues();
    showSavedPanel();
  }
});
// --- EMAIL MODAL ---
function showEmailModal() {
  const modal = document.getElementById('email-modal');
  const content = document.getElementById('email-content');
  let html = `<h2>Send My List</h2>
    <form id="email-form">
      <input type="email" id="email-input" placeholder="Your email address" required autocomplete="email" />
      <div class="venue-preview">` + savedVenues.map(v => `
        <div class="preview-card"><img src="${getVenueMainImage(v)}" alt="${v.name} image" /><span>${v.name}</span></div>
      `).join('') + `</div>
      <button type="submit" id="send-btn">Send</button>
    </form>
    <div class="legal">By using this feature, you agree to subscribe to our email newsletter. (Service provider to be confirmed.) You can unsubscribe at any time.</div>
    <div class="confirmation" style="display:none"></div>
  `;
  content.innerHTML = html;
  modal.classList.remove('hidden');
  modal.classList.add('active');
  document.getElementById('email-form').onsubmit = function(e) {
    e.preventDefault();
    document.getElementById('send-btn').disabled = true;
    setTimeout(() => {
      document.querySelector('#email-modal .confirmation').textContent = 'Your list has been sent!';
      document.querySelector('#email-modal .confirmation').style.display = 'block';
      document.getElementById('send-btn').disabled = false;
      document.getElementById('email-form').reset();
    }, 1200);
  };
}
function hideEmailModal() {
  const modal = document.getElementById('email-modal');
  modal.classList.add('hidden');
  modal.classList.remove('active');
}
document.getElementById('close-email').addEventListener('click', hideEmailModal);
document.getElementById('email-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('email-modal')) hideEmailModal();
});
document.addEventListener('click', e => {
  if (e.target.id === 'send-list-btn') {
    hideSavedPanel();
    showEmailModal();
  }
});
// --- VENUE CARD RENDER ---
function renderVenues(venues) {
  const list = document.getElementById('venue-list');
  list.innerHTML = '';
  if (!venues.length) {
    list.innerHTML = '<p class="error-msg">No venues found.</p>';
    return;
  }
  venues.forEach((venue, idx) => {
    const card = document.createElement('div');
    card.className = 'venue-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', venue.name);
    // --- IMAGE ---
    const imgUrl = getVenueMainImage(venue);
    card.innerHTML = `
      <img class="venue-image" src="${imgUrl}" alt="${venue.name} image" loading="lazy" />
      ${renderSaveStar(venue)}
      <div class="venue-main">
        <h2 class="venue-name">${venue.name}</h2>
        <div class="venue-meta">
          <span>${icon('cuisine')}${venue.cuisine || ''}</span>
          <span>${icon('address')}${venue.suburb}</span>
        </div>
        <div class="package-list">
          ${Array.isArray(venue.packages) && venue.packages.length ? venue.packages.map(pkg => `
            <div class="package-item">
              <div class="package-header package-meta">
                <span>${icon('price')}$${pkg.price}</span>
                <span>${icon('duration')}${pkg.duration} min</span>
              </div>
              <div class="package-meta">
                <span>${icon('days')}${pkg.days && pkg.days.length ? pkg.days.map(dayShort).join(', ') : ''}</span>
                <span>${icon('sessions')}${pkg.sessions && pkg.sessions.length ? pkg.sessions.join(', ') : ''}</span>
              </div>
            </div>
          `).join('') : '<span class="no-packages">No packages available</span>'}
        </div>
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.classList.contains('save-star')) return;
      openModal(venue);
    });
    card.addEventListener('keypress', e => { if (e.key === 'Enter') openModal(venue); });
    card.querySelector('.save-star').addEventListener('click', e => {
      e.stopPropagation();
      toggleSaveVenue(venue);
    });
    card.querySelector('.save-star').addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        toggleSaveVenue(venue);
      }
    });
    list.appendChild(card);
  });
}

// --- MAP SECTION ---
function initMainMap() {
  if (mainMapInited) return;
  const mapDiv = document.getElementById('main-map');
  mainMap = L.map(mapDiv, { zoomControl: false, attributionControl: true });
  mainMap.setView([-33.87, 151.21], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);
  mainMapInited = true;
}
function updateMainMapMarkers() {
  if (!mainMapInited) return;
  mainMapMarkers.forEach(m => mainMap.removeLayer(m));
  mainMapMarkers = [];
  filteredVenues.forEach(venue => {
    if (venue.lat && venue.lng) {
      const marker = L.marker([venue.lat, venue.lng]).addTo(mainMap);
      marker.bindPopup(`<b>${venue.name}</b><br>${venue.suburb}`);
      mainMapMarkers.push(marker);
    }
  });
  // Fit bounds if venues exist
  if (filteredVenues.length) {
    const bounds = L.latLngBounds(filteredVenues.map(v => [v.lat, v.lng]));
    mainMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

// --- MODAL ---
function openModal(venue) {
  const modal = document.getElementById('venue-modal');
  const body = document.getElementById('modal-body');
  // --- IMAGE GALLERY ---
  const images = getVenueImages(venue);
  const gallery = `<div class="modal-gallery">${images.slice(0,3).map(img => `<img src="${img}" alt="${venue.name} photo" loading="lazy" />`).join('')}</div>`;
  // Venue details
  body.innerHTML = `
    ${gallery}
    ${renderSaveStar(venue)}
    <h2 class="venue-name">${venue.name}</h2>
    <div class="venue-meta">
      <span>${icon('cuisine')}${venue.cuisine || ''}</span>
      <span>${icon('address')}${venue.address || ''}</span>
    </div>
    <div class="venue-links">
      ${venue.website ? `<a href="${venue.website}" target="_blank" rel="noopener" class="venue-link">${icon('website')}Website</a>` : ''}
      ${venue.instagram ? `<a href="${venue.instagram}" target="_blank" rel="noopener" class="venue-link">${icon('instagram')}Instagram</a>` : ''}
    </div>
    <div id="modal-map"></div>
    <h3>Packages</h3>
    <div class="package-list">
      ${Array.isArray(venue.packages) && venue.packages.length ? venue.packages.map(pkg => `
        <div class="package-item">
          <div class="package-header package-meta">
            <span>${icon('price')}$${pkg.price}</span>
            <span>${icon('duration')}${pkg.duration} min</span>
          </div>
          <div class="package-meta">
            <span>${icon('days')}${pkg.days && pkg.days.length ? pkg.days.map(dayShort).join(', ') : ''}</span>
            <span>${icon('sessions')}${pkg.sessions && pkg.sessions.length ? pkg.sessions.join(', ') : ''}</span>
          </div>
          <div class="package-description">${pkg.description || ''}</div>
        </div>
      `).join('') : '<span class="no-packages">No packages available</span>'}
    </div>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(()=>initModalMap(venue), 100);
  // Star logic
  const star = body.querySelector('.save-star');
  star.addEventListener('click', e => {
    e.stopPropagation();
    toggleSaveVenue(venue);
    openModal(venue); // re-render modal
  });
  star.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      toggleSaveVenue(venue);
      openModal(venue);
    }
  });
}

document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('venue-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
function closeModal() {
  document.getElementById('venue-modal').classList.add('hidden');
  document.body.style.overflow = '';
  // Remove modal map instance if any
  if (window._modalMap) {
    window._modalMap.remove();
    window._modalMap = null;
  }
}
// --- MODAL MAP ---
function initModalMap(venue) {
  const mapDiv = document.getElementById('modal-map');
  if (!mapDiv) return;
  mapDiv.innerHTML = '';
  if (window._modalMap) {
    window._modalMap.remove();
    window._modalMap = null;
  }
  const map = L.map(mapDiv, { zoomControl: false, attributionControl: false });
  window._modalMap = map;
  map.setView([venue.lat, venue.lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  // Main marker
  L.marker([venue.lat, venue.lng]).addTo(map).bindPopup(`<b>${venue.name}</b>`).openPopup();
  // Nearby venues (within ~1km)
  allVenues.forEach(v => {
    if (v !== venue && v.lat && v.lng) {
      const dist = getDistance(venue.lat, venue.lng, v.lat, v.lng);
      if (dist < 1) {
        L.circleMarker([v.lat, v.lng], { radius: 6, color: '#b85c38' })
          .addTo(map)
          .bindPopup(`<b>${v.name}</b><br>${v.suburb}`);
      }
    }
  });
  setTimeout(()=>map.invalidateSize(), 200);
}
// Haversine distance in km
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- INIT PATCH ---
loadSavedVenues();
