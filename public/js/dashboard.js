/* ── Toast ─────────────────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
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

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year:'numeric', month:'short', day:'numeric'
  });
}

/* ── Modal ─────────────────────────────────────────────────────────────── */
const modal         = document.getElementById('add-modal');
const addBtn        = document.getElementById('add-podcast-btn');
const modalClose    = document.getElementById('modal-close');
const cancelBtn     = document.getElementById('cancel-btn');

function openModal()  { modal.classList.add('open'); }
function closeModal() {
  modal.classList.remove('open');
  document.getElementById('add-form').reset();
  resetPreviews();
}

addBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ── Upload zones ──────────────────────────────────────────────────────── */
function setupUploadZone(zoneId, inputId, previewId, type) {
  const zone    = document.getElementById(zoneId);
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, input, preview, zone, type);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0], input, preview, zone, type);
  });
}

function handleFile(file, input, preview, zone, type) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;

  if (type === 'image') {
    const url = URL.createObjectURL(file);
    preview.querySelector('img').src = url;
  }
  preview.querySelector('.file-name').textContent = file.name;
  preview.classList.add('show');
  zone.style.display = 'none';
}

function resetPreviews() {
  ['thumb-preview','video-preview'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('show');
  });
  ['thumb-zone','video-zone'].forEach(id => {
    document.getElementById(id).style.display = '';
  });
}

document.querySelectorAll('.remove-file').forEach(btn => {
  btn.addEventListener('click', () => {
    const previewId = btn.closest('.upload-preview').id;
    const zoneId    = previewId === 'thumb-preview' ? 'thumb-zone' : 'video-zone';
    const inputId   = previewId === 'thumb-preview' ? 'thumb-input' : 'video-input';
    document.getElementById(previewId).classList.remove('show');
    document.getElementById(zoneId).style.display = '';
    document.getElementById(inputId).value = '';
  });
});

setupUploadZone('thumb-zone','thumb-input','thumb-preview','image');
setupUploadZone('video-zone','video-input','video-preview','video');

/* ── Logout ────────────────────────────────────────────────────────────── */
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
});

/* ── Fetch & render podcasts ────────────────────────────────────────────── */
let podcastsData = [];

async function loadPodcasts() {
  const tbody    = document.getElementById('podcasts-tbody');
  const countEl  = document.getElementById('podcast-count');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">Loading…</td></tr>`;
  try {
    const res   = await fetch('/api/podcasts');
    podcastsData = await res.json();
    countEl.textContent = podcastsData.length;

    if (!podcastsData.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3)">No podcasts yet. Add your first one!</td></tr>`;
      return;
    }

    tbody.innerHTML = podcastsData.map(p => `
      <tr>
        <td>
          <img src="${p.thumbnail || '/images/default-thumb.svg'}" alt="${p.title}"
               class="thumb-mini" onerror="this.src='/images/default-thumb.svg'">
        </td>
        <td><strong>${p.title}</strong></td>
        <td><span class="badge">${p.category}</span></td>
        <td>${p.duration || '—'}</td>
        <td>${formatDate(p.date)}</td>
        <td>
          <button class="delete-btn" data-id="${p.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePodcast(btn.dataset.id));
    });
  } catch {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#f87171">Failed to load podcasts.</td></tr>`;
  }
}

/* ── Delete ────────────────────────────────────────────────────────────── */
async function deletePodcast(id) {
  if (!confirm('Delete this podcast? This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/podcasts/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Podcast deleted.', 'success');
      loadPodcasts();
    } else {
      showToast(data.error || 'Delete failed.', 'error');
    }
  } catch {
    showToast('Network error.', 'error');
  }
}

/* ── Add Podcast Form ───────────────────────────────────────────────────── */
document.getElementById('add-form').addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Uploading…';

  const formData = new FormData(e.target);
  try {
    const res  = await fetch('/api/podcasts', { method:'POST', body:formData });
    const data = await res.json();
    if (res.ok) {
      showToast('Podcast added!', 'success');
      closeModal();
      loadPodcasts();
    } else {
      showToast(data.error || 'Upload failed.', 'error');
    }
  } catch {
    showToast('Network error.', 'error');
  } finally {
    saveBtn.disabled   = false;
    saveBtn.textContent = 'Save Podcast';
  }
});

loadPodcasts();
