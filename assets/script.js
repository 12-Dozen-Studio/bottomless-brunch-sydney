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
// Add suburbs filter as a Set for multi-select
const filters = { search: '', cuisines: new Set(), suburbs: new Set(), days: new Set(), price: null };
let venueCards = []; // { el, index }
let lastFocused = null; // element to restore focus after modal close
let trapListener = null; // focus trap handler
let suburbGroups = null; // loaded in init()
let suburbGroupsWithOthers = null; // suburbGroups + "Others" group

// Wait for DOM content to boot
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load suburbGroups first
  suburbGroups = await loadJSON('assets/suburb_groups.json');
  venuesData = await loadJSON('assets/brunch_venue.json');
  // Compute "Others" group
  computeSuburbGroupsWithOthers();
  renderFilters();
  renderBottomNav();
  renderVenues(venuesData); // pre-render all venue cards
  initSearch();
  filterVenues(); // apply initial filters
}

function computeSuburbGroupsWithOthers() {
  // Get all suburbs from venues
  const venueSuburbs = new Set(venuesData.map(v => v.suburb).filter(Boolean));
  // Get all suburbs in groups
  const groupedSuburbs = new Set();
  Object.values(suburbGroups).forEach(arr => arr.forEach(s => groupedSuburbs.add(s)));
  // Suburbs in venues but not in any group
  const others = Array.from(venueSuburbs).filter(s => !groupedSuburbs.has(s)).sort();
  // Copy suburbGroups and add Others if needed
  suburbGroupsWithOthers = { ...suburbGroups };
  if (others.length > 0) {
    suburbGroupsWithOthers = { ...suburbGroupsWithOthers, Others: others };
  }
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
function renderFilters() {
  const cuisines = [
    'Australian',
    'Japanese',
    'Italian',
    'Mexican',
    'French',
    'Mediterranean',
    'Asian'
  ];
  const filterRow = document.getElementById('filterRow');
  filterRow.innerHTML = '';
  filterRow.className = '';

  // Cuisine row (scrollable)
  const cuisineScroll = document.createElement('div');
  cuisineScroll.className = 'flex flex-row items-center overflow-x-auto whitespace-nowrap no-scrollbar space-x-2 px-2 py-2';
  cuisines.forEach(cuisine => {
    const isActive = filters.cuisines.has(cuisine);
    const btn = document.createElement('button');
    btn.className = 'flex flex-col items-center space-y-1 flex-shrink-0 focus:outline-none min-w-[60px]';
    btn.setAttribute('aria-label', `${cuisine} cuisine filter`);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.innerHTML = `
      <div class="w-10 h-10 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center shadow-sm">
        <span class="material-icons ${isActive ? 'text-red-500' : 'text-gray-600'}">restaurant</span>
      </div>
      <span class="text-[11px] ${isActive ? 'text-red-600 font-semibold' : 'text-gray-700'} text-center leading-tight">${cuisine}</span>
    `;
    btn.addEventListener('click', () => {
      // Toggle logic for cuisines set (no "All")
      if (filters.cuisines.has(cuisine)) {
        filters.cuisines.delete(cuisine);
      } else {
        filters.cuisines.add(cuisine);
      }
      // Re-render to update button states
      renderFilters();
      filterVenues();
      maybeShowReset();
    });
    cuisineScroll.appendChild(btn);
  });
  filterRow.appendChild(cuisineScroll);

  // Second row: pill-style filters
  const pillScroll = document.createElement('div');
  pillScroll.className = 'flex flex-row items-center overflow-x-auto whitespace-nowrap no-scrollbar space-x-2 px-2 py-2 mt-1';
  // Price
  const priceBtn = document.createElement('button');
  priceBtn.type = 'button';
  priceBtn.id = 'priceFilterBtn';
  priceBtn.setAttribute('aria-haspopup', 'dialog');
  priceBtn.setAttribute('aria-expanded', 'false');
  // Always start with base classes
  priceBtn.className = 'px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-sm text-gray-700 flex-shrink-0 focus:outline-none';
  // Show selected price as label when active
  let priceActive = !!filters.price;
  if (priceActive) {
    // Remove any previous background or border classes that could conflict
    priceBtn.classList.remove('bg-[#363636]', 'text-white', 'border-gray-200', 'text-gray-700');
    priceBtn.classList.add('bg-gray-100', 'text-red-600', 'font-semibold', 'border', 'border-red-300');
    priceBtn.textContent = filters.price;
  } else {
    // Remove any active classes in case of re-render
    priceBtn.classList.remove('text-red-600', 'font-semibold', 'border-red-300');
    priceBtn.textContent = 'Price';
  }
  priceBtn.addEventListener('click', () => {
    renderPricePanel();
    priceBtn.setAttribute('aria-expanded', 'true');
  });
  pillScroll.appendChild(priceBtn);
  const suburbBtn = document.createElement('button');
  suburbBtn.type = 'button';
  suburbBtn.id = 'suburbFilterBtn';
  suburbBtn.setAttribute('aria-haspopup', 'dialog');
  suburbBtn.setAttribute('aria-expanded', 'false');
  // Always start with base classes
  suburbBtn.className = 'px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-sm text-gray-700 flex-shrink-0 focus:outline-none';
  // Compute active suburb group count (at least one suburb in group is selected)
  let activeGroupCount = 0;
  if (filters.suburbs && filters.suburbs.size > 0 && suburbGroupsWithOthers) {
    activeGroupCount = Object.entries(suburbGroupsWithOthers).reduce((count, [group, suburbs]) => {
      const anyInGroup = suburbs.some(sub => filters.suburbs.has(sub));
      return count + (anyInGroup ? 1 : 0);
    }, 0);
  }
  const suburbActive = activeGroupCount > 0;
  if (suburbActive) {
    suburbBtn.classList.add('bg-gray-100', 'text-red-600', 'font-semibold', 'border-red-300');
    suburbBtn.textContent = `Suburb (${activeGroupCount})`;
  } else {
    // Remove any active classes in case of re-render
    suburbBtn.classList.remove('text-red-600', 'font-semibold', 'border-red-300');
    suburbBtn.textContent = 'Suburb';
  }
  suburbBtn.addEventListener('click', () => {
    renderSuburbPanel();
    suburbBtn.setAttribute('aria-expanded', 'true');
  });
  pillScroll.appendChild(suburbBtn);
  // Available Day pill
  const dayBtn = document.createElement('button');
  dayBtn.type = 'button';
  dayBtn.id = 'dayFilterBtn';
  dayBtn.setAttribute('aria-haspopup', 'dialog');
  dayBtn.setAttribute('aria-expanded', 'false');
  dayBtn.className = 'px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-sm text-gray-700 flex-shrink-0 focus:outline-none';
  // Show active state if any days selected
  const dayCount = filters.days && filters.days.size > 0 ? filters.days.size : 0;
  const dayActive = dayCount > 0;
  if (dayActive) {
    dayBtn.classList.add('bg-gray-100', 'text-red-600', 'font-semibold', 'border-red-300');
    dayBtn.textContent = `Available Day (${dayCount})`;
  } else {
    dayBtn.classList.remove('text-red-600', 'font-semibold', 'border-red-300');
    dayBtn.textContent = 'Available Day';
  }
  dayBtn.addEventListener('click', () => {
    renderAvailableDayPanel();
    dayBtn.setAttribute('aria-expanded', 'true');
  });
  pillScroll.appendChild(dayBtn);
  // Sort
  const sortBtn = document.createElement('button');
  sortBtn.className = 'px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-sm text-gray-700 flex-shrink-0 focus:outline-none';
  sortBtn.textContent = 'Sort';
  sortBtn.disabled = true;
  pillScroll.appendChild(sortBtn);

  // Container for pill row
  const pillRowWrap = document.createElement('div');
  pillRowWrap.className = 'flex flex-row items-center w-full';
  pillRowWrap.appendChild(pillScroll);
  filterRow.appendChild(pillRowWrap);

  // Remove existing filter status row if present
  const existingStatusRow = document.getElementById('filterStatusRow');
  if (existingStatusRow) existingStatusRow.remove();

  // New persistent filter status row
  const filterStatusRow = document.createElement('div');
  filterStatusRow.id = 'filterStatusRow';
  filterStatusRow.className = 'flex items-center justify-between px-4 py-1 min-h-[36px] bg-white border-b border-gray-100 text-sm';

  // Venue count text
  const statusText = document.createElement('div');
  const visibleCount = venueCards.filter(({ el }) => !el.classList.contains('hidden')).length;
  const hasActive = filters.cuisines.size > 0 || filters.suburbs.size > 0 || filters.days.size > 0 || filters.price || (filters.search && filters.search.trim() !== '');
  statusText.textContent = hasActive ? `${visibleCount} venues matched` : 'Showing all venues';
  statusText.className = 'text-gray-700';

  filterStatusRow.appendChild(statusText);

  if (hasActive) {
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.className = 'text-red-500 border border-red-200 px-3 py-1 rounded-full text-sm';
    resetBtn.addEventListener('click', () => {
      filters.cuisines.clear();
      filters.suburbs.clear();
      filters.days.clear();
      filters.price = null;
      filters.search = '';
      document.getElementById('searchInput').value = '';
      renderFilters();
      filterVenues();
    });
    filterStatusRow.appendChild(resetBtn);
  } else {
    filterStatusRow.classList.add('justify-center');
  }

  filterRow.appendChild(filterStatusRow);

  // Set filterRow sticky etc classes (outer)
  filterRow.classList.add('bg-white', 'border-b', 'border-gray-200', 'sticky', 'top-[72px]', 'z-10');
}


// No longer used: updateFilterButtons

function initSearch() {
  const input = document.getElementById('searchInput');
  input.setAttribute('aria-label', 'Search venues');
  input.addEventListener('input', e => {
    filters.search = e.target.value.toLowerCase();
    filterVenues();
  });
}

// ---------- Filtering Logic ----------
function getPriceBand(price) {
  if (price >= 45 && price <= 74) return '$';
  if (price >= 75 && price <= 94) return '$$';
  if (price >= 95 && price <= 114) return '$$$';
  if (price >= 115) return '$$$$';
  return null;
}

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
  // Cuisine filter: OR logic, match if any selected cuisine is included in v.cuisine (case-insensitive)
  let matchCuisine = true;
  if (filters.cuisines.size > 0) {
    const venueCuisine = (v.cuisine || '').toLowerCase();
    matchCuisine = Array.from(filters.cuisines).some(
      filterCuisine => venueCuisine.includes(filterCuisine.toLowerCase())
    );
  }
  // Suburb filter: multi-select
  const matchSuburb =
    !filters.suburbs || filters.suburbs.size === 0 || filters.suburbs.has(v.suburb);
  // Day filter: OR logic, match if any selected day is available in any package
  let matchDays = true;
  if (filters.days && filters.days.size > 0) {
    matchDays = v.packages &&
      v.packages.some(pkg =>
        pkg.days && pkg.days.some(d => filters.days.has(d))
      );
  }
  // Price filter: match if any package falls within selected price band
  let matchPrice = true;
  if (filters.price) {
    if (v.packages && v.packages.length > 0) {
      const filteredPkgs = v.packages.filter(pkg => getPriceBand(pkg.price) === filters.price);
      matchPrice = filteredPkgs.length > 0;
    } else {
      matchPrice = false;
    }
  }
  return matchQuery && matchCuisine && matchSuburb && matchDays && matchPrice;
}
// ---------- Price Pill Filter (new for banded price filtering) ----------
// This should be called after DOM is loaded and filters have been rendered
function updateFilterVisuals() {
  document.querySelectorAll('.price-pill').forEach(btn => {
    const symbol = btn.dataset.symbol;
    if (filters.price === symbol) {
      btn.classList.add('bg-gray-100', 'text-red-600', 'font-semibold', 'border-red-300');
    } else {
      btn.classList.remove('bg-gray-100', 'text-red-600', 'font-semibold', 'border-red-300');
    }
  });
}

// Attach event listeners for price pills after rendering (should be called after pills are in DOM)
function bindPricePillClicks() {
  document.querySelectorAll('.price-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.symbol;
      filters.price = filters.price === selected ? null : selected;
      updateFilterVisuals();
      filterVenues();
      maybeShowReset();
    });
  });
}

// ---------- Suburb Panel ----------
function renderSuburbPanelContent(panelContent) {
  // Remove previous content
  panelContent.innerHTML = '';
  const groupEntries = Object.entries(suburbGroupsWithOthers);
  groupEntries.forEach(([group, suburbs], idx) => {
    const groupDiv = document.createElement('div');
    // Add vertical padding and bottom border except last item
    groupDiv.className = 'py-3' + (idx < groupEntries.length - 1 ? ' border-b border-gray-200' : '');
    // Group-level checkbox
    const groupId = 'suburb_group_' + group.replace(/\s+/g, '_');
    const label = document.createElement('label');
    // Use consistent bold text style for checkbox label
    label.className = 'inline-flex items-center cursor-pointer font-semibold text-sm';
    // Checkbox checked if ALL suburbs in group are in filters.suburbs
    const allChecked = suburbs.length > 0 && suburbs.every(s => filters.suburbs.has(s));
    const someChecked = suburbs.some(s => filters.suburbs.has(s));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = group;
    input.className = 'mr-2 accent-red-500';
    input.id = groupId;
    input.checked = allChecked;
    // Indeterminate state for partial selection
    if (!allChecked && someChecked) {
      input.indeterminate = true;
    }
    label.appendChild(input);
    // Group title
    const groupTitle = document.createElement('span');
    groupTitle.className = ''; // Already styled on label
    groupTitle.textContent = group;
    label.appendChild(groupTitle);
    groupDiv.appendChild(label);
    // Suburb list (display only)
    const suburbList = document.createElement('div');
    // Reduce font size to match cuisine label: text-[11px]
    suburbList.className = 'text-[11px] text-gray-500 font-light ml-6 mt-1';
    suburbList.textContent = suburbs.join(', ');
    groupDiv.appendChild(suburbList);
    panelContent.appendChild(groupDiv);
    // Event: group checkbox toggles all suburbs in group
    input.addEventListener('change', e => {
      if (e.target.checked) {
        suburbs.forEach(s => filters.suburbs.add(s));
      } else {
        suburbs.forEach(s => filters.suburbs.delete(s));
      }
      // Instead of re-rendering the entire panel, update checkbox states only
      const checkboxes = panelContent.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        const groupName = cb.value;
        const groupSuburbs = suburbGroupsWithOthers[groupName];
        const allChecked = groupSuburbs.length > 0 && groupSuburbs.every(s => filters.suburbs.has(s));
        const someChecked = groupSuburbs.some(s => filters.suburbs.has(s));
        cb.checked = allChecked;
        cb.indeterminate = !allChecked && someChecked;
      });
    });
  });
}

function renderSuburbPanel() {
  if (!suburbGroupsWithOthers) return;
  // Remove any existing panel
  const existing = document.getElementById('suburbPanelBackdrop');
  if (existing) existing.remove();
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'suburbPanelBackdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-end justify-center';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'suburbPanelTitle');
  // dark bg
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black bg-opacity-30';
  scrim.tabIndex = -1;
  scrim.addEventListener('click', closeSuburbPanel);
  backdrop.appendChild(scrim);
  // Panel
  const panel = document.createElement('div');
  panel.id = 'suburbPanel';
  panel.className =
    'fixed inset-x-0 bottom-0 bg-white max-h-screen flex flex-col rounded-t-2xl z-50 transition-transform duration-300 transform translate-y-full';
  panel.tabIndex = 0;
  // Panel content structure
  panel.innerHTML = `
    <div class="flex justify-between items-center pb-2 px-4 pt-4">
      <h2 id="suburbPanelTitle" class="text-lg font-semibold text-center w-full">Select Suburbs</h2>
      <button type="button" class="text-gray-400 absolute right-6" aria-label="Close suburb panel" id="closeSuburbPanelBtn">
        <span class="material-icons">close</span>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto px-6" id="suburbGroupsWrap">
      <!-- suburb group checkboxes -->
    </div>
    <div class="flex justify-center gap-4 p-4 border-t">
      <button type="button" id="resetSuburbBtn" class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 bg-gray-50">Reset</button>
      <button type="button" id="applySuburbBtn" class="px-4 py-2 rounded-full bg-red-500 text-white font-semibold shadow">Apply</button>
    </div>
  `;
  // Render suburb group-level checkboxes and suburb lists
  const groupsWrap = panel.querySelector('#suburbGroupsWrap');
  renderSuburbPanelContent(groupsWrap);
  // Event: close
  panel.querySelector('#closeSuburbPanelBtn').addEventListener('click', closeSuburbPanel);
  // Event: reset
  panel.querySelector('#resetSuburbBtn').addEventListener('click', () => {
    // Uncheck all suburb checkboxes if present in DOM
    document.querySelectorAll('.suburb-checkbox').forEach(cb => cb.checked = false);
    filters.suburbs.clear();
    renderFilters();
    filterVenues(); // Update results immediately
    closeSuburbPanel(); // Close the suburb panel
  });
  // Event: apply
  panel.querySelector('#applySuburbBtn').addEventListener('click', () => {
    closeSuburbPanel();
    // Update filter pill styling and label after applying
    renderFilters();
    filterVenues();
    maybeShowReset();
  });
  // Keyboard: esc closes
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSuburbPanel();
    }
  });
  // Focus trap
  setTimeout(() => {
    // Focus first checkbox if any, else panel
    const firstCb = panel.querySelector('input[type="checkbox"]');
    if (firstCb) firstCb.focus();
    else panel.focus();
  }, 0);
  // Slide up animation
  requestAnimationFrame(() => {
    panel.classList.remove('translate-y-full');
  });
  // Remove panel on backdrop click
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('overflow-hidden');
}

function closeSuburbPanel() {
  const backdrop = document.getElementById('suburbPanelBackdrop');
  if (!backdrop) return;
  const panel = document.getElementById('suburbPanel');
  if (panel) panel.classList.add('translate-y-full');
  setTimeout(() => {
    if (backdrop) backdrop.remove();
    document.body.classList.remove('overflow-hidden');
    // Restore focus to Suburb filter button
    const btn = document.getElementById('suburbFilterBtn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  }, 300);
}

// ---------- Day Formatting Helper ----------
function formatDays(days) {
  if (!Array.isArray(days) || days.length === 0) return '';
  const dayMap = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
  };
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysShort = days.map(d => dayMap[d] || d);
  // Detect daily
  if (days.length === 7 || allDays.every(d => days.includes(d))) return 'Daily';
  // Detect Fri–Sun or Tue–Thu etc
  const idxs = days.map(d => allDays.indexOf(d)).sort((a, b) => a - b);
  // Check if days are a contiguous block
  if (idxs.length > 1) {
    let contiguous = true;
    for (let i = 1; i < idxs.length; i++) {
      if (idxs[i] !== idxs[i - 1] + 1) { contiguous = false; break; }
    }
    if (contiguous) {
      return `${dayMap[allDays[idxs[0]]]} – ${dayMap[allDays[idxs[idxs.length - 1]]]}`;
    }
  }
  // If two days, join with &
  if (daysShort.length === 2) return `${daysShort[0]} & ${daysShort[1]}`;
  // If 3+ non-contiguous, join with commas and last with comma
  return daysShort.join(', ');
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

// Helper function to generate venueKey from venue name (matches Python script logic)
function getVenueKey(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')  // replace non-alphanumerics with underscore
    .replace(/_+/g, '_')         // collapse multiple underscores
    .replace(/^_+|_+$/g, '');    // trim leading/trailing underscores
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

  // List view image rendering logic
  const venueKey = getVenueKey(venue.name || venue.restaurantName || '');
  const imagePath = venueKey ? `images/${venueKey}_1.jpg` : 'images/placeholder-brunch.jpg';
  const imageTag = `<img src="${imagePath}" alt="${venue.name}" class="w-full h-32 object-cover rounded-t-lg" onerror="this.src='images/placeholder-brunch.jpg';" />`;

  card.innerHTML = `
<div class="w-1/3 min-w-[96px] flex items-stretch">
  ${imageTag}
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
        <p class="text-xs text-gray-500">${formatDays(pkg.days) || ''}</p>
      </div>
    </div>
  `;
}

// ---------- Modal Handling ----------
async function openModal(venue, index) {
  lastFocused = document.activeElement;
  const container = document.getElementById('modalContainer');
  container.innerHTML = await renderModal(venue, index);
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

async function renderModal(venue, index) {
  // Modal images with lightbox support
  let images = '';
  if (venue.imageUrl && venue.imageUrl.length) {
    images = venue.imageUrl.map(
      src =>
        `<img src="${src}" alt="${venue.name}" class="w-full h-24 object-cover rounded cursor-pointer" data-lightbox loading="lazy" />`
    ).join('');
  } else {
    // Use fallback images based on venueKey if available
    const venueKey = getVenueKey(venue.name || venue.restaurantName || '');
    const fallbackImgs = venueKey
      ? [
          `images/${venueKey}_1.jpg`,
          `images/${venueKey}_2.jpg`,
          `images/${venueKey}_3.jpg`
        ]
      : [
          'images/placeholder-brunch.jpg',
          'images/placeholder-crowd.jpg',
          'images/placeholder-drinks.jpg'
        ];
    images = fallbackImgs.map(
      src =>
        `<img src="${src}" alt="${venue.name}" class="w-full h-24 object-cover rounded cursor-pointer" data-lightbox loading="lazy" onerror="this.src='images/placeholder-brunch.jpg';" />`
    ).join('');
  }

  // Map Section: Use Nominatim geocoding and OSM embed, but replace OSM link with Google Maps search
  let mapSection = '';
  if (venue.address) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(venue.address)}`;
      const response = await fetch(nominatimUrl);
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        // Determine the best label for the Google Maps query
        let gmapsQuery = '';
        if (venue.restaurantName && venue.suburb) {
          gmapsQuery = `${venue.restaurantName} ${venue.suburb}, Australia`;
        } else if (venue.name && venue.suburb) {
          gmapsQuery = `${venue.name} ${venue.suburb}, Australia`;
        } else if (venue.address) {
          gmapsQuery = `${venue.address}, Australia`;
        } else if (venue.name) {
          gmapsQuery = `${venue.name}, Australia`;
        }
        const mapIframe = `
          <iframe
            width="100%"
            height="200"
            frameborder="0"
            scrolling="no"
            src="https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.002},${lat - 0.001},${+lon + 0.002},${+lat + 0.001}&marker=${lat},${lon}"
            style="border:1px solid #ccc; border-radius: 8px;">
          </iframe>
          <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gmapsQuery)}" class="text-sm text-blue-600 underline block mt-1">Open in Google Maps</a>
          <p class="text-sm text-gray-600 mt-1">${venue.address}</p>
        `;
        mapSection = `<div class="mt-2">${mapIframe}</div>`;
      }
    } catch (error) {
      console.error('Error fetching coordinates from Nominatim:', error);
    }
  }

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

// --------- Lightbox Modal for Images ----------
function openLightbox(imageUrls, startIndex = 0) {
  let currentIndex = startIndex;

  const lightboxContainer = document.createElement('div');
  lightboxContainer.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50';
  lightboxContainer.style.cursor = 'pointer';
  lightboxContainer.style.position = 'fixed';
  lightboxContainer.style.top = '0';
  lightboxContainer.style.left = '0';
  lightboxContainer.style.width = '100vw';
  lightboxContainer.style.height = '100vh';

  // Image element
  const lightboxImg = document.createElement('img');
  lightboxImg.src = imageUrls[currentIndex];
  lightboxImg.alt = '';
  lightboxImg.className = 'max-w-full max-h-full rounded shadow-lg';
  lightboxImg.style.pointerEvents = 'auto';

  // Prev button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '&#10094;'; // Left arrow
  prevButton.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow-md';
  prevButton.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    lightboxImg.src = imageUrls[currentIndex];
  });

  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '&#10095;'; // Right arrow
  nextButton.className = 'absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow-md';
  nextButton.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % imageUrls.length;
    lightboxImg.src = imageUrls[currentIndex];
  });

  lightboxContainer.onclick = () => lightboxContainer.remove();

  lightboxContainer.appendChild(lightboxImg);
  lightboxContainer.appendChild(prevButton);
  lightboxContainer.appendChild(nextButton);
  document.body.appendChild(lightboxContainer);
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('hidden');
  document.getElementById('lightboxImg').src = '';
}

function renderModalPackage(pkg) {
  return `
    <div>
      <div class="flex justify-between text-sm">
        <span class="font-medium text-gray-700">${pkg.name}</span>
        <span class="font-bold text-gray-800">$${pkg.price} pp</span>
      </div>
      <div class="text-xs text-gray-500">${formatDays(pkg.days) || ''}${(pkg.sessions && pkg.sessions.length) ? ' | ' + pkg.sessions.join(', ') : ''} | ${pkg.duration} mins</div>
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
  <nav class="bottom-nav bg-white border-t border-gray-200 shadow-sm" role="navigation">
    <div class="max-w-screen-sm mx-auto flex justify-between px-6 py-2">
        <!-- Home -->
        <div class="flex flex-col items-center text-xs">
          <span class="material-icons text-red-500">home</span>
          <span class="text-red-500">Home</span>
        </div>
        <!-- Map -->
        <div class="flex flex-col items-center text-xs">
          <span class="material-icons text-gray-300 pointer-events-none">map</span>
          <span class="text-gray-300 pointer-events-none">Map</span>
        </div>
        <!-- Favourites -->
        <div class="flex flex-col items-center text-xs">
          <span class="material-icons text-gray-300 pointer-events-none">favorite_border</span>
          <span class="text-gray-300 pointer-events-none">Favourites</span>
        </div>
      </div>
    </nav>
  `;
}


// ------------- Lightbox Handler (delegated) -------------
document.addEventListener('click', function (e) {
  if (e.target.matches('[data-lightbox]')) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999]';
    overlay.innerHTML = `
      <img src="${e.target.src}" class="max-w-full max-h-full rounded-lg shadow-lg" />
    `;
    overlay.addEventListener('click', () => document.body.removeChild(overlay));
    document.body.appendChild(overlay);
  }
});


// ---------- Available Day Panel ----------
function renderAvailableDayPanelContent(panelContent) {
  // Remove previous content
  panelContent.innerHTML = '';
  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];
  daysOfWeek.forEach((day, idx) => {
    const div = document.createElement('div');
    // Add vertical padding and border except last item
    div.className = 'flex items-center py-3' + (idx < daysOfWeek.length - 1 ? ' border-b border-gray-200' : '');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = day;
    input.className = 'accent-red-500 mr-2';
    input.id = 'day_cb_' + day;
    input.checked = filters.days.has(day);
    input.addEventListener('change', e => {
      if (e.target.checked) {
        filters.days.add(day);
      } else {
        filters.days.delete(day);
      }
    });
    const label = document.createElement('label');
    label.htmlFor = input.id;
    // Use same bold class as Suburb panel: font-semibold text-sm
    label.className = 'font-semibold text-sm text-gray-800 cursor-pointer';
    label.textContent = day;
    div.appendChild(input);
    div.appendChild(label);
    panelContent.appendChild(div);
  });
}

function renderAvailableDayPanel() {
  // Remove any existing panel
  const existing = document.getElementById('availableDayPanelBackdrop');
  if (existing) existing.remove();
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'availableDayPanelBackdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-end justify-center';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'availableDayPanelTitle');
  // dark bg
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black bg-opacity-30';
  scrim.tabIndex = -1;
  scrim.addEventListener('click', closeAvailableDayPanel);
  backdrop.appendChild(scrim);
  // Panel
  const panel = document.createElement('div');
  panel.id = 'availableDayPanel';
  panel.className =
    'fixed inset-x-0 bottom-0 bg-white max-h-screen flex flex-col rounded-t-2xl z-50 transition-transform duration-300 transform translate-y-full';
  panel.tabIndex = 0;
  // Panel content structure
  panel.innerHTML = `
    <div class="flex justify-between items-center pb-2 px-4 pt-4">
      <h2 id="availableDayPanelTitle" class="text-lg font-semibold text-center w-full">Available Day</h2>
      <button type="button" class="text-gray-400 absolute right-6" aria-label="Close available day panel" id="closeAvailableDayPanelBtn">
        <span class="material-icons">close</span>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto px-6" id="availableDayWrap">
      <!-- day checkboxes -->
    </div>
    <div class="flex justify-center gap-4 p-4 border-t">
      <button type="button" id="resetAvailableDayBtn" class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 bg-gray-50">Reset</button>
      <button type="button" id="applyAvailableDayBtn" class="px-4 py-2 rounded-full bg-red-500 text-white font-semibold shadow">Apply</button>
    </div>
  `;
  // Render day checkboxes
  const daysWrap = panel.querySelector('#availableDayWrap');
  renderAvailableDayPanelContent(daysWrap);
  // Event: close
  panel.querySelector('#closeAvailableDayPanelBtn').addEventListener('click', closeAvailableDayPanel);
  // Event: reset (clear day checkboxes, clear filters, update results, and close panel)
  panel.querySelector('#resetAvailableDayBtn').addEventListener('click', () => {
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    filters.days.clear();
    renderFilters();
    filterVenues(); // Update results immediately
    closeAvailableDayPanel(); // Close the day panel
  });
  // Event: apply
  panel.querySelector('#applyAvailableDayBtn').addEventListener('click', () => {
    closeAvailableDayPanel();
    renderFilters();
    filterVenues();
    maybeShowReset();
  });
  // Keyboard: esc closes
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAvailableDayPanel();
    }
  });
  // Focus trap
  setTimeout(() => {
    // Focus first checkbox if any, else panel
    const firstCb = panel.querySelector('input[type="checkbox"]');
    if (firstCb) firstCb.focus();
    else panel.focus();
  }, 0);
  // Slide up animation
  requestAnimationFrame(() => {
    panel.classList.remove('translate-y-full');
  });
  // Remove panel on backdrop click
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('overflow-hidden');
}

function closeAvailableDayPanel() {
  const backdrop = document.getElementById('availableDayPanelBackdrop');
  if (!backdrop) return;
  const panel = document.getElementById('availableDayPanel');
  if (panel) panel.classList.add('translate-y-full');
  setTimeout(() => {
    if (backdrop) backdrop.remove();
    document.body.classList.remove('overflow-hidden');
    // Restore focus to Available Day filter button
    const btn = document.getElementById('dayFilterBtn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  }, 300);
}
// ---------- Price Panel ----------
function renderPricePanel() {
  // Remove any existing panel
  const existing = document.getElementById('pricePanelBackdrop');
  if (existing) existing.remove();
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'pricePanelBackdrop';
  backdrop.className = 'fixed inset-0 z-50 flex items-end justify-center';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', 'pricePanelTitle');
  // dark bg
  const scrim = document.createElement('div');
  scrim.className = 'absolute inset-0 bg-black bg-opacity-30';
  scrim.tabIndex = -1;
  scrim.addEventListener('click', closePricePanel);
  backdrop.appendChild(scrim);
  // Panel
  const panel = document.createElement('div');
  panel.id = 'pricePanel';
  panel.className =
    'fixed inset-x-0 bottom-0 bg-white max-h-screen flex flex-col rounded-t-2xl z-50 transition-transform duration-300 transform translate-y-full';
  panel.tabIndex = 0;
  // Panel content structure
  panel.innerHTML = `
    <div class="flex justify-between items-center pb-2 px-4 pt-4">
      <h2 id="pricePanelTitle" class="text-lg font-semibold text-center w-full">Price</h2>
      <button type="button" class="text-gray-400 absolute right-6" aria-label="Close price panel" id="closePricePanelBtn">
        <span class="material-icons">close</span>
      </button>
    </div>
    <div class="flex justify-center gap-3 mt-2 mb-2" id="pricePillsWrap">
      <!-- pills -->
    </div>
    <div class="flex justify-center gap-4 p-4 border-t">
      <button type="button" id="resetPriceBtn" class="px-4 py-2 rounded-full border border-gray-300 text-gray-600 bg-gray-50">Reset</button>
      <button type="button" id="applyPriceBtn" class="px-4 py-2 rounded-full bg-red-500 text-white font-semibold shadow">Apply</button>
    </div>
  `;
  // Render pill buttons
  const priceLevels = ["$", "$$", "$$$", "$$$$"];
  const pillsWrap = panel.querySelector('#pricePillsWrap');
  pillsWrap.innerHTML = '';
  priceLevels.forEach(priceVal => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.textContent = priceVal;
    pill.className = 'px-5 py-2 rounded-full border text-base font-semibold focus:outline-none transition';
    if (filters.price === priceVal) {
      pill.classList.add('bg-red-500', 'text-white', 'border-red-500', 'shadow');
    } else {
      pill.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-200');
    }
    pill.addEventListener('click', () => {
      if (filters.price === priceVal) {
        // Deselect if already selected
        filters.price = null;
      } else {
        filters.price = priceVal;
      }
      // Update pills only
      Array.from(pillsWrap.children).forEach((btn, idx) => {
        const btnVal = priceLevels[idx];
        btn.className = 'px-5 py-2 rounded-full border text-base font-semibold focus:outline-none transition';
        if (filters.price === btnVal) {
          btn.classList.add('bg-red-500', 'text-white', 'border-red-500', 'shadow');
        } else {
          btn.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-200');
        }
      });
    });
    pillsWrap.appendChild(pill);
  });
  // Event: close
  panel.querySelector('#closePricePanelBtn').addEventListener('click', closePricePanel);
  // Event: reset
  panel.querySelector('#resetPriceBtn').addEventListener('click', () => {
    filters.price = null;
    // Update pills only
    Array.from(pillsWrap.children).forEach((btn, idx) => {
      btn.className = 'px-5 py-2 rounded-full border text-base font-semibold focus:outline-none transition bg-gray-100 text-gray-700 border-gray-200';
    });
    renderFilters();
    // Immediately apply filters and close the panel
    filterVenues();
    maybeShowReset();
    closePricePanel();
  });
  // Event: apply
  panel.querySelector('#applyPriceBtn').addEventListener('click', () => {
    closePricePanel();
    renderFilters();
    filterVenues();
    maybeShowReset();
  });
  // Keyboard: esc closes
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePricePanel();
    }
  });
  // Focus trap
  setTimeout(() => {
    // Focus first pill if any, else panel
    const firstPill = pillsWrap.querySelector('button');
    if (firstPill) firstPill.focus();
    else panel.focus();
  }, 0);
  // Slide up animation
  requestAnimationFrame(() => {
    panel.classList.remove('translate-y-full');
  });
  // Remove panel on backdrop click
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  document.body.classList.add('overflow-hidden');

  // ---- Add direct reset handler for "reset" button outside panel ----
  // This block ensures the price reset button on the main filter row works instantly.
  setTimeout(() => {
    const priceResetBtn = document.getElementById('priceResetBtn');
    if (priceResetBtn) {
      priceResetBtn.addEventListener('click', () => {
        filters.price = null;
        renderFilters();
        filterVenues();
        maybeShowReset();
        closePricePanel();
      });
    }
  }, 0);
}

function closePricePanel() {
  const backdrop = document.getElementById('pricePanelBackdrop');
  if (!backdrop) return;
  const panel = document.getElementById('pricePanel');
  if (panel) panel.classList.add('translate-y-full');
  setTimeout(() => {
    if (backdrop) backdrop.remove();
    document.body.classList.remove('overflow-hidden');
    // Restore focus to Price filter button
    const btn = document.getElementById('priceFilterBtn');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  }, 300);
}