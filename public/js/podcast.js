function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year:'numeric', month:'long', day:'numeric'
  });
}

function thumbSrc(p) {
  return p.thumbnail && p.thumbnail !== '' ? p.thumbnail : '/images/default-thumb.svg';
}

(async function() {
  const id = location.pathname.split('/').pop();

  try {
    const [podRes, allRes] = await Promise.all([
      fetch(`/api/podcasts/${id}`),
      fetch('/api/podcasts')
    ]);

    if (!podRes.ok) {
      document.getElementById('podcast-main').innerHTML =
        `<div style="padding:80px 5%;text-align:center;color:var(--text3)">
          <p style="font-size:3rem">🎙️</p>
          <h2 style="margin:16px 0 8px">Podcast not found</h2>
          <a href="/" style="color:var(--accent3)">← Back to home</a>
        </div>`;
      return;
    }

    const podcast = await podRes.json();
    const all     = await allRes.json();
    const related = all.filter(p => p.id !== id && p.category === podcast.category).slice(0, 3);

    // Update page title
    document.title = `${podcast.title} — StudioCast`;

    // Render hero
    const main = document.getElementById('podcast-main');
    main.innerHTML = `
      <div class="podcast-hero">
        <a href="/" class="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Home
        </a>
        <div class="podcast-grid-detail">
          <div>
            <div class="video-container">
              ${podcast.video
                ? `<video controls preload="metadata" poster="${thumbSrc(podcast)}">
                     <source src="${podcast.video}" type="video/mp4">
                     <source src="${podcast.video}" type="video/webm">
                     Your browser does not support video.
                   </video>`
                : `<div class="no-video">
                     <span>🎙️</span>
                     <p>No video file uploaded yet.</p>
                   </div>`
              }
            </div>
          </div>
          <div class="podcast-meta-panel">
            <span class="meta-category">${podcast.category}</span>
            <h1 class="meta-title">${podcast.title}</h1>
            <p class="meta-desc">${podcast.description}</p>
            <div class="meta-list">
              <div class="meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>${podcast.duration || '—'}</span>
              </div>
              <div class="meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${formatDate(podcast.date)}</span>
              </div>
              <div class="meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <span>${podcast.category}</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Related
    const relSection = document.getElementById('related-section');
    if (related.length) {
      relSection.innerHTML = `
        <div class="related-section">
          <h2 class="related-title">More in ${podcast.category}</h2>
          <div class="related-grid">
            ${related.map(r => `
              <div class="podcast-card" onclick="location.href='/podcast/${r.id}'" style="cursor:pointer">
                <div class="card-thumb">
                  <img src="${thumbSrc(r)}" alt="${r.title}" loading="lazy"
                       onerror="this.src='/images/default-thumb.svg'">
                  <div class="card-overlay"></div>
                  <div class="card-duration">${r.duration || '—'}</div>
                  <div class="card-play-btn"><div class="play-circle">▶</div></div>
                </div>
                <div class="card-body">
                  <span class="card-category">${r.category}</span>
                  <h3 class="card-title">${r.title}</h3>
                  <div class="card-footer">
                    <span class="card-date">${formatDate(r.date)}</span>
                    <button class="card-watch-btn" onclick="event.stopPropagation();location.href='/podcast/${r.id}'">Watch</button>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }

  } catch(err) {
    console.error(err);
  }
})();
