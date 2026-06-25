/* ── Toast System ──────────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icon = type === 'success' ? '✓' : '✕';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ── Page Loader ───────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 800);
  }
});

/* ── Navbar scroll behavior ────────────────────────────────────────────── */
const navbar = document.querySelector('.navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ── Mobile hamburger ──────────────────────────────────────────────────── */
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const spans = hamburger.querySelectorAll('span');
    spans[0].style.transform = navLinks.classList.contains('open') ? 'rotate(45deg) translate(5px,5px)' : '';
    spans[1].style.opacity   = navLinks.classList.contains('open') ? '0' : '1';
    spans[2].style.transform = navLinks.classList.contains('open') ? 'rotate(-45deg) translate(5px,-5px)' : '';
  });
  document.addEventListener('click', e => {
    if (!navbar.contains(e.target)) navLinks.classList.remove('open');
  });
}

/* ── Smooth scroll for anchor links ────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks?.classList.remove('open');
    }
  });
});

/* ── Format date ───────────────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── Default thumbnail SVG placeholder ─────────────────────────────────── */
function thumbSrc(p) {
  return p.thumbnail && p.thumbnail !== '' ? p.thumbnail : '/images/default-thumb.svg';
}

/* ── Build podcast card HTML ────────────────────────────────────────────── */
function buildCard(p) {
  return `
  <div class="podcast-card" data-id="${p.id}" style="animation-delay:${Math.random()*0.15}s">
    <div class="card-thumb">
      <img src="${thumbSrc(p)}" alt="${p.title}" loading="lazy"
           onerror="this.src='/images/default-thumb.svg'">
      <div class="card-overlay"></div>
      <div class="card-duration">${p.duration || '—'}</div>
      <div class="card-play-btn"><div class="play-circle">▶</div></div>
    </div>
    <div class="card-body">
      <span class="card-category">${p.category}</span>
      <h3 class="card-title">${p.title}</h3>
      <p class="card-desc">${p.description}</p>
      <div class="card-footer">
        <span class="card-date">${formatDate(p.date)}</span>
        <button class="card-watch-btn" onclick="event.stopPropagation();location.href='/podcast/${p.id}'">Watch</button>
      </div>
    </div>
  </div>`;
}

/* ── Home page logic ────────────────────────────────────────────────────── */
(async function initHome() {
  const grid         = document.getElementById('podcast-grid');
  const featuredWrap = document.getElementById('featured-wrap');
  const searchInput  = document.getElementById('search-input');
  const filterChips  = document.querySelectorAll('.chip');
  const sortSelect   = document.getElementById('sort-select');

  if (!grid) return;

  let allPodcasts   = [];
  let activeCategory = 'All';
  let searchTerm     = '';
  let sortOrder      = 'newest';

  async function fetchPodcasts() {
    try {
      const params = new URLSearchParams({ sort: sortOrder });
      if (searchTerm)    params.set('search', searchTerm);
      if (activeCategory !== 'All') params.set('category', activeCategory);

      const res  = await fetch('/api/podcasts?' + params);
      allPodcasts = await res.json();
      renderGrid();
      if (featuredWrap) renderFeatured();
    } catch {
      showToast('Could not load podcasts.', 'error');
    }
  }

  function renderGrid() {
    if (!allPodcasts.length) {
      grid.innerHTML = `
        <div class="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <h3>No podcasts found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>`;
      return;
    }
    grid.innerHTML = allPodcasts.map(buildCard).join('');
    grid.querySelectorAll('.podcast-card').forEach(card => {
      card.addEventListener('click', () => location.href = `/podcast/${card.dataset.id}`);
    });
  }

  function renderFeatured() {
    const featured = allPodcasts.find(p => p.featured) || allPodcasts[0];
    if (!featured || !featuredWrap) return;
    featuredWrap.innerHTML = `
      <div class="featured-card" onclick="location.href='/podcast/${featured.id}'">
        <div class="featured-thumb">
          <img src="${thumbSrc(featured)}" alt="${featured.title}"
               onerror="this.src='/images/default-thumb.svg'">
          <div class="play-overlay">
            <div class="play-btn-large">▶</div>
          </div>
        </div>
        <div class="featured-info">
          <span class="featured-category">${featured.category}</span>
          <h2 class="featured-title">${featured.title}</h2>
          <p class="featured-desc">${featured.description}</p>
          <div class="featured-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              ${featured.duration || '—'}
            </span>
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(featured.date)}
            </span>
          </div>
          <a href="/podcast/${featured.id}" class="btn-watch">▶ Watch Now</a>
        </div>
      </div>`;
  }

  // Filters
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.dataset.cat;
      fetchPodcasts();
    });
  });

  // Search (debounced)
  let searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchTerm = searchInput.value.trim();
        fetchPodcasts();
      }, 300);
    });
  }

  // Sort
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortOrder = sortSelect.value;
      fetchPodcasts();
    });
  }

  await fetchPodcasts();
})();
