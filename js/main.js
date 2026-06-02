/* Global Direct Fence — Main JS */

const BASE = document.body.dataset.base || '';

async function loadPartial(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    const res = await fetch(url);
    const temp = document.createElement('div');
    temp.innerHTML = await res.text();

    // Rewrite internal .html links to clean folder URLs
    temp.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || /^(https?:\/\/|\/\/|mailto:|tel:|#)/.test(href)) return;
        const clean = href.replace(/^([\w-]+)\.html(#\S*)?$/, (_, page, hash) =>
            page === 'index' ? (BASE || './') : BASE + page + '/' + (hash || '')
        );
        if (clean !== href) {
            a.setAttribute('href', clean);
        } else if (BASE && !href.startsWith('/')) {
            a.setAttribute('href', BASE + href);
        }
    });

    // Fix relative image src in partials when in a subdirectory
    if (BASE) {
        temp.querySelectorAll('img[src]').forEach(img => {
            const src = img.getAttribute('src');
            if (src && !/^(https?:\/\/|\/\/|\/)/.test(src)) {
                img.setAttribute('src', BASE + src);
            }
        });
    }

    el.outerHTML = temp.innerHTML;
}

loadPartial('footer-placeholder', BASE + 'partials/footer.html');
loadPartial('cta-placeholder', BASE + 'partials/cta-section.html');

document.addEventListener('DOMContentLoaded', () => {

    // ── Mobile nav toggle ──────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mainNav   = document.getElementById('mainNav');

    if (hamburger && mainNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mainNav.classList.toggle('open');
        });

        // Close on nav link click (mobile)
        mainNav.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                mainNav.classList.remove('open');
            });
        });
    }

    // ── Gallery filter ─────────────────────────────────────
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryGrid = document.getElementById('galleryGrid');

    if (filterBtns.length && galleryGrid) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.dataset.filter;
                galleryGrid.querySelectorAll('.gallery-pro-item').forEach(item => {
                    if (filter === 'all' || item.dataset.category === filter) {
                        item.classList.remove('gallery-hidden');
                    } else {
                        item.classList.add('gallery-hidden');
                    }
                });
            });
        });
    }

    // ── Quote form ─────────────────────────────────────────
    const quoteForm    = document.getElementById('quoteForm');
    const formSuccess  = document.getElementById('formSuccess');

    if (quoteForm && formSuccess) {
        quoteForm.addEventListener('submit', e => {
            e.preventDefault();

            // Basic required-field check
            const required = quoteForm.querySelectorAll('[required]');
            let valid = true;
            required.forEach(field => {
                field.style.borderColor = '';
                if (!field.value.trim()) {
                    field.style.borderColor = '#e53e3e';
                    valid = false;
                }
            });

            if (!valid) return;

            // Show success state
            quoteForm.style.display = 'none';
            formSuccess.style.display = 'block';
        });
    }

    // ── Smooth scroll for anchor links ────────────────────
    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const href = anchor.getAttribute('href');
            // Only handle same-page anchors
            if (!href.startsWith('#') && !href.includes(window.location.pathname)) return;

            const id = href.split('#')[1];
            const target = id ? document.getElementById(id) : null;
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ── Scroll-in animation ────────────────────────────────
    const revealEls = document.querySelectorAll(
        '.service-card, .why-card, .testimonial-card, .area-item, .value-card, .team-card, .service-detail-card, .category-card, .tile'
    );

    if ('IntersectionObserver' in window && revealEls.length) {
        revealEls.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity .45s ease, transform .45s ease';
        });

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealEls.forEach(el => observer.observe(el));
    }

});
