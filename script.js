/*
  Simplified brunch directory app with improved mobile UX.

  This script rebuilds the core functionality of the original brunch app from
  scratch.  It focuses on search, sorting, saving favourites and displaying
  venue details in a bottom sheet.  The code intentionally omits some of the
  more advanced filter panels (suburb, price, cuisine) from the original
  repository in order to keep the example concise.  However, it demonstrates
  how to implement the requested mobile improvements:

  - Accidental taps are mitigated by a custom `addTapListener` which only
    triggers a handler if the user doesn’t drag more than a small threshold.
  - The bottom sheet includes a scroll handle, a header row with a close
    button on the left and a save button on the right, and a persistent link
    bar grouping website/Instagram/map actions.
  - All interactive elements have appropriate ARIA labels and meet minimum
    touch target sizes.

  You can further extend this script to re‑implement suburb/price/cuisine
  filtering by adding your own filter state and modifying `applyFilters()`.
*/

// Icons for the link bar.  These match the inline SVGs from the original app.
const ICONS = {
  website: `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h12M10 4a16 16 0 0 1 0 12M10 4a16 16 0 0 0 0 12" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  instagram: `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="14.5" cy="5.5" r="1" fill="currentColor"/></svg>`,
  maps: `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a6 6 0 0 1 6 6c0 4-6 10-6 10S4 12 4 8a6 6 0 0 1 6-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
};

// Application state
let allVenues = [];
let filteredVenues = [];
let savedVenues = JSON.parse(localStorage.getItem('brunch_saved') || '[]');
let sortBy = 'az';
let searchTerm = '';

// --- Filter State ---
// Structure: { selectedSuburbs: [], selectedPrices: [], selectedCuisines: [] }
let filterState = {
  selectedSuburbs: [],
  selectedPrices: [],
  selectedCuisines: []
};
let pendingFilterState = {
  selectedSuburbs: [],
  selectedPrices: [],
  selectedCuisines: []
};
// Dynamic options, built after venue load
let allSuburbs = [];
let otherSuburbs = [];
let allCuisines = [];
let otherCuisines = [];
let priceRanges = [];

// Utility: detect mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Adds a tap listener to an element that ignores accidental drags.
 * The handler fires on click for desktop and on touchend for mobile only
 * if the finger hasn’t moved more than 10 px.
 * @param {Element} element
 * @param {Function} handler
 */
function addTapListener(element, handler) {
  let startX = 0;
  let startY = 0;
  let moved = false;
  element.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    }
  }, { passive: true });
  element.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
      moved = true;
    }
  }, { passive: true });
  element.addEventListener('touchend', (e) => {
    if (!moved) {
      handler(e);
    }
  });
  element.addEventListener('click', handler);
}

/**
 * Returns HTML for the save star button. The button uses a ★ character
 * and toggles the `saved` class when the venue is saved.
 * This version is for use both in card and modal, so no position here.
 */
function renderSaveStar(venue) {
  const saved = savedVenues.some(v => v.id === venue.id || v.name === venue.name);
  const aria = saved ? 'Unsave venue' : 'Save venue';
  return `<button class="save-star${saved ? ' saved' : ''}" aria-label="${aria}" type="button">★</button>`;
}

/**
 * Renders a single venue card.
 * Each card has two sections:
 *  1. Venue info: name, suburb, cuisine (as rounded pills)
 *  2. Package info: title, price, rating, days (as pills), times (as pills)
 * The star save icon is in the top-right corner of the image container.
 * Fallback placeholder images are used if venue.images is missing.
 */
function renderVenueCard(venue, idx) {
  // Fallback placeholder for missing images
  let mainImg = (venue.images && venue.images.length > 0)
    ? venue.images[0]
    : "images/placeholder-crowd.jpg";
  // Venue info tags (suburb, cuisine)
  let venueTags = '';
  if (venue.suburb) {
    venueTags += `<span class="tag">${venue.suburb}</span>`;
  }
  if (venue.cuisine) {
    venueTags += `<span class="tag">${venue.cuisine}</span>`;
  }
  // Package info (show first package, or placeholder)
  let pkgHtml = '';
  if (venue.packages && venue.packages.length > 0) {
    const pkg = venue.packages[0];
    // Days as pills
    const daysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    let daysPills = '';
    if (pkg.days && Array.isArray(pkg.days)) {
      daysPills = pkg.days.map(d =>
        `<span class="pill">${daysShort[(d - 1) % 7]}</span>`
      ).join('');
    }
    // Times as pills
    let timePills = '';
    if (pkg.sessions && Array.isArray(pkg.sessions)) {
      timePills = pkg.sessions.map(t =>
        `<span class="pill">${t}</span>`
      ).join('');
    }
    pkgHtml = `
      <div class="venue-package-title">${pkg.name || ''}</div>
      <div class="price-rating-row">
        <span class="pill price-pill">$${pkg.price || ''}</span>
        ${venue.rating ? `<span class="pill rating-pill">★ ${venue.rating}</span>` : ''}
      </div>
      <div class="venue-days-row">${daysPills}</div>
      <div class="venue-times-row">${timePills}</div>
    `;
  } else {
    pkgHtml = `<div class="venue-package-title">No packages listed</div>`;
  }
  return `
    <div class="venue-card" data-index="${idx}">
      <div class="venue-image-block" style="position:relative;">
        <img src="${mainImg}" alt="${venue.name}" loading="lazy" />
        <button class="save-btn">${renderSaveStar(venue)}</button>
      </div>
      <div class="venue-info-block">
        <div class="venue-name-row">
          <span class="venue-name">${venue.name}</span>
        </div>
        <div class="venue-tags-row">
          ${venueTags}
        </div>
        <div class="venue-package-block">
          ${pkgHtml}
        </div>
      </div>
    </div>
  `;
}

/**
 * Applies the search and sort to the list of venues and re‑renders the cards.
 */
function applyFilters() {
  filteredVenues = allVenues.filter(v => {
    // SEARCH
    if (searchTerm && !v.name.toLowerCase().includes(searchTerm)) return false;
    // SUBURB FILTER
    if (filterState.selectedSuburbs.length > 0) {
      let inMain = filterState.selectedSuburbs.includes(v.suburb);
      let inOther = filterState.selectedSuburbs.includes('Other') && otherSuburbs.includes(v.suburb);
      if (!inMain && !inOther) return false;
    }
    // PRICE FILTER
    if (filterState.selectedPrices.length > 0) {
      // At least one package price in selected range
      let found = false;
      if (v.packages && v.packages.length) {
        for (let pkg of v.packages) {
          let price = parseFloat(pkg.price);
          for (let rng of filterState.selectedPrices) {
            let rangeObj = priceRanges.find(r => r.id === rng);
            if (rangeObj && price >= rangeObj.min && price <= rangeObj.max) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
      if (!found) return false;
    }
    // CUISINE FILTER
    if (filterState.selectedCuisines.length > 0) {
      let inMain = filterState.selectedCuisines.includes(v.cuisine);
      let inOther = filterState.selectedCuisines.includes('Other') && otherCuisines.includes(v.cuisine);
      if (!inMain && !inOther) return false;
    }
    return true;
  });
  // Sort A–Z or by price if packages available
  filteredVenues.sort((a, b) => {
    if (sortBy === 'price-low' || sortBy === 'price-high') {
      const getMinPrice = (venue) => {
        if (!venue.packages || venue.packages.length === 0) return Infinity;
        return Math.min(...venue.packages.map(p => parseFloat(p.price)));
      };
      const pa = getMinPrice(a);
      const pb = getMinPrice(b);
      if (sortBy === 'price-low') return pa - pb;
      return pb - pa;
    }
    // Default alphabetical
    return a.name.localeCompare(b.name);
  });
  renderVenues();
  updateFilterPills();
}
// ---- Filter Option Rendering and Logic ----

// Build allSuburbs, allCuisines, priceRanges from allVenues
function buildDynamicFilterOptions() {
  // Suburbs
  const suburbCounts = {};
  allVenues.forEach(v => {
    if (v.suburb) {
      suburbCounts[v.suburb] = (suburbCounts[v.suburb] || 0) + 1;
    }
  });
  // Show main suburbs (top N by count), rest as Other
  let sortedSuburbs = Object.entries(suburbCounts).sort((a, b) => b[1] - a[1]);
  allSuburbs = sortedSuburbs.slice(0, 8).map(x => x[0]).sort();
  otherSuburbs = sortedSuburbs.slice(8).map(x => x[0]);

  // Cuisines
  const cuisineCounts = {};
  allVenues.forEach(v => {
    if (v.cuisine) {
      cuisineCounts[v.cuisine] = (cuisineCounts[v.cuisine] || 0) + 1;
    }
  });
  let sortedCuisines = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1]);
  allCuisines = sortedCuisines.slice(0, 8).map(x => x[0]).sort();
  otherCuisines = sortedCuisines.slice(8).map(x => x[0]);

  // Price ranges: bucket by package price
  let prices = [];
  allVenues.forEach(v => {
    if (v.packages && v.packages.length) {
      v.packages.forEach(pkg => {
        let price = parseFloat(pkg.price);
        if (!isNaN(price)) prices.push(price);
      });
    }
  });
  prices.sort((a, b) => a - b);
  // Build 3 buckets: <=70, 71-100, >100 (dynamic if price spread is different)
  let min = prices.length ? prices[0] : 0;
  let max = prices.length ? prices[prices.length - 1] : 200;
  // Use fixed buckets for clarity
  priceRanges = [
    {id: 'under70', min: 0, max: 70, label: '<$70'},
    {id: '70to100', min: 70.01, max: 100, label: '$70–100'},
    {id: 'over100', min: 100.01, max: 9999, label: '>$100'}
  ];
}

// Renders filter options in a panel (called when panel is opened)
function renderFilterOptions(category) {
  let container, options, selected, isOther, optionList;
  if (category === 'suburb') {
    container = document.getElementById('suburb-pills');
    options = allSuburbs;
    isOther = otherSuburbs.length > 0;
    selected = pendingFilterState.selectedSuburbs;
    optionList = options.map(opt =>
      `<div class="filter-option${selected.includes(opt) ? ' selected' : ''}" data-value="${opt}">${opt}</div>`
    );
    if (isOther) {
      optionList.push(`<div class="filter-option${selected.includes('Other') ? ' selected' : ''}" data-value="Other">Other</div>`);
    }
    container.innerHTML = optionList.join('');
  } else if (category === 'price') {
    container = document.getElementById('price-pills');
    selected = pendingFilterState.selectedPrices;
    optionList = priceRanges.map(r =>
      `<div class="filter-option${selected.includes(r.id) ? ' selected' : ''}" data-value="${r.id}">${r.label}</div>`
    );
    container.innerHTML = optionList.join('');
  } else if (category === 'cuisine') {
    container = document.getElementById('cuisine-pills');
    options = allCuisines;
    isOther = otherCuisines.length > 0;
    selected = pendingFilterState.selectedCuisines;
    optionList = options.map(opt =>
      `<div class="filter-option${selected.includes(opt) ? ' selected' : ''}" data-value="${opt}">${opt}</div>`
    );
    if (isOther) {
      optionList.push(`<div class="filter-option${selected.includes('Other') ? ' selected' : ''}" data-value="Other">Other</div>`);
    }
    container.innerHTML = optionList.join('');
  }
}

// Sets up filter panel interactions
function setupFilterPanels() {
  // Open/close logic for pills in top bar
  ['suburb', 'price', 'cuisine'].forEach(category => {
    const pill = document.getElementById(`${category}-pill`);
    if (pill) {
      addTapListener(pill, (e) => {
        e.stopPropagation();
        openFilterPanel(category);
      });
    }
    // Apply/Reset buttons
    const applyBtn = document.getElementById(`apply-${category}`);
    const resetBtn = document.getElementById(`reset-${category}`);
    if (applyBtn) {
      addTapListener(applyBtn, (e) => {
        e.stopPropagation();
        // Copy pending -> filterState
        filterState[`selected${capitalize(category)}s`] = [...pendingFilterState[`selected${capitalize(category)}s`]];
        applyFilters();
        closeAllFilterPanels();
      });
    }
    if (resetBtn) {
      addTapListener(resetBtn, (e) => {
        e.stopPropagation();
        // Clear only pending for this category
        pendingFilterState[`selected${capitalize(category)}s`] = [];
        renderFilterOptions(category);
      });
    }
  });
  // Close buttons for each panel
  document.querySelectorAll('.slide-panel .slide-close').forEach(btn => {
    addTapListener(btn, (e) => {
      e.stopPropagation();
      closeAllFilterPanels();
    });
  });
  // Option click handler (delegated)
  ['suburb', 'price', 'cuisine'].forEach(category => {
    const pillsId = `${category}-pills`;
    const pillsDiv = document.getElementById(pillsId);
    if (pillsDiv) {
      pillsDiv.addEventListener('click', function(e) {
        const opt = e.target.closest('.filter-option');
        if (!opt) return;
        let arrName = `selected${capitalize(category)}s`;
        let arr = pendingFilterState[arrName];
        const val = opt.getAttribute('data-value');
        const idx = arr.indexOf(val);
        if (idx >= 0) {
          arr.splice(idx, 1);
        } else {
          arr.push(val);
        }
        renderFilterOptions(category);
      });
    }
  });
}

// Open a filter panel, copying state and rendering options
function openFilterPanel(category) {
  closeAllFilterPanels();
  // Copy filterState to pending
  ['suburb', 'price', 'cuisine'].forEach(cat => {
    pendingFilterState[`selected${capitalize(cat)}s`] = [...filterState[`selected${capitalize(cat)}s`]];
  });
  // Show panel
  document.getElementById(`${category}-panel`).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Render options
  renderFilterOptions(category);
  // Set aria-pressed for top pills
  ['suburb', 'price', 'cuisine'].forEach(cat => {
    const pill = document.getElementById(`${cat}-pill`);
    if (pill) pill.setAttribute('aria-pressed', cat === category ? 'true' : 'false');
  });
}

function closeAllFilterPanels() {
  ['suburb', 'price', 'cuisine'].forEach(cat => {
    const panel = document.getElementById(`${cat}-panel`);
    if (panel) panel.classList.add('hidden');
    const pill = document.getElementById(`${cat}-pill`);
    if (pill) pill.setAttribute('aria-pressed', 'false');
  });
  document.body.style.overflow = '';
  // Clear temp state? (No, keep pendingFilterState for next open)
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show .active and badge with count for each top bar filter pill
function updateFilterPills() {
  [
    {cat: 'suburb', state: filterState.selectedSuburbs},
    {cat: 'price', state: filterState.selectedPrices},
    {cat: 'cuisine', state: filterState.selectedCuisines}
  ].forEach(({cat, state}) => {
    const pill = document.getElementById(`${cat}-pill`);
    if (!pill) return;
    // Remove existing badge
    let badge = pill.querySelector('.filter-badge');
    if (badge) badge.remove();
    // Active if any filter set
    if (state.length > 0) {
      pill.classList.add('active');
      // Show count badge
      const count = state.length;
      const badgeDiv = document.createElement('span');
      badgeDiv.className = 'filter-badge';
      badgeDiv.textContent = count;
      pill.appendChild(badgeDiv);
    } else {
      pill.classList.remove('active');
    }
  });
}

/**
 * Renders the list of venue cards and wires up event listeners.
 */
function renderVenues() {
  const container = document.getElementById('venue-list');
  if (!container) return;
  container.innerHTML = filteredVenues.map((v, i) => renderVenueCard(v, i)).join('');
  // Add listeners
  container.querySelectorAll('.venue-card').forEach((card) => {
    const idx = parseInt(card.getAttribute('data-index'), 10);
    addTapListener(card, (e) => {
      // if the user tapped the save star, ignore
      if (e.target && e.target.closest('.save-star')) return;
      openModal(filteredVenues[idx]);
    });
    // Save star inside card
    const star = card.querySelector('.save-star');
    if (star) {
      addTapListener(star, (ev) => {
        ev.stopPropagation();
        const venue = filteredVenues[idx];
        toggleSaveVenue(venue);
        // Update all stars for this venue
        document.querySelectorAll('.venue-card').forEach(c => {
          if (c.querySelector('.save-star')) {
            const cardIdx = parseInt(c.getAttribute('data-index'), 10);
            if (filteredVenues[cardIdx].name === venue.name) {
              const starEl = c.querySelector('.save-star');
              if (starEl) starEl.classList.toggle('saved', isVenueSaved(venue));
            }
          }
        });
      });
    }
  });
}

/**
 * Toggles the saved state of a venue and persists the list to localStorage.
 */
function toggleSaveVenue(venue) {
  const index = savedVenues.findIndex(v => v.id === venue.id || v.name === venue.name);
  if (index >= 0) {
    savedVenues.splice(index, 1);
  } else {
    savedVenues.push(venue);
  }
  localStorage.setItem('brunch_saved', JSON.stringify(savedVenues));
}

/**
 * Returns true if the venue is currently saved.
 */
function isVenueSaved(venue) {
  return savedVenues.some(v => v.id === venue.id || v.name === venue.name);
}

/**
 * Creates the persistent links bar for the sheet.  Inactive links are given
 * the `aria-disabled` attribute and receive no pointer events.
 */
function renderLinksBar(venue) {
  const websiteUrl = venue.website || null;
  const instagramUrl = venue.instagram || null;
  const mapsUrl = (venue.lat && venue.lng) ? `https://maps.google.com/?q=${venue.lat},${venue.lng}` : null;
  const linkBtn = (label, url, iconSvg) => {
    const active = !!url;
    return `<a class="sheet-link-btn${active ? ' active' : ''}" href="${active ? url : '#'}" target="_blank" rel="noopener" ${active ? '' : 'aria-disabled="true" tabindex="-1"'}>${iconSvg}<span>${label}</span></a>`;
  };
  return `<div class="sheet-links-bar">
    ${linkBtn('Website', websiteUrl, ICONS.website)}
    ${linkBtn('Instagram', instagramUrl, ICONS.instagram)}
    ${linkBtn('Maps', mapsUrl, ICONS.maps)}
  </div>`;
}

/**
 * Renders the list of packages for the sheet.
 */
function renderSheetPackages(packages) {
  if (!packages || packages.length === 0) {
    return '<div class="no-packages">No packages available</div>';
  }
  return packages.map(pkg => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return `<div class="sheet-package">
      <div class="package-header">
        <h4 class="package-name">${pkg.name}</h4>
        <div class="package-meta"><span class="package-price">$${pkg.price}</span><span class="package-duration">${pkg.duration}</span></div>
      </div>
      <div class="package-days">
        ${days.map((d, i) => `<button class="sheet-day-btn ${pkg.days && pkg.days.includes(i + 1) ? 'active' : ''}" disabled>${d}</button>`).join('')}
      </div>
      <div class="package-sessions">
        ${pkg.sessions ? pkg.sessions.map(s => `<span class="sheet-session">${s}</span>`).join('') : ''}
      </div>
      ${pkg.description ? `<div class="package-description">${pkg.description}</div>` : ''}
    </div>`;
  }).join('');
}

/**
 * Opens a modal bottom sheet showing details about a venue.  The sheet
 * includes a header with close/save, a persistent links bar, a carousel
 * placeholder (single image), a list of packages and a map.  Background
 * scrolling is disabled while the sheet is open.
 */
function openModal(venue) {
  // Remove any existing sheet/dim
  const existingSheet = document.querySelector('.bottom-sheet');
  const existingDim = document.querySelector('.sheet-dim');
  if (existingSheet) existingSheet.remove();
  if (existingDim) existingDim.remove();
  // Create dim overlay
  const dim = document.createElement('div');
  dim.className = 'sheet-dim';
  // When tapping the dim, close the sheet only (no propagation)
  addTapListener(dim, (e) => {
    e.stopPropagation();
    closeSheet();
  });
  document.body.appendChild(dim);
  // Create sheet
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';

  // Build carousel images
  let carouselImgs = [];
  if (venue.images && venue.images.length > 0) {
    carouselImgs = venue.images.map(img =>
      `<img src="${img}" alt="${venue.name}" loading="lazy" />`
    );
  } else {
    // Show all three placeholders, in order
    carouselImgs = [
      `<img src="images/placeholder-brunch.jpg" alt="Brunch placeholder" loading="lazy" />`,
      `<img src="images/placeholder-drinks.jpg" alt="Drinks placeholder" loading="lazy" />`,
      `<img src="images/placeholder-crowd.jpg" alt="Crowd placeholder" loading="lazy" />`
    ];
  }

  // Build HTML
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <button class="sheet-close-btn" aria-label="Close">×</button>
      <div class="sheet-title-container">
        <h3 class="sheet-title">${venue.name}</h3>
        <div class="sheet-suburb">${venue.suburb || ''}</div>
      </div>
      ${renderSaveStar(venue)}
    </div>
    ${renderLinksBar(venue)}
    <div class="sheet-content">
      <div class="sheet-carousel">
        ${carouselImgs.join('')}
      </div>
      <div class="sheet-packages">${renderSheetPackages(venue.packages)}</div>
      <div class="sheet-map" id="sheet-map"></div>
    </div>
  `;
  document.body.appendChild(sheet);
  // Wire up close button
  const closeBtn = sheet.querySelector('.sheet-close-btn');
  addTapListener(closeBtn, (e) => {
    e.stopPropagation();
    closeSheet();
  });
  // Wire up save star in sheet
  const saveStarBtn = sheet.querySelector('.save-star');
  if (saveStarBtn) {
    addTapListener(saveStarBtn, (e) => {
      e.stopPropagation();
      toggleSaveVenue(venue);
      saveStarBtn.classList.toggle('saved', isVenueSaved(venue));
      // Update stars in list if necessary
      document.querySelectorAll('.venue-card').forEach(card => {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        const v = filteredVenues[idx];
        if (v.name === venue.name) {
          const starEl = card.querySelector('.save-star');
          if (starEl) starEl.classList.toggle('saved', isVenueSaved(v));
        }
      });
    });
  }
  // Disable background scroll
  document.body.style.overflow = 'hidden';
  // Initialize mini map if coordinates available
  if (venue.lat && venue.lng) {
    setTimeout(() => {
      const mapContainer = document.getElementById('sheet-map');
      if (!mapContainer) return;
      const map = L.map(mapContainer, { zoomControl: false, attributionControl: true, doubleClickZoom: false, tap: true }).setView([venue.lat, venue.lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.marker([venue.lat, venue.lng]).addTo(map).bindPopup(venue.name);
    }, 50);
  }
}

/**
 * Closes the modal bottom sheet and restores scrolling.
 */
function closeSheet() {
  const sheet = document.querySelector('.bottom-sheet');
  const dim = document.querySelector('.sheet-dim');
  if (sheet) sheet.remove();
  if (dim) dim.remove();
  document.body.style.overflow = '';
}

/**
 * Shows the saved venues panel.  This panel lists saved venues and allows
 * users to open them in the modal or remove them from the list.
 */
function showSavedPanel() {
  const panel = document.getElementById('saved-panel');
  const content = document.getElementById('saved-content');
  if (!panel || !content) return;
  // Build saved list
  let html = '';
  if (!savedVenues.length) {
    html = '<div class="empty-msg">No venues saved yet.</div>';
  } else {
    html = savedVenues.map((venue, i) => {
      const mainImg = (venue.images && venue.images.length ? venue.images[0] : (venue.imageUrl || ''));
      return `<div class="saved-item" data-index="${i}">
        <img src="${mainImg}" alt="${venue.name}" />
        <div class="saved-item-info"><div class="saved-item-name">${venue.name}</div><div class="saved-item-suburb">${venue.suburb || ''}</div></div>
        <button class="saved-item-remove" aria-label="Remove" data-index="${i}">×</button>
      </div>`;
    }).join('');
  }
  content.innerHTML = html;
  panel.classList.remove('hidden');
  // Prevent background scroll
  document.body.style.overflow = 'hidden';
  // Close slide panel on close button
  panel.querySelectorAll('.slide-close').forEach(btn => {
    addTapListener(btn, (e) => {
      e.stopPropagation();
      hideSavedPanel();
    });
  });
  // Click on saved item opens modal
  content.querySelectorAll('.saved-item').forEach(item => {
    addTapListener(item, (e) => {
      if (e.target && e.target.classList.contains('saved-item-remove')) return;
      const idx = parseInt(item.getAttribute('data-index'), 10);
      openModal(savedVenues[idx]);
      hideSavedPanel();
    });
  });
  // Remove button
  content.querySelectorAll('.saved-item-remove').forEach(btn => {
    addTapListener(btn, (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      savedVenues.splice(idx, 1);
      localStorage.setItem('brunch_saved', JSON.stringify(savedVenues));
      showSavedPanel();
    });
  });
}

/**
 * Hides the saved panel and restores scrolling.
 */
function hideSavedPanel() {
  const panel = document.getElementById('saved-panel');
  if (panel) panel.classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * Sets up the top bar interactions: search input, sort button and saved
 * button.  Sort options are handled in the sort panel.
 */
function setupTopBar() {
  // Saved button opens the saved panel
  const savedBtn = document.getElementById('saved-btn');
  if (savedBtn) {
    addTapListener(savedBtn, (e) => {
      e.stopPropagation();
      showSavedPanel();
    });
  }
  // Sort button
  const sortBtn = document.getElementById('sort-btn');
  if (sortBtn) {
    addTapListener(sortBtn, (e) => {
      e.stopPropagation();
      closeAllFilterPanels();
      const panel = document.getElementById('sort-panel');
      if (panel) {
        panel.classList.toggle('hidden');
        document.body.style.overflow = panel.classList.contains('hidden') ? '' : 'hidden';
      }
    });
  }
  // Hook up sort radio buttons
  document.querySelectorAll('input[name="sort"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      sortBy = e.target.value;
      applyFilters();
    });
  });
  // Close buttons for sort and saved panels
  document.querySelectorAll('#sort-panel .slide-close, #saved-panel .slide-close').forEach(btn => {
    addTapListener(btn, (e) => {
      e.stopPropagation();
      btn.closest('.slide-panel').classList.add('hidden');
      document.body.style.overflow = '';
    });
  });
  // Sort panel Reset/Apply
  document.getElementById('reset-sort')?.addEventListener('click', (e) => {
    document.querySelector('input[name="sort"][value="az"]').checked = true;
    sortBy = 'az';
    applyFilters();
    document.getElementById('sort-panel').classList.add('hidden');
    document.body.style.overflow = '';
  });
  document.getElementById('apply-sort')?.addEventListener('click', (e) => {
    document.getElementById('sort-panel').classList.add('hidden');
    document.body.style.overflow = '';
  });
}

/**
 * Sets up the search input handler.  Updates `searchTerm` and triggers
 * `applyFilters()` on each input event.
 */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', () => {
      searchTerm = input.value.trim().toLowerCase();
      applyFilters();
    });
  }
}

// Initialise the app once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Load venues from JSON file
  fetch('brunch_venue.json')
    .then(res => res.json())
    .then(data => {
      allVenues = data;
      buildDynamicFilterOptions();
      applyFilters();
      setupSearch();
      setupTopBar();
      setupFilterPanels();
      updateFilterPills();
    })
    .catch(err => {
      const container = document.getElementById('venue-list');
      if (container) container.innerHTML = '<p class="error-msg">Failed to load venues.</p>';
      console.error(err);
    });
});
