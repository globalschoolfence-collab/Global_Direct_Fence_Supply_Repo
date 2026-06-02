/* Loads and displays the announcement bar on every page */

const SCRIPT_URL = window.APP_CONFIG?.scriptUrl || '';

async function loadAnnouncement() {
  const bar = document.getElementById('announcementBar');
  if (!bar) return;

  // Don't show if user already closed it this session
  const closed = sessionStorage.getItem('ann_closed');

  try {
    const res  = await fetch(SCRIPT_URL + '?action=public');
    const json = await res.json();
    if (!json.ok || !json.announcements?.length) return;

    const ann = json.announcements[0];
    if (closed === ann.id) return;

    bar.style.background = ann.bgColor  || '#3a6b10';
    bar.style.color      = ann.textColor || '#ffffff';
    bar.querySelector('.ann-message').textContent = ann.message;
    bar.style.display = 'flex';

    document.getElementById('annClose')?.addEventListener('click', () => {
      bar.style.display = 'none';
      sessionStorage.setItem('ann_closed', ann.id);
    });

  } catch {
    // silently fail — announcement is non-critical
  }
}

document.addEventListener('DOMContentLoaded', loadAnnouncement);
