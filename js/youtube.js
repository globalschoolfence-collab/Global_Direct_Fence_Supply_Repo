/* ============================================================
   YouTube Integration — Global Direct Fence
   ============================================================
   SETUP: Fill in the two values below when you're ready.
   1. YT_API_KEY    — Google Cloud Console → APIs & Services →
                      Enable "YouTube Data API v3" → Credentials → API Key
   2. YT_CHANNEL_ID — Your YouTube channel ID (starts with UC...)
                      Find it: YouTube → Your channel → About → Share →
                      Copy channel ID  (or check the URL after /channel/)
   ============================================================ */

const YT_API_KEY    = window.APP_CONFIG?.ytApiKey || '';
const YT_CHANNEL_ID = window.APP_CONFIG?.ytChannelId || 'UCLDSpvo-my7QOc-LAamay1Q';

// Manual video list — add more objects here as needed
const MANUAL_VIDEOS = [
    { id: 'RfspvrCtIjo', title: 'Global Direct Fence — Installation Overview' },
];

/* ── Internal helpers ───────────────────────────────────── */

async function _fetchVideos(maxResults) {
    const url =
        'https://www.googleapis.com/youtube/v3/search' +
        '?part=snippet' +
        '&channelId=' + YT_CHANNEL_ID +
        '&type=video' +
        '&order=date' +
        '&maxResults=' + maxResults +
        '&key=' + YT_API_KEY;
    try {
        const res  = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.items || [];
    } catch (e) {
        console.error('[YouTube] Fetch failed:', e.message);
        return null;
    }
}

function _renderCards(videos, container, onPlay) {
    if (!videos || !videos.length) {
        container.innerHTML =
            '<p class="yt-empty">No videos found. Verify your Channel ID in js/youtube.js.</p>';
        return;
    }
    container.innerHTML = videos.map(function (v) {
        var id    = v.id.videoId;
        var title = v.snippet.title;
        var thumb = v.snippet.thumbnails.high
                  ? v.snippet.thumbnails.high.url
                  : v.snippet.thumbnails.default.url;
        var date  = new Date(v.snippet.publishedAt)
                        .toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
        return (
            '<div class="yt-card" data-videoid="' + id + '" tabindex="0" role="button" aria-label="Play ' + title.replace(/"/g,'&quot;') + '">' +
                '<div class="yt-thumb">' +
                    '<img src="' + thumb + '" alt="' + title.replace(/"/g,'&quot;') + '" loading="lazy">' +
                    '<div class="yt-play-btn"><svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.8 0 34 0 34 0S12.2 0 7.5 1.7a8.5 8.5 0 0 0-6 6C0 12.4 0 24 0 24s0 11.6 1.5 16.3a8.5 8.5 0 0 0 6 6C12.2 48 34 48 34 48s21.8 0 26.5-1.7a8.5 8.5 0 0 0 6-6C68 35.6 68 24 68 24s0-11.6-1.5-16.3z" fill="#ff0000"/><path d="M27 34l18-10-18-10v20z" fill="#fff"/></svg></div>' +
                '</div>' +
                '<div class="yt-card-body">' +
                    '<p class="yt-title">' + title + '</p>' +
                    '<span class="yt-date">' + date + '</span>' +
                '</div>' +
            '</div>'
        );
    }).join('');

    container.querySelectorAll('.yt-card').forEach(function (card) {
        card.addEventListener('click', function () {
            onPlay(card.dataset.videoid, card.querySelector('.yt-title').textContent);
        });
        card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlay(card.dataset.videoid, card.querySelector('.yt-title').textContent);
            }
        });
    });
}

function _renderPlaceholder(container, message) {
    container.innerHTML =
        '<div class="yt-not-configured">' +
            '<div class="yt-nc-icon">' +
                '<svg viewBox="0 0 68 48" xmlns="http://www.w3.org/2000/svg"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.8 0 34 0 34 0S12.2 0 7.5 1.7a8.5 8.5 0 0 0-6 6C0 12.4 0 24 0 24s0 11.6 1.5 16.3a8.5 8.5 0 0 0 6 6C12.2 48 34 48 34 48s21.8 0 26.5-1.7a8.5 8.5 0 0 0 6-6C68 35.6 68 24 68 24s0-11.6-1.5-16.3z" fill="currentColor" opacity=".2"/><path d="M27 34l18-10-18-10v20z" fill="currentColor" opacity=".4"/></svg>' +
            '</div>' +
            '<h3>YouTube Videos Coming Soon</h3>' +
            '<p>' + message + '</p>' +
        '</div>';
}

/* ── Video Modal ────────────────────────────────────────── */

var _modalReady = false;

function _ensureModal() {
    if (_modalReady) return;
    var modal = document.createElement('div');
    modal.id = 'yt-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Video player');
    modal.innerHTML =
        '<div class="yt-modal-backdrop"></div>' +
        '<div class="yt-modal-box">' +
            '<button class="yt-modal-close" aria-label="Close video">&times;</button>' +
            '<div class="yt-modal-player">' +
                '<iframe id="yt-iframe" src="" frameborder="0" allowfullscreen ' +
                    'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">' +
                '</iframe>' +
            '</div>' +
            '<p class="yt-modal-title"></p>' +
        '</div>';
    document.body.appendChild(modal);

    modal.querySelector('.yt-modal-backdrop').addEventListener('click', _closeModal);
    modal.querySelector('.yt-modal-close').addEventListener('click', _closeModal);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') _closeModal();
    });
    _modalReady = true;
}

function _openModal(videoId, title) {
    _ensureModal();
    var modal = document.getElementById('yt-modal');
    modal.querySelector('#yt-iframe').src =
        'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
    modal.querySelector('.yt-modal-title').textContent = title;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function _closeModal() {
    var modal = document.getElementById('yt-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.querySelector('#yt-iframe').src = '';
    document.body.style.overflow = '';
}

/* ── Public API ─────────────────────────────────────────── */

/**
 * Call this on any page that has a container element.
 * @param {string} containerId  - id of the <div> to render into
 * @param {number} [maxResults] - number of videos to fetch (default 12)
 */
async function initYouTube(containerId, maxResults) {
    maxResults = maxResults || 12;
    var container = document.getElementById(containerId);
    if (!container) return;

    var apiConfigured =
        YT_API_KEY !== 'YOUR_API_KEY_HERE' && YT_API_KEY !== '';

    // Use manual list if API key not set
    if (!apiConfigured) {
        if (MANUAL_VIDEOS.length) {
            var manualItems = MANUAL_VIDEOS.slice(0, maxResults).map(function (v) {
                return {
                    id: { videoId: v.id },
                    snippet: {
                        title: v.title,
                        publishedAt: new Date().toISOString(),
                        thumbnails: {
                            high: { url: 'https://img.youtube.com/vi/' + v.id + '/hqdefault.jpg' }
                        }
                    }
                };
            });
            _renderCards(manualItems, container, _openModal);
        } else {
            _renderPlaceholder(container, 'Add videos to MANUAL_VIDEOS in <code>js/youtube.js</code>.');
        }
        return;
    }

    container.innerHTML = '<div class="yt-loading"><span class="yt-spinner"></span> Loading videos…</div>';

    var videos = await _fetchVideos(maxResults);
    _renderCards(videos, container, _openModal);
}
