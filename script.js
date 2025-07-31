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

// --- FILTER BAR: GOOGLE FONTS STYLE ---
let suburbGroups = {};
let allSuburbs = [];
let selectedSuburbs = new Set();
let selectedPrices = new Set();
let selectedCuisines = new Set();

function loadSuburbGroups() {
  return fetch('suburb_groups.json')
    .then(res => res.json())
    .then(groups => {
      suburbGroups = groups;
      // Build allSuburbs list (unique, sorted)
      const groupSuburbs = Object.values(groups).flat();
      const venueSuburbs = Array.from(new Set(allVenues.map(v => v.suburb).filter(Boolean)));
      // Suburbs not in any group
      const other = venueSuburbs.filter(s => !groupSuburbs.includes(s));
      allSuburbs = [];
      Object.entries(groups).forEach(([label, subs]) => {
        allSuburbs.push(...subs);
      });
      if (other.length) allSuburbs.push(...other.sort());
    });
}
function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';
  // Suburb
  bar.appendChild(createFilterBtn('Suburb', Array.from(selectedSuburbs), allSuburbs, renderSuburbDropdown));
  // Price
  bar.appendChild(createFilterBtn('Price', Array.from(selectedPrices), priceRanges.map(r=>r.label), renderPriceDropdown));
  // Cuisine
  bar.appendChild(createFilterBtn('Cuisine', Array.from(selectedCuisines), cuisineList, renderCuisineDropdown));
}
function createFilterBtn(label, selected, all, dropdownFn) {
  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.type = 'button';
  btn.tabIndex = 0;
  btn.textContent = label;
  if (selected.length) {
    const badge = document.createElement('span');
    badge.className = 'count-badge';
    badge.textContent = `+${selected.length}`;
    btn.appendChild(badge);
    btn.classList.add('active');
  }
  btn.onclick = e => {
    e.stopPropagation();
    closeAllDropdowns();
    const dropdown = dropdownFn(label, btn);
    btn.appendChild(dropdown);
    setTimeout(()=>dropdown.focus(), 10);
  };
  return btn;
}
function closeAllDropdowns() {
  document.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
}
document.body.addEventListener('click', closeAllDropdowns);
// --- DROPDOWNS ---
function renderSuburbDropdown(label, btn) {
  const dd = document.createElement('div');
  dd.className = 'filter-dropdown';
  dd.tabIndex = -1;
  // Grouped
  Object.entries(suburbGroups).forEach(([group, suburbs]) => {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'filter-group-label';
    groupLabel.textContent = group;
    dd.appendChild(groupLabel);
    suburbs.forEach(sub => {
      dd.appendChild(createCheckbox('suburb', sub, selectedSuburbs.has(sub)));
    });
  });
  // Other Suburbs
  const groupSuburbs = Object.values(suburbGroups).flat();
  const other = allSuburbs.filter(s => !groupSuburbs.includes(s));
  if (other.length) {
    const groupLabel = document.createElement('div');
    groupLabel.className = 'filter-group-label';
    groupLabel.textContent = 'Other Suburbs';
    dd.appendChild(groupLabel);
    other.forEach(sub => {
      dd.appendChild(createCheckbox('suburb', sub, selectedSuburbs.has(sub)));
    });
  }
  // Reset
  dd.appendChild(createReset('suburb'));
  return dd;
}
function renderPriceDropdown(label, btn) {
  const dd = document.createElement('div');
  dd.className = 'filter-dropdown';
  dd.tabIndex = -1;
  priceRanges.forEach(r => {
    dd.appendChild(createCheckbox('price', r.label, selectedPrices.has(r.label)));
  });
  dd.appendChild(createReset('price'));
  return dd;
}
function renderCuisineDropdown(label, btn) {
  const dd = document.createElement('div');
  dd.className = 'filter-dropdown';
  dd.tabIndex = -1;
  cuisineList.forEach(c => {
    dd.appendChild(createCheckbox('cuisine', c, selectedCuisines.has(c)));
  });
  dd.appendChild(createReset('cuisine'));
  return dd;
}
function createCheckbox(type, value, checked) {
  const wrap = document.createElement('label');
  wrap.className = 'filter-checkbox' + (checked ? ' selected' : '');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.tabIndex = 0;
  box.onchange = e => {
    if (type === 'suburb') {
      if (box.checked) selectedSuburbs.add(value); else selectedSuburbs.delete(value);
    } else if (type === 'price') {
      if (box.checked) selectedPrices.add(value); else selectedPrices.delete(value);
    } else if (type === 'cuisine') {
      if (box.checked) selectedCuisines.add(value); else selectedCuisines.delete(value);
    }
    closeAllDropdowns();
    renderFilterBar();
    applyFilters();
  };
  wrap.appendChild(box);
  wrap.appendChild(document.createTextNode(value));
  return wrap;
}
function createReset(type) {
  const reset = document.createElement('div');
  reset.className = 'filter-reset';
  reset.tabIndex = 0;
  reset.innerHTML = '× Reset';
  reset.onclick = e => {
    if (type === 'suburb') selectedSuburbs.clear();
    if (type === 'price') selectedPrices.clear();
    if (type === 'cuisine') selectedCuisines.clear();
    closeAllDropdowns();
    renderFilterBar();
    applyFilters();
  };
  return reset;
}

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
    priceRanges = [
      { label: '<$70', min: 0, max: 69.99 },
      { label: '$70–$100', min: 70, max: 100 },
      { label: '>$100', min: 100.01, max: Infinity }
    ];
    loadSuburbGroups().then(() => {
      renderFilterBar();
      applyFilters();
      setupSearch();
      setupMapExpandShrink();
      initMainMap();
      updateFilterUI();
    });
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
    // Suburb
    const matchesSuburb = !selectedSuburbs.size || selectedSuburbs.has(venue.suburb);
    // Price
    const minPrice = getVenueMinPrice(venue);
    const matchesPrice = !selectedPrices.size ||
      Array.from(selectedPrices).some(label => {
        const r = priceRanges.find(r=>r.label===label);
        return r && minPrice >= r.min && minPrice <= r.max;
      });
    // Cuisine
    const matchesCuisine = !selectedCuisines.size ||
      getVenueCuisines(venue).some(c => selectedCuisines.has(c));
    // Search
    const matchesSearch = !searchTerm ||
      venue.name.toLowerCase().includes(searchTerm) ||
      (venue.suburb||'').toLowerCase().includes(searchTerm) ||
      (venue.cuisine||'').toLowerCase().includes(searchTerm);
    return matchesSuburb && matchesPrice && matchesCuisine && matchesSearch;
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
  filteredVenues.forEach((venue, idx) => {
    if (venue.lat && venue.lng) {
      const marker = L.marker([venue.lat, venue.lng]).addTo(mainMap);
      marker.bindPopup(`<b>${venue.name}</b><br>${venue.suburb}`);
      marker.on('click', () => {
        scrollToVenueCard(idx);
      });
      mainMapMarkers.push(marker);
    }
  });
  // Fit bounds if venues exist
  if (filteredVenues.length) {
    const bounds = L.latLngBounds(filteredVenues.map(v => [v.lat, v.lng]));
    mainMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}
function scrollToVenueCard(idx) {
  const cards = document.querySelectorAll('.venue-card');
  if (cards[idx]) {
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    cards.forEach(c => c.classList.remove('highlight'));
    cards[idx].classList.add('highlight');
    setTimeout(()=>cards[idx].classList.remove('highlight'), 1800);
  }
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

// --- MODAL ---
function openModal(venue) {
  // Remove old modal if present
  let oldSheet = document.getElementById('venue-bottom-sheet');
  if (oldSheet) oldSheet.remove();
  let oldDim = document.getElementById('sheet-dim');
  if (oldDim) oldDim.remove();
  // Dimmed bg
  const dim = document.createElement('div');
  dim.className = 'sheet-dim';
  dim.id = 'sheet-dim';
  document.body.appendChild(dim);
  // Sheet
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';
  sheet.id = 'venue-bottom-sheet';
  sheet.innerHTML = `
    <button class="sheet-close" aria-label="Close">×</button>
    <div class="sheet-content">
      <div class="sheet-title">${venue.name}</div>
      <div class="sheet-suburb">${venue.suburb || ''}</div>
      <div class="sheet-carousel modal-gallery">${getVenueImages(venue).slice(0,3).map(img => `<img src="${img}" alt="${venue.name} photo" loading="lazy" />`).join('')}</div>
      <div class="sheet-packages">
        ${venue.packages && venue.packages.length ? renderSheetPackages(venue.packages) : '<span class="no-packages">No packages available</span>'}
      </div>
      <div class="sheet-map" id="sheet-map"></div>
      <div class="sheet-links">
        ${renderSheetLinkBtn('website', venue.website, 'Website', icon('website'))}
        ${renderSheetLinkBtn('instagram', venue.instagram, 'Instagram', icon('instagram'))}
        ${renderSheetLinkBtn('googlemaps', venue.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}` : '', 'Google Maps', icon('address'))}
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  // Close logic
  function closeSheet() {
    sheet.remove();
    dim.remove();
    document.body.style.overflow = '';
  }
  sheet.querySelector('.sheet-close').onclick = closeSheet;
  dim.onclick = closeSheet;
  document.body.style.overflow = 'hidden';
  // Embedded map
  setTimeout(()=>initSheetMap(venue), 100);
}
function renderSheetPackages(packages) {
  // Render day buttons, session times, price/duration for each package
  return packages.map(pkg => {
    const days = pkg.days && pkg.days.length ? pkg.days : [];
    const sessions = pkg.sessions && pkg.sessions.length ? pkg.sessions : [];
    return `
      <div class="sheet-days">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<button class="sheet-day-btn${days.map(dayShort).includes(d) ? ' active' : ''}" disabled>${d}</button>`).join('')}
      </div>
      <div class="sheet-session">${sessions.length ? sessions.join(', ') : ''}</div>
      <div class="sheet-price">$${pkg.price}</div>
      <div class="sheet-duration">${pkg.duration} min</div>
      <div class="package-description">${pkg.description || ''}</div>
    `;
  }).join('');
}
function renderSheetLinkBtn(type, url, label, iconSvg) {
  const active = !!url;
  return `<a class="sheet-link-btn${active ? ' active' : ''}" href="${active ? url : '#'}" target="_blank" rel="noopener" ${active ? '' : 'tabindex="-1" aria-disabled="true"'}>${iconSvg}${label}</a>`;
}
function initSheetMap(venue) {
  const mapDiv = document.getElementById('sheet-map');
  if (!mapDiv) return;
  mapDiv.innerHTML = '';
  if (window._sheetMap) {
    window._sheetMap.remove();
    window._sheetMap = null;
  }
  const map = L.map(mapDiv, { zoomControl: false, attributionControl: false });
  window._sheetMap = map;
  map.setView([venue.lat, venue.lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  // Main marker
  L.marker([venue.lat, venue.lng]).addTo(map).bindPopup(`<b>${venue.name}</b>`).openPopup();
  // Nearby venues (within ~1km)
  allVenues.forEach(v => {
    if (v !== venue && v.lat && v.lng) {
      const dist = getDistance(venue.lat, venue.lng, v.lat, v.lng);
      if (dist < 1) {
        L.circleMarker([v.lat, v.lng], { radius: 6, color: '#bbb' })
          .addTo(map)
          .bindPopup(`<b>${v.name}</b><br>${v.suburb}`);
      }
    }
  });
  setTimeout(()=>map.invalidateSize(), 200);
}

// --- INIT PATCH ---
loadSavedVenues();
