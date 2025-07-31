// --- SVG ICONS ---
const ICONS = {
  cuisine: `<svg class="icon" viewBox="0 0 20 20" aria-label="Cuisine" role="img"><path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2zm0 1.5A6.5 6.5 0 1 0 10 17.5 6.5 6.5 0 0 0 10 3.5zm-2.5 5A1.5 1.5 0 1 1 10 10a1.5 1.5 0 0 1-2.5-1.5zm5 0A1.5 1.5 0 1 1 15 10a1.5 1.5 0 0 1-2.5-1.5z"/></svg>`,
  price: `<svg class="icon" viewBox="0 0 20 20" aria-label="Price" role="img"><path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2zm1 4v2h2v2h-2v2h2v2h-2v2h-2v-2H7v-2h2v-2H7V8h2V6h2z"/></svg>`,
  duration: `<svg class="icon" viewBox="0 0 20 20" aria-label="Duration" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 5v5l3 3" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  days: `<svg class="icon" viewBox="0 0 20 20" aria-label="Days" role="img"><rect x="3" y="5" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 8h14" stroke="currentColor" stroke-width="2"/></svg>`,
  sessions: `<svg class="icon" viewBox="0 0 20 20" aria-label="Sessions" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="currentColor"/></svg>`,
  address: `<svg class="icon" viewBox="0 0 20 20" aria-label="Address" role="img"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`,
  website: `<svg class="icon" viewBox="0 0 20 20" aria-label="Website" role="img"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h12M10 4a16 16 0 0 1 0 12M10 4a16 16 0 0 0 0 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  instagram: `<svg class="icon" viewBox="0 0 20 20" aria-label="Instagram" role="img"><rect x="4" y="4" width="12" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="5.5" r="1" fill="currentColor"/></svg>`,
  maps: `<svg class="icon" viewBox="0 0 20 20" aria-label="Maps" role="img"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>`
};
function icon(name) { return ICONS[name] || ''; }

// --- MOBILE DETECTION & TOUCH SUPPORT ---
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent);

// Enhanced event handling for mobile
function addMobileEventListeners(element, events, handler) {
  events.forEach(event => {
    element.addEventListener(event, handler, { passive: false });
  });
}

// Prevent default touch behavior for interactive elements
function preventTouchZoom(element) {
  element.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Mobile-specific initialization
function initMobileSupport() {
  // Prevent zoom on double tap for interactive elements
  const interactiveElements = document.querySelectorAll('button, .venue-card, .filter-pill, .save-star');
  interactiveElements.forEach(element => {
    preventTouchZoom(element);
  });
  
  // Fix for iOS Safari viewport issues
  if (isIOS) {
    // Prevent zoom on input focus
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      });
    });
    
    // Fix for iOS Safari 100vh issue
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
  }
  
  // Fix for Chrome on iOS specific issues
  if (isChrome && isIOS) {
    // Ensure proper touch event handling
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
  }
  
  // Prevent pull-to-refresh on mobile
  if (isMobile) {
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('.slide-panel, .bottom-sheet, .modal')) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

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
// --- TOP BAR & SLIDE PANELS (Enhanced for Mobile) ---
function setupTopBar() {
  console.log('Setting up top bar...');
  
  // Filter pills with enhanced mobile support
  const filterPills = document.querySelectorAll('.filter-pill');
  console.log('Found filter pills:', filterPills.length);
  filterPills.forEach(pill => {
    // Add touch event handling
    addMobileEventListeners(pill, ['click', 'touchstart'], (e) => {
      e.preventDefault();
      e.stopPropagation();
      const filterType = pill.getAttribute('data-filter');
      console.log('Opening filter panel:', filterType);
      openFilterPanel(filterType);
    });
    
    // Prevent zoom on double tap
    preventTouchZoom(pill);
  });
  
  // Sort button with enhanced mobile support
  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    addMobileEventListeners(sortBtn, ['click', 'touchstart'], (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Opening sort panel');
      openSortPanel();
    });
    preventTouchZoom(sortBtn);
  }
  
  // Saved button with enhanced mobile support
  const savedBtn = document.getElementById('saved-btn');
  if (savedBtn) {
    addMobileEventListeners(savedBtn, ['click', 'touchstart'], (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Opening saved panel');
      showSavedPanel();
    });
    preventTouchZoom(savedBtn);
  }
  
  // Close buttons with enhanced mobile support
  const closeButtons = document.querySelectorAll('.slide-close');
  console.log('Found close buttons:', closeButtons.length);
  closeButtons.forEach(btn => {
    addMobileEventListeners(btn, ['click', 'touchstart'], (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Closing all panels');
      closeAllPanels();
    });
    preventTouchZoom(btn);
  });
  
  // Apply buttons for each panel with enhanced mobile support
  const applyButtons = {
    'apply-suburb': () => { applyFilters(); closeAllPanels(); },
    'apply-price': () => { applyFilters(); closeAllPanels(); },
    'apply-cuisine': () => { applyFilters(); closeAllPanels(); },
    'apply-sort': () => { applyFilters(); closeAllPanels(); }
  };
  
  Object.entries(applyButtons).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      addMobileEventListeners(btn, ['click', 'touchstart'], handler);
      preventTouchZoom(btn);
    }
  });
  
  // Reset buttons for each panel with enhanced mobile support
  const resetButtons = {
    'reset-suburb': () => { selectedSuburbs.clear(); renderSuburbPills(); },
    'reset-price': () => { selectedPrices.clear(); renderPricePills(); },
    'reset-cuisine': () => { selectedCuisines.clear(); renderCuisinePills(); },
    'reset-sort': () => { sortBy = 'az'; updateSortSelection(); }
  };
  
  Object.entries(resetButtons).forEach(([id, handler]) => {
    const btn = document.getElementById(id);
    if (btn) {
      addMobileEventListeners(btn, ['click', 'touchstart'], handler);
      preventTouchZoom(btn);
    }
  });
}

function openFilterPanel(filterType) {
  console.log('Opening filter panel for:', filterType);
  
  // Close any open panels first
  closeAllPanels();
  
  // Remove active class from all pills
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  
  // Add active class to clicked pill
  const clickedPill = document.querySelector(`[data-filter="${filterType}"]`);
  if (clickedPill) {
    clickedPill.classList.add('active');
  }
  
  // Show appropriate panel
  const panel = document.getElementById(`${filterType}-panel`);
  if (panel) {
    console.log('Found panel, removing hidden class');
    panel.classList.remove('hidden');
    
    // Prevent background scroll on mobile
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }
    
    // Render pills for this filter type
    if (filterType === 'suburb') {
      renderSuburbPills();
    } else if (filterType === 'price') {
      renderPricePills();
    } else if (filterType === 'cuisine') {
      renderCuisinePills();
    }
  } else {
    console.error('Panel not found:', `${filterType}-panel`);
  }
}

function openSortPanel() {
  console.log('Opening sort panel');
  
  // Close any open panels first
  closeAllPanels();
  
  // Show sort panel
  const panel = document.getElementById('sort-panel');
  if (panel) {
    console.log('Found sort panel, removing hidden class');
    panel.classList.remove('hidden');
    
    // Prevent background scroll on mobile
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }
    
    updateSortSelection();
  } else {
    console.error('Sort panel not found');
  }
}

function showSavedPanel() {
  loadSavedVenues();
  const panel = document.getElementById('saved-panel');
  const content = document.getElementById('saved-content');
  let html = '';
  
  if (!hasSeenSavedInfo) {
    html += `<div class="info-msg">Your saved list is stored locally in this browser only and may be cleared if you change devices or browsers.</div>`;
    hasSeenSavedInfo = true;
    localStorage.setItem('brunch_seen_saved_info', '1');
  }
  
  if (!savedVenues.length) {
    html += `<div class="empty-msg">No venues saved yet.</div>`;
  } else {
    html += savedVenues.map((venue, i) => `
      <div class="saved-item" data-venue-index="${i}">
        <img src="${getVenueMainImage(venue)}" alt="${venue.name} image" />
        <div class="saved-item-info">
          <div class="saved-item-name">${venue.name}</div>
          <div class="saved-item-suburb">${venue.suburb || ''}</div>
        </div>
        <button class="saved-item-remove" data-index="${i}">×</button>
      </div>
    `).join('');
  }
  
  content.innerHTML = html;
  panel.classList.remove('hidden');
  
  // Prevent background scroll on mobile
  if (isMobile) {
    document.body.style.overflow = 'hidden';
  }
  
  // Event listeners for saved items with enhanced mobile support
  document.querySelectorAll('.saved-item').forEach(item => {
    addMobileEventListeners(item, ['click', 'touchstart'], (e) => {
      if (!e.target.classList.contains('saved-item-remove')) {
        const idx = +item.getAttribute('data-venue-index');
        openModal(savedVenues[idx]);
        closeAllPanels();
      }
    });
  });
  
  document.querySelectorAll('.saved-item-remove').forEach(btn => {
    addMobileEventListeners(btn, ['click', 'touchstart'], (e) => {
      e.stopPropagation();
      const idx = +btn.getAttribute('data-index');
      savedVenues.splice(idx, 1);
      saveSavedVenues();
      showSavedPanel();
    });
  });
}
function closeAllPanels() {
  console.log('Closing all panels');
  document.querySelectorAll('.slide-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  // Remove active class from all pills
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  
  // Restore background scroll on mobile
  if (isMobile) {
    document.body.style.overflow = '';
  }
}
function renderSuburbPills() {
  const suburbPills = document.getElementById('suburb-pills');
  suburbPills.innerHTML = '';
  
  // Show only group names, not individual suburbs
  Object.keys(suburbGroups).forEach(group => {
    const pill = document.createElement('div');
    pill.className = 'filter-pill' + (selectedSuburbs.has(group) ? ' selected' : '');
    pill.textContent = group;
    
    addMobileEventListeners(pill, ['click', 'touchstart'], () => {
      if (selectedSuburbs.has(group)) {
        selectedSuburbs.delete(group);
      } else {
        selectedSuburbs.add(group);
      }
      pill.classList.toggle('selected');
    });
    
    preventTouchZoom(pill);
    suburbPills.appendChild(pill);
  });
  
  // Add "Others" for suburbs not in groups
  const groupSuburbs = Object.values(suburbGroups).flat();
  const other = allSuburbs.filter(s => !groupSuburbs.includes(s));
  if (other.length) {
    const pill = document.createElement('div');
    pill.className = 'filter-pill' + (selectedSuburbs.has('Others') ? ' selected' : '');
    pill.textContent = 'Others';
    
    addMobileEventListeners(pill, ['click', 'touchstart'], () => {
      if (selectedSuburbs.has('Others')) {
        selectedSuburbs.delete('Others');
      } else {
        selectedSuburbs.add('Others');
      }
      pill.classList.toggle('selected');
    });
    
    preventTouchZoom(pill);
    suburbPills.appendChild(pill);
  }
}
function renderPricePills() {
  const pricePills = document.getElementById('price-pills');
  pricePills.innerHTML = '';
  priceRanges.forEach(range => {
    const pill = document.createElement('div');
    pill.className = 'filter-pill' + (selectedPrices.has(range.label) ? ' selected' : '');
    pill.textContent = range.label;
    
    addMobileEventListeners(pill, ['click', 'touchstart'], () => {
      if (selectedPrices.has(range.label)) {
        selectedPrices.delete(range.label);
      } else {
        selectedPrices.add(range.label);
      }
      pill.classList.toggle('selected');
    });
    
    preventTouchZoom(pill);
    pricePills.appendChild(pill);
  });
}
function renderCuisinePills() {
  const cuisinePills = document.getElementById('cuisine-pills');
  cuisinePills.innerHTML = '';
  
  // Define main cuisine categories
  const mainCuisines = [
    'Modern Australian',
    'Japanese',
    'Italian',
    'Mexican',
    'French',
    'Middle Eastern',
    'Mediterranean',
    'Indian'
  ];
  
  // Show main cuisines
  mainCuisines.forEach(cuisine => {
    const pill = document.createElement('div');
    pill.className = 'filter-pill' + (selectedCuisines.has(cuisine) ? ' selected' : '');
    pill.textContent = cuisine;
    
    addMobileEventListeners(pill, ['click', 'touchstart'], () => {
      if (selectedCuisines.has(cuisine)) {
        selectedCuisines.delete(cuisine);
      } else {
        selectedCuisines.add(cuisine);
      }
      pill.classList.toggle('selected');
    });
    
    preventTouchZoom(pill);
    cuisinePills.appendChild(pill);
  });
  
  // Add "Others" for cuisines not in main list
  const otherCuisines = cuisineList.filter(c => !mainCuisines.includes(c));
  if (otherCuisines.length) {
    const pill = document.createElement('div');
    pill.className = 'filter-pill' + (selectedCuisines.has('Others') ? ' selected' : '');
    pill.textContent = 'Others';
    
    addMobileEventListeners(pill, ['click', 'touchstart'], () => {
      if (selectedCuisines.has('Others')) {
        selectedCuisines.delete('Others');
      } else {
        selectedCuisines.add('Others');
      }
      pill.classList.toggle('selected');
    });
    
    preventTouchZoom(pill);
    cuisinePills.appendChild(pill);
  }
}
function updateSortSelection() {
  const radio = document.querySelector(`input[name="sort"][value="${sortBy}"]`);
  if (radio) radio.checked = true;
  // Add event listeners
  document.querySelectorAll('input[name="sort"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      sortBy = e.target.value;
    });
  });
}
function applyFiltersFromPanel() {
  applyFilters();
}
function resetAllFilters() {
  selectedSuburbs.clear();
  selectedPrices.clear();
  selectedCuisines.clear();
  sortBy = 'az';
  renderFilterPills();
  updateSortSelection();
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
      applyFilters();
      setupSearch();
      setupMapExpandShrink();
      initMainMap();
      setupTopBar();
    });
  })
  .catch(() => {
    document.getElementById('venue-list').innerHTML = '<p class="error-msg">Failed to load venues.</p>';
  });

// --- FILTERS & SEARCH ---
function setupSearch() {
  const input = document.getElementById('search-input');
  
  // Enhanced event handling for mobile
  addMobileEventListeners(input, ['input', 'change'], (e) => {
    searchTerm = e.target.value.toLowerCase();
    applyFilters();
  });
  
  // Prevent zoom on focus for iOS
  if (isIOS) {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  }
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
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  
  filteredVenues = allVenues.filter(venue => {
    // Search filter
    const matchesSearch = !searchTerm || 
      venue.name.toLowerCase().includes(searchTerm) ||
      (venue.suburb && venue.suburb.toLowerCase().includes(searchTerm)) ||
      (venue.cuisine && venue.cuisine.toLowerCase().includes(searchTerm));
    
    // Suburb filter - check if venue's suburb is in any selected group
    const matchesSuburb = selectedSuburbs.size === 0 || 
      selectedSuburbs.has('Others') && !Object.values(suburbGroups).flat().includes(venue.suburb) ||
      Object.entries(suburbGroups).some(([group, suburbs]) => 
        selectedSuburbs.has(group) && suburbs.includes(venue.suburb)
      );
    
    // Price filter
    const matchesPrice = selectedPrices.size === 0 || 
      venue.packages && venue.packages.some(pkg => {
        const price = parseFloat(pkg.price);
        return selectedPrices.has('<$70') && price < 70 ||
               selectedPrices.has('$70–$100') && price >= 70 && price <= 100 ||
               selectedPrices.has('>$100') && price > 100;
      });
    
    // Cuisine filter
    const matchesCuisine = selectedCuisines.size === 0 || 
      selectedCuisines.has('Others') && !['Modern Australian', 'Japanese', 'Italian', 'Mexican', 'French', 'Middle Eastern', 'Mediterranean', 'Indian'].includes(venue.cuisine) ||
      selectedCuisines.has(venue.cuisine);
    
    return matchesSearch && matchesSuburb && matchesPrice && matchesCuisine;
  });
  
  // Sort
  if (sortBy === 'az') {
    filteredVenues.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'price-low') {
    filteredVenues.sort((a, b) => {
      const aMinPrice = Math.min(...(a.packages || []).map(p => parseFloat(p.price)));
      const bMinPrice = Math.min(...(b.packages || []).map(p => parseFloat(p.price)));
      return aMinPrice - bMinPrice;
    });
  } else if (sortBy === 'price-high') {
    filteredVenues.sort((a, b) => {
      const aMinPrice = Math.min(...(a.packages || []).map(p => parseFloat(p.price)));
      const bMinPrice = Math.min(...(b.packages || []).map(p => parseFloat(p.price)));
      return bMinPrice - aMinPrice;
    });
  }
  
  renderVenues();
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
  const isSaved = isVenueSaved(venue);
  return `<button class="save-star ${isSaved ? 'saved' : ''}" aria-label="${isSaved ? 'Remove from saved' : 'Save venue'}">★</button>`;
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
    html += savedVenues.map((venue, i) => `
      <div class="saved-item" data-venue-index="${i}">
        <img src="${getVenueMainImage(venue)}" alt="${venue.name} image" />
        <div class="saved-item-info">
          <div class="saved-item-name">${venue.name}</div>
          <div class="saved-item-suburb">${venue.suburb || ''}</div>
        </div>
        <button class="saved-item-remove" data-index="${i}">×</button>
      </div>
    `).join('');
  }
  
  content.innerHTML = html;
  panel.classList.remove('hidden');
  
  // Event listeners for saved items
  document.querySelectorAll('.saved-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('saved-item-remove')) {
        const idx = +item.getAttribute('data-venue-index');
        openModal(savedVenues[idx]);
        closeAllPanels();
      }
    });
  });
  
  document.querySelectorAll('.saved-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.getAttribute('data-index');
      savedVenues.splice(idx, 1);
      saveSavedVenues();
      showSavedPanel();
    });
  });
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
  
  // Enhanced map options for mobile
  const mapOptions = {
    zoomControl: false,
    attributionControl: true,
    // Improve touch interaction on mobile
    tap: true,
    // Prevent zoom on double tap
    doubleClickZoom: false
  };
  
  mainMap = L.map(mapDiv, mapOptions);
  mainMap.setView([-33.87, 151.21], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mainMap);
  
  // Add zoom control for mobile
  L.control.zoom({
    position: 'bottomright'
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
  console.log('Opening modal for venue:', venue.name);
  
  // Remove any existing bottom sheet and dim overlay
  const existingSheet = document.querySelector('.bottom-sheet');
  const existingDim = document.querySelector('.sheet-dim');
  if (existingSheet) existingSheet.remove();
  if (existingDim) existingDim.remove();
  
  // Create dim overlay
  const dim = document.createElement('div');
  dim.className = 'sheet-dim';
  document.body.appendChild(dim);
  
  // Create bottom sheet
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';
  sheet.innerHTML = `
    <button class="sheet-close" aria-label="Close">×</button>
    <div class="sheet-content">
      <div class="sheet-title">${venue.name}</div>
      <div class="sheet-suburb">${venue.suburb || ''}</div>
      <div class="sheet-carousel">
        <img src="${getVenueMainImage(venue)}" alt="${venue.name}" />
      </div>
      <div class="sheet-packages">
        ${renderSheetPackages(venue.packages || [])}
      </div>
      <div class="sheet-map" id="sheet-map"></div>
      <div class="sheet-links">
        ${renderSheetLinkBtn('website', venue.website, 'Website', ICONS.website)}
        ${renderSheetLinkBtn('instagram', venue.instagram, 'Instagram', ICONS.instagram)}
        ${renderSheetLinkBtn('maps', venue.lat && venue.lng ? `https://maps.google.com/?q=${venue.lat},${venue.lng}` : null, 'Google Maps', ICONS.maps)}
      </div>
      ${renderSaveStar(venue)}
    </div>
  `;
  document.body.appendChild(sheet);
  
  // Enhanced event listeners for mobile
  const closeBtn = sheet.querySelector('.sheet-close');
  addMobileEventListeners(closeBtn, ['click', 'touchstart'], closeSheet);
  addMobileEventListeners(dim, ['click', 'touchstart'], closeSheet);
  
  // Save star functionality with enhanced mobile support
  const saveStar = sheet.querySelector('.save-star');
  if (saveStar) {
    addMobileEventListeners(saveStar, ['click', 'touchstart'], (e) => {
      e.stopPropagation();
      toggleSaveVenue(venue);
      saveStar.classList.toggle('saved', isVenueSaved(venue));
    });
  }
  
  // Disable background scroll
  document.body.style.overflow = 'hidden';
  
  // Initialize map after a short delay
  setTimeout(() => {
    initSheetMap(venue);
  }, 100);
}

function closeSheet() {
  const sheet = document.querySelector('.bottom-sheet');
  const dim = document.querySelector('.sheet-dim');
  if (sheet) sheet.remove();
  if (dim) dim.remove();
  document.body.style.overflow = '';
}

function initSheetMap(venue) {
  const mapContainer = document.getElementById('sheet-map');
  if (!mapContainer) return;
  
  // Enhanced map options for mobile
  const mapOptions = {
    zoomControl: false,
    attributionControl: true,
    // Improve touch interaction on mobile
    tap: true,
    // Prevent zoom on double tap
    doubleClickZoom: false
  };
  
  // Initialize map
  const map = L.map('sheet-map', mapOptions).setView([venue.lat, venue.lng], 14);
  window._sheetMap = map;
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Add zoom control for mobile
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);
  
  // Add venue marker
  const venueMarker = L.marker([venue.lat, venue.lng]).addTo(map);
  venueMarker.bindPopup(venue.name);
  
  // Add nearby venue markers (grey)
  const nearbyVenues = getNearbyVenues(venue, 2); // 2km radius
  nearbyVenues.forEach(nearby => {
    const marker = L.marker([nearby.lat, nearby.lng], {
      icon: L.divIcon({
        className: 'nearby-marker',
        html: '●',
        iconSize: [8, 8]
      })
    }).addTo(map);
    marker.setStyle({ color: '#bbb' });
  });
}

// --- INIT PATCH ---
loadSavedVenues();

// --- INITIALIZATION ---
// Load venues and initialize app
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
      applyFilters();
      setupSearch();
      setupMapExpandShrink();
      initMainMap();
      setupTopBar();
      // Initialize mobile support
      initMobileSupport();
    });
  })
  .catch(() => {
    document.getElementById('venue-list').innerHTML = '<p class="error-msg">Failed to load venues.</p>';
  });

// Helper functions
function getNearbyVenues(venue, radiusKm) {
  return allVenues.filter(v => {
    if (v === venue || !v.lat || !v.lng) return false;
    const dist = getDistance(venue.lat, venue.lng, v.lat, v.lng);
    return dist <= radiusKm;
  });
}

function renderSheetPackages(packages) {
  if (!packages || packages.length === 0) {
    return '<div class="no-packages">No packages available</div>';
  }
  
  return packages.map(pkg => `
    <div class="sheet-package">
      <div class="package-header">
        <h4 class="package-name">${pkg.name}</h4>
        <div class="package-meta">
          <span class="package-price">$${pkg.price}</span>
          <span class="package-duration">${pkg.duration}</span>
        </div>
      </div>
      <div class="package-details">
        <div class="package-days">
          ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => `
            <button class="sheet-day-btn ${pkg.days && pkg.days.includes(i + 1) ? 'active' : 'disabled'}" disabled>
              ${day}
            </button>
          `).join('')}
        </div>
        <div class="package-sessions">
          ${pkg.sessions ? pkg.sessions.map(session => `
            <span class="sheet-session">${session}</span>
          `).join('') : ''}
        </div>
        ${pkg.description ? `<div class="package-description">${pkg.description}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function renderSheetLinkBtn(type, url, label, iconSvg) {
  const active = !!url;
  return `<a class="sheet-link-btn${active ? ' active' : ''}" href="${active ? url : '#'}" target="_blank" rel="noopener" ${active ? '' : 'tabindex="-1" aria-disabled="true"'}>${iconSvg}${label}</a>`;
}

function renderVenueCard(venue, idx) {
  const packages = venue.packages || [];
  
  return `
    <div class="venue-card" data-index="${idx}">
      <div class="venue-header">
        <div class="venue-bg-image">
          <img src="${getVenueMainImage(venue)}" alt="${venue.name}" loading="lazy" />
        </div>
        <div class="venue-overlay">
          <h3 class="venue-name">${venue.name}</h3>
          <div class="venue-tags">
            <span class="venue-tag">${venue.suburb || ''}</span>
            <span class="venue-tag">${venue.cuisine || ''}</span>
          </div>
        </div>
        ${renderSaveStar(venue)}
      </div>
      ${packages.length > 0 ? `
        <div class="venue-packages">
          ${packages.map(pkg => `
            <div class="package-item">
              <div class="package-header">
                <h4 class="package-name">${pkg.name}</h4>
                <div class="package-meta">
                  <span class="package-price">$${pkg.price} pp</span>
                  <span class="package-duration">${pkg.duration}</span>
                </div>
              </div>
              <div class="package-details">
                <div class="package-days">
                  ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => `
                    <button class="day-btn ${pkg.days && pkg.days.includes(i + 1) ? 'active' : 'disabled'}" disabled>
                      ${day}
                    </button>
                  `).join('')}
                </div>
                <div class="package-sessions">
                  ${pkg.sessions ? pkg.sessions.map(session => `
                    <span class="session-btn">${session}</span>
                  `).join('') : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="no-packages">No packages available</div>'}
    </div>
  `;
}

function renderVenues() {
  const venueList = document.getElementById('venue-list');
  if (!venueList) return;
  
  venueList.innerHTML = filteredVenues.map((venue, idx) => renderVenueCard(venue, idx)).join('');
  
  // Add enhanced click listeners to venue cards
  venueList.querySelectorAll('.venue-card').forEach((card, idx) => {
    addMobileEventListeners(card, ['click', 'touchstart'], (e) => {
      // Don't open modal if clicking on star
      if (e.target.closest('.save-star')) {
        return;
      }
      console.log('Opening modal for venue:', filteredVenues[idx].name);
      openModal(filteredVenues[idx]);
    });
    
    // Prevent zoom on double tap
    preventTouchZoom(card);
  });
  
  // Add enhanced save star listeners
  venueList.querySelectorAll('.save-star').forEach((star, idx) => {
    addMobileEventListeners(star, ['click', 'touchstart'], (e) => {
      e.preventDefault();
      e.stopPropagation();
      const venue = filteredVenues[idx];
      console.log('Toggling save for venue:', venue.name);
      toggleSaveVenue(venue);
      star.classList.toggle('saved', isVenueSaved(venue));
    });
    
    // Prevent zoom on double tap
    preventTouchZoom(star);
  });
}
