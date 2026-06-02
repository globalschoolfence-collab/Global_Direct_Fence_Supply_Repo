/* Global Direct Fence — Admin Panel */

const SCRIPT_URL = window.APP_CONFIG?.scriptUrl || '';

let adminPassword = '';
let allReviews    = [];
let allAnns       = [];
let currentFilter = 'pending';
let searchTerm    = '';

// ── Login ──────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pass = document.getElementById('adminPass').value;
  const btn  = e.target.querySelector('button');
  btn.textContent = 'Logging in…';
  btn.disabled    = true;

  try {
    const res  = await fetch(`${SCRIPT_URL}?action=admin&password=${encodeURIComponent(pass)}`);
    const json = await res.json();

    if (!json.ok) {
      document.getElementById('loginError').textContent = 'Wrong password.';
      btn.textContent = 'Login';
      btn.disabled    = false;
      return;
    }

    adminPassword = pass;
    allReviews    = json.reviews       || [];
    allAnns       = json.announcements || [];

    document.getElementById('adminLogin').style.display    = 'none';
    document.getElementById('adminDashboard').style.display = 'block';

    renderStats();
    renderReviews();
    renderAnnouncements();

  } catch {
    document.getElementById('loginError').textContent = 'Connection error. Try again.';
    btn.textContent = 'Login';
    btn.disabled    = false;
  }
});

// ── Logout ─────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  adminPassword = '';
  allReviews    = [];
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('adminLogin').style.display     = 'flex';
  document.getElementById('adminPass').value              = '';
});

// ── Tab switching ──────────────────────────────────────
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
  });
});

// ── Stats ──────────────────────────────────────────────
function renderStats() {
  const approved = allReviews.filter(r => r.status === 'approved');
  const pending  = allReviews.filter(r => r.status === 'pending');
  const avg      = approved.length
    ? (approved.reduce((s,r) => s + Number(r.rating), 0) / approved.length).toFixed(1)
    : '—';

  document.getElementById('statTotal').textContent   = allReviews.length;
  document.getElementById('statPending').textContent  = pending.length;
  document.getElementById('statApproved').textContent = approved.length;
  document.getElementById('statAvg').textContent      = avg + (avg !== '—' ? ' ★' : '');

  document.getElementById('pendingCount').textContent  = `(${pending.length})`;
  document.getElementById('approvedCount').textContent = `(${approved.length})`;
}

// ── Reviews ────────────────────────────────────────────
function renderReviews() {
  const grid = document.getElementById('adminReviewsGrid');
  let reviews = allReviews.filter(r => {
    if (currentFilter === 'pending')  return r.status === 'pending';
    if (currentFilter === 'approved') return r.status === 'approved';
    return true;
  });

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    reviews = reviews.filter(r =>
      r.name?.toLowerCase().includes(term) ||
      r.text?.toLowerCase().includes(term) ||
      r.title?.toLowerCase().includes(term)
    );
  }

  reviews.sort((a,b) => new Date(b.date) - new Date(a.date));

  if (!reviews.length) {
    grid.innerHTML = '<p class="admin-empty">No reviews found.</p>';
    return;
  }

  grid.innerHTML = reviews.map(r => `
    <div class="admin-review-card" data-id="${r.id}">
      <div class="arc-top">
        <div class="arc-stars">${'★'.repeat(Number(r.rating))}${'☆'.repeat(5-Number(r.rating))}</div>
        <span class="arc-status ${r.status}">${r.status}</span>
        <div class="arc-date">${r.date}</div>
      </div>
      ${r.title ? `<div class="arc-title">${escHtml(r.title)}</div>` : ''}
      <div class="arc-text">"${escHtml(r.text)}"</div>
      <div class="arc-meta">
        <strong>${escHtml(r.name)}</strong>
        ${r.location  ? `<span>${escHtml(r.location)}</span>`  : ''}
        ${r.fenceType ? `<span class="arc-tag">${escHtml(r.fenceType)}</span>` : ''}
      </div>
      <div class="arc-actions">
        ${r.status === 'pending'
          ? `<button class="btn btn-blue"         onclick="approveReview('${r.id}')">✓ Approve</button>`
          : `<button class="btn btn-outline-blue"  onclick="unpublishReview('${r.id}')">↩ Unpublish</button>`
        }
        <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteReview('${r.id}')">✗ Delete</button>
      </div>
    </div>`).join('');
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderReviews();
  });
});

// Search
document.getElementById('reviewSearch').addEventListener('input', e => {
  searchTerm = e.target.value.trim();
  renderReviews();
});

// ── Review actions ─────────────────────────────────────
async function approveReview(id) {
  await adminPost({ action: 'approveReview', id });
  allReviews.find(r => r.id === id).status = 'approved';
  renderStats();
  renderReviews();
  toast('Review approved ✓');
}

async function unpublishReview(id) {
  await adminPost({ action: 'unpublishReview', id });
  allReviews.find(r => r.id === id).status = 'pending';
  renderStats();
  renderReviews();
  toast('Review unpublished');
}

async function deleteReview(id) {
  if (!confirm('Delete this review permanently?')) return;
  await adminPost({ action: 'deleteReview', id });
  allReviews = allReviews.filter(r => r.id !== id);
  renderStats();
  renderReviews();
  toast('Review deleted');
}

// ── Export CSV ─────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  const headers = ['id','name','location','fenceType','rating','title','text','date','status'];
  const rows    = allReviews.map(r =>
    headers.map(h => `"${String(r[h] || '').replace(/"/g,'""')}"`).join(',')
  );
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'gsf-reviews.csv';
  a.click();
});

// ── Announcements ──────────────────────────────────────
function renderAnnouncements() {
  const list  = document.getElementById('annList');
  const today = new Date().toISOString().slice(0, 10);

  if (!allAnns.length) {
    list.innerHTML = '<p class="admin-empty">No announcements yet.</p>';
    return;
  }

  list.innerHTML = allAnns.map(a => {
    const expired = a.endDate && a.endDate < today;
    return `
      <div class="ann-card ${expired ? 'expired' : ''}">
        <div class="ann-card-preview" style="background:${a.bgColor};color:${a.textColor}">
          ${escHtml(a.message)}
        </div>
        <div class="ann-card-meta">
          <span>${a.startDate} → ${a.endDate}</span>
          <span class="ann-status ${a.active === 'yes' ? 'active' : 'inactive'}">
            ${a.active === 'yes' ? 'Active' : 'Inactive'}${expired ? ' (Expired)' : ''}
          </span>
        </div>
        <div class="ann-card-actions">
          <button class="btn btn-outline-blue" onclick="toggleAnn('${a.id}','${a.active}')">
            ${a.active === 'yes' ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn" style="background:var(--red);color:#fff;" onclick="deleteAnn('${a.id}')">
            Delete
          </button>
        </div>
      </div>`;
  }).join('');
}

document.getElementById('addAnnBtn').addEventListener('click', () => {
  document.getElementById('annFormWrap').style.display = 'block';
  document.getElementById('addAnnBtn').style.display   = 'none';
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('annStart').value = today;
  document.getElementById('annEnd').value   = today;
});

document.getElementById('cancelAnnBtn').addEventListener('click', () => {
  document.getElementById('annFormWrap').style.display = 'none';
  document.getElementById('addAnnBtn').style.display   = 'block';
});

document.getElementById('annForm').addEventListener('submit', async e => {
  e.preventDefault();
  const message = document.getElementById('annMessage').value.trim();
  if (!message) return;

  const newAnn = {
    action:    'addAnnouncement',
    message,
    bgColor:   document.getElementById('annBg').value,
    textColor: document.getElementById('annText').value,
    active:    'yes',
    startDate: document.getElementById('annStart').value,
    endDate:   document.getElementById('annEnd').value,
  };

  const res = await adminPost(newAnn);
  if (res.ok) {
    allAnns.unshift({ ...newAnn, id: res.id });
    renderAnnouncements();
    document.getElementById('annForm').reset();
    document.getElementById('annFormWrap').style.display = 'none';
    document.getElementById('addAnnBtn').style.display   = 'block';
    toast('Announcement added ✓');
  }
});

async function toggleAnn(id, currentStatus) {
  const res = await adminPost({ action: 'toggleAnnouncement', id, currentStatus });
  if (res.ok) {
    const ann = allAnns.find(a => a.id === id);
    if (ann) ann.active = res.newStatus;
    renderAnnouncements();
    toast(res.newStatus === 'yes' ? 'Announcement activated' : 'Announcement deactivated');
  }
}

async function deleteAnn(id) {
  if (!confirm('Delete this announcement?')) return;
  await adminPost({ action: 'deleteAnnouncement', id });
  allAnns = allAnns.filter(a => a.id !== id);
  renderAnnouncements();
  toast('Announcement deleted');
}

// ── Shared POST helper ─────────────────────────────────
async function adminPost(data) {
  const res  = await fetch(SCRIPT_URL, {
    method: 'POST',
    body:   JSON.stringify({ ...data, password: adminPassword }),
  });
  return res.json();
}

// ── Toast ──────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('adminToast');
  t.textContent  = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
