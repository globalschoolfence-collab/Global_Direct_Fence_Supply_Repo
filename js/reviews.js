/* Global Direct Fence — Reviews (Google Sheets backend) */

const APPS_SCRIPT_URL = window.APP_CONFIG?.scriptUrl || '';
const SECRET_TOKEN    = window.APP_CONFIG?.secretToken || '';

const SEED_REVIEWS = [
    {
        pinned:    true,
        date:      '2025-11-12T00:00:00.000Z',
        name:      'Ruka S.',
        location:  'Fairview Park, OH',
        fenceType: 'Vinyl Fencing',
        rating:    5,
        title:     'Top quality materials and great guidance',
        text:      'The fence materials we received were top quality — exactly as described. The detailed specs and guidance made the whole process straightforward. Our backyard looks amazing!',
    },
    {
        pinned:    true,
        date:      '2025-10-05T00:00:00.000Z',
        name:      'Aaron S.',
        location:  'Lorain, OH',
        fenceType: 'Aluminium Fencing',
        rating:    5,
        title:     'Excellent product for our campus perimeter',
        text:      'Global Direct Fence supplied the fencing for our entire campus perimeter. Excellent product quality, great documentation, and their team answered every question we had throughout the process.',
    },
    {
        pinned:    true,
        date:      '2025-09-18T00:00:00.000Z',
        name:      'Millie M.',
        location:  'State Road, OH',
        fenceType: 'Vinyl Fencing',
        rating:    5,
        title:     'Best pricing, outstanding materials',
        text:      'Best pricing I found after comparing 4 suppliers. No hidden fees, the quote was exactly what I paid. The vinyl fence materials are outstanding — still looks brand new after 2 years.',
    },
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ── Fetch all public data ──────────────────────────────
async function fetchPublicData() {
  try {
    const res  = await fetch(APPS_SCRIPT_URL + '?action=public');
    const json = await res.json();
    return json.ok ? json : { reviews: [], announcements: [] };
  } catch {
    return { reviews: [], announcements: [] };
  }
}

// ── Announcement banner ────────────────────────────────
function renderAnnouncement(announcements) {
  const bar = document.getElementById('announcementBar');
  if (!bar || !announcements.length) return;

  const ann       = announcements[0];
  bar.style.background  = ann.bgColor  || '#3a6b10';
  bar.style.color       = ann.textColor || '#ffffff';
  bar.querySelector('.ann-message').textContent = ann.message;
  bar.style.display = 'flex';
}

// ── Render helpers ─────────────────────────────────────
function starsHTML(rating) {
  return '&#9733;'.repeat(rating) +
    (rating < 5 ? '<span style="color:var(--gray-300)">' +
      '&#9733;'.repeat(5 - rating) + '</span>' : '');
}

function avatarInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US',
    { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderReviewCard(review) {
  const card = document.createElement('div');
  card.className = 'review-card';
  card.innerHTML = `
    <div class="review-card-top">
      <div class="review-card-stars">${starsHTML(review.rating)}</div>
      <div class="review-card-date">${formatDate(review.date)}</div>
    </div>
    ${review.title ? `<div class="review-card-title">${escapeHtml(review.title)}</div>` : ''}
    <div class="review-card-text">"${escapeHtml(review.text)}"</div>
    <div class="review-card-meta">
      <div class="review-card-avatar">${avatarInitials(review.name)}</div>
      <div>
        <div class="review-card-author">${escapeHtml(review.name)}</div>
        ${review.location ? `<div class="review-card-location">${escapeHtml(review.location)}</div>` : ''}
      </div>
      ${review.fenceType ? `<span class="review-card-fence-tag">${escapeHtml(review.fenceType)}</span>` : ''}
    </div>`;
  return card;
}

function sortedReviews(reviews, order) {
  const pinned   = reviews.filter(r => r.pinned);
  const rest     = reviews.filter(r => !r.pinned);
  if (order === 'newest')  rest.sort((a,b) => new Date(b.date) - new Date(a.date));
  if (order === 'highest') rest.sort((a,b) => b.rating - a.rating);
  if (order === 'lowest')  rest.sort((a,b) => a.rating - b.rating);
  return [...pinned, ...rest];
}

let allReviews = [];

function renderReviewsList(order = 'newest') {
  const grid  = document.getElementById('reviewsGrid');
  const empty = document.getElementById('reviewsEmpty');
  if (!grid) return;

  const reviews = sortedReviews(allReviews, order);
  grid.innerHTML = '';

  if (!reviews.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  reviews.forEach(r => grid.appendChild(renderReviewCard(r)));
}

function renderSummary() {
  const total = allReviews.length;
  const avg   = total
    ? (allReviews.reduce((s,r) => s + r.rating, 0) / total)
    : 0;

  const avgEl   = document.getElementById('avgScore');
  const starsEl = document.getElementById('avgStars');
  const countEl = document.getElementById('totalCount');
  const barsEl  = document.getElementById('ratingBars');

  if (avgEl)   avgEl.textContent   = avg.toFixed(1);
  if (starsEl) starsEl.innerHTML   = starsHTML(Math.round(avg));
  if (countEl) countEl.textContent = total;

  const heroAvgEl = document.getElementById('heroAvgScore');
  if (heroAvgEl) heroAvgEl.textContent = avg.toFixed(1);

  if (barsEl) {
    barsEl.innerHTML = '';
    for (let star = 5; star >= 1; star--) {
      const count = allReviews.filter(r => r.rating === star).length;
      const pct   = total ? Math.round((count / total) * 100) : 0;
      barsEl.innerHTML += `
        <div class="rating-bar-row">
          <div class="bar-label">${star}<span class="bar-star">&#9733;</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="bar-count">${count}</div>
        </div>`;
    }
  }
}

// ── Star Rating Input ──────────────────────────────────
function initStarInput() {
  const container = document.getElementById('starRatingInput');
  const label     = document.getElementById('starLabel');
  if (!container) return;

  let selected = 0;
  const stars  = container.querySelectorAll('.star-btn');

  function paint(upTo) {
    stars.forEach((s, i) => {
      s.classList.toggle('hovered',  i < upTo);
      s.classList.toggle('selected', i < selected && upTo === 0);
    });
  }

  stars.forEach((star, idx) => {
    star.addEventListener('mouseenter', () => {
      paint(idx + 1);
      label.textContent = STAR_LABELS[idx + 1];
    });
    star.addEventListener('mouseleave', () => {
      paint(0);
      label.textContent = selected ? STAR_LABELS[selected] : 'Click a star to rate';
    });
    star.addEventListener('click', () => {
      selected = idx + 1;
      stars.forEach((s, i) => {
        s.classList.toggle('selected', i < selected);
        s.classList.remove('hovered');
      });
      label.textContent = STAR_LABELS[selected];
      container.dataset.rating = selected;
      document.getElementById('ratingError').textContent = '';
    });
  });

  container.getRating = () => selected;
  container.reset = () => {
    selected = 0;
    stars.forEach(s => s.classList.remove('selected', 'hovered'));
    label.textContent = 'Click a star to rate';
    container.dataset.rating = 0;
  };
}

// ── Form Submission ────────────────────────────────────
function initReviewForm() {
  const form          = document.getElementById('reviewForm');
  const success       = document.getElementById('reviewSuccess');
  const writeAnotherBtn = document.getElementById('writeAnotherBtn');
  if (!form) return;

  const textarea  = document.getElementById('reviewText');
  const charCount = document.getElementById('charCount');
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = Math.min(textarea.value.length, 600);
      charCount.textContent = len;
      if (textarea.value.length > 600) textarea.value = textarea.value.slice(0, 600);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name      = document.getElementById('reviewerName').value.trim();
    const location  = document.getElementById('reviewerLocation').value.trim();
    const fenceType = document.getElementById('fenceType').value;
    const ratingEl  = document.getElementById('starRatingInput');
    const rating    = ratingEl ? ratingEl.getRating() : 0;
    const title     = document.getElementById('reviewTitle').value.trim();
    const text      = document.getElementById('reviewText').value.trim();

    document.getElementById('nameError').textContent   = '';
    document.getElementById('ratingError').textContent = '';
    document.getElementById('textError').textContent   = '';

    let valid = true;
    if (!name)   { document.getElementById('nameError').textContent   = 'Please enter your name.';        valid = false; }
    if (!rating) { document.getElementById('ratingError').textContent = 'Please select a star rating.';   valid = false; }
    if (!text)   { document.getElementById('textError').textContent   = 'Please write your review.';      valid = false; }
    if (!valid) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.textContent = 'Submitting…';
    submitBtn.disabled    = true;

    try {
      const res  = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:   JSON.stringify({
          action: 'submitReview',
          token: SECRET_TOKEN,
          name, location, fenceType, rating, title, text,
        }),
        redirect: 'follow',
      });
      const json = await res.json();

      if (!json.ok) {
        alert(json.error || 'Something went wrong. Please try again.');
        submitBtn.textContent = 'Submit Review';
        submitBtn.disabled    = false;
        return;
      }

      form.style.display    = 'none';
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch {
      alert('Network error. Please check your connection and try again.');
      submitBtn.textContent = 'Submit Review';
      submitBtn.disabled    = false;
    }
  });

  if (writeAnotherBtn) {
    writeAnotherBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('starRatingInput')?.reset();
      if (charCount) charCount.textContent = '0';
      success.style.display = 'none';
      form.style.display    = 'block';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

// ── Sort ───────────────────────────────────────────────
function initSort() {
  const select = document.getElementById('sortReviews');
  if (select) select.addEventListener('change', () => renderReviewsList(select.value));
}

// ── Skeleton loader ────────────────────────────────────
function showSkeleton() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = Array(6).fill(`
    <div class="review-card skeleton-card">
      <div class="skeleton skeleton-stars"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-author"></div>
    </div>`).join('');
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  showSkeleton();
  initStarInput();
  initReviewForm();
  initSort();

  const data   = await fetchPublicData();
  allReviews   = [...SEED_REVIEWS, ...(data.reviews || [])];

  renderAnnouncement(data.announcements || []);
  renderSummary();
  renderReviewsList();
});
