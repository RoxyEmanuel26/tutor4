/**
 * =============================================
 *  VIDEO FEED APP — Main Application Script
 * =============================================
 *  Clean Architecture — Organized Sections:
 *
 *  1. CONFIGURATION       — API URLs, CORS proxies, constants
 *  2. STATE MANAGEMENT    — Global app state variables
 *  3. UTILITY FUNCTIONS   — Helpers (formatting, escaping, etc.)
 *  4. AUTHENTICATION      — RedGifs API token management
 *  5. API LAYER           — Data fetching (videos)
 *  6. UI COMPONENTS       — Toast, error display, etc.
 *  7. VIDEO ELEMENT       — Video DOM creation & event wiring
 *  8. OBSERVER            — IntersectionObserver for autoplay
 *  9. SCROLL & GESTURES   — Infinite scroll, touch, keyboard
 * 10. NAVIGATION          — Tab switching
 * 11. INITIALIZATION      — App bootstrap
 * 12. CLEANUP             — Memory leak prevention
 * ============================================= */

// ==========================================
//  1. CONFIGURATION
// ==========================================

const CONFIG = {
    API_BASE: 'https://api.redgifs.com/v2',
    VIDEOS_PER_PAGE: 10,
    SCROLL_THRESHOLD: 300,     // px from bottom to trigger load more
    THROTTLE_MS: 200,          // scroll event throttle
    TOKEN_REFRESH_BUFFER: 300000, // 5 minutes before expiry
    TOKEN_LIFETIME: 3600000,   // 1 hour assumed lifetime
};

const CORS_PROXIES = [
    '',                                    // Direct access (try first)
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
];

// ==========================================
//  2. STATE MANAGEMENT
// ==========================================

const state = {
    authToken: null,
    authExpiry: null,
    currentVideos: [],
    currentIndex: 0,
    currentTag: 'trending',
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    currentProxyIndex: 0,

    // Touch/gesture tracking
    touchStartY: 0,
    touchEndY: 0,
};

// ==========================================
//  3. UTILITY FUNCTIONS
// ==========================================

function log(...args) {
    console.log('[VideoFeed]', ...args);
}

function logError(...args) {
    console.error('[VideoFeed ERROR]', ...args);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function parseCount(str) {
    if (str.includes('M')) return parseFloat(str) * 1000000;
    if (str.includes('K')) return parseFloat(str) * 1000;
    return parseInt(str) || 0;
}

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
//  4. AUTHENTICATION
// ==========================================

async function getAuthToken(forceRefresh = false) {
    const now = Date.now();

    // Return cached token if still valid
    if (state.authToken && !forceRefresh && state.authExpiry && (now < state.authExpiry - CONFIG.TOKEN_REFRESH_BUFFER)) {
        log('Using cached auth token');
        return state.authToken;
    }

    try {
        log('Fetching new auth token...');
        let response = null;

        for (let i = state.currentProxyIndex; i < CORS_PROXIES.length; i++) {
            const proxy = CORS_PROXIES[i];
            const url = proxy
                ? `${proxy}${encodeURIComponent(`${CONFIG.API_BASE}/auth/temporary`)}`
                : `${CONFIG.API_BASE}/auth/temporary`;

            log(`Trying auth with proxy: ${proxy || 'direct'}`);

            try {
                response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                });
                if (response.ok) break;
            } catch (e) {
                logError(`Proxy ${proxy} failed:`, e);
                continue;
            }
        }

        if (!response || !response.ok) {
            logError('Auth response not OK:', response ? response.status : 'no response');
            throw new Error('Failed to get auth token');
        }

        const data = await response.json();
        if (!data.token) {
            logError('No token in response');
            throw new Error('No token received');
        }

        state.authToken = data.token;
        state.authExpiry = now + CONFIG.TOKEN_LIFETIME;
        log('Auth token received, expires in 1 hour');
        return state.authToken;

    } catch (error) {
        logError('Auth error:', error);
        showError('Authentication failed. Please refresh.');
        return null;
    }
}

// ==========================================
//  5. API LAYER
// ==========================================

async function fetchVideos(tag = 'trending', page = 1) {
    try {
        log(`Fetching videos for tag: ${tag}, page: ${page}`);
        const token = await getAuthToken();
        if (!token) {
            logError('No auth token available');
            return [];
        }

        const baseUrl = tag === 'trending'
            ? `${CONFIG.API_BASE}/gifs/trending?count=${CONFIG.VIDEOS_PER_PAGE}&page=${page}`
            : `${CONFIG.API_BASE}/gifs/search?tags=${tag}&count=${CONFIG.VIDEOS_PER_PAGE}&page=${page}`;

        let response = null;

        for (let i = state.currentProxyIndex; i < CORS_PROXIES.length; i++) {
            const proxy = CORS_PROXIES[i];
            const url = proxy ? `${proxy}${encodeURIComponent(baseUrl)}` : baseUrl;
            log(`Trying videos with proxy: ${proxy || 'direct'}`);

            try {
                response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                });
                if (response.ok) break;
            } catch (e) {
                logError(`Proxy ${proxy} failed:`, e);
                continue;
            }
        }

        if (!response || !response.ok) {
            logError('Video response not OK:', response ? response.status : 'no response');

            // Auto-refresh token on 401
            if (response && response.status === 401) {
                logError('401 Unauthorized, refreshing token...');
                state.authToken = null;
                await getAuthToken(true);
                return fetchVideos(tag, page);
            }

            throw new Error(`HTTP ${response ? response.status : 'unknown'}`);
        }

        const data = await response.json();
        log('Received gifs:', data.gifs ? data.gifs.length : 0);
        state.hasMore = data.gifs && data.gifs.length === CONFIG.VIDEOS_PER_PAGE;
        return data.gifs || [];

    } catch (error) {
        logError('Fetch error:', error);

        if (error.message.includes('401')) {
            state.authToken = null;
            await getAuthToken(true);
            return fetchVideos(tag, page);
        }

        showError('Failed to load videos. Please try again.');
        return [];
    }
}

// ==========================================
//  6. UI COMPONENTS
// ==========================================

function showError(message) {
    document.getElementById('errorText').textContent = message;
    document.getElementById('errorMessage').classList.add('show');
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);padding:12px 24px;border-radius:25px;z-index:1000;font-size:14px;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ==========================================
//  7. VIDEO ELEMENT BUILDER
// ==========================================

function createVideoElement(videoData, globalIndex) {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.dataset.index = globalIndex;
    item.id = `video-${globalIndex}`;

    const urls = videoData.urls;
    const videoUrl = urls.hd || urls.sd || urls.gif;
    const title = videoData.title || 'Untitled Video';
    const author = videoData.author || videoData.userName || 'unknown';
    const likes = videoData.likes || Math.floor(Math.random() * 50000);
    const comments = videoData.comments || Math.floor(Math.random() * 1000);

    // Build DOM via DocumentFragment for performance
    const fragment = document.createDocumentFragment();

    // --- Video Wrapper ---
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';

    const video = document.createElement('video');
    video.src = videoUrl;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.poster = videoData.poster || '';
    video.muted = true;

    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const playOverlay = document.createElement('div');
    playOverlay.className = 'play-pause-overlay';
    playOverlay.textContent = '▶';

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'fullscreen-btn';
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.type = 'button';
    fullscreenBtn.setAttribute('aria-label', 'Toggle fullscreen');

    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-fill';
    progressBarContainer.appendChild(progressBar);

    wrapper.appendChild(video);
    wrapper.appendChild(spinner);
    wrapper.appendChild(playOverlay);
    wrapper.appendChild(fullscreenBtn);
    wrapper.appendChild(progressBarContainer);
    fragment.appendChild(wrapper);

    // --- Video Info ---
    const infoDiv = document.createElement('div');
    infoDiv.className = 'video-info';
    infoDiv.innerHTML = `
        <div class="video-title">${escapeHtml(title)}</div>
        <div class="video-author">${escapeHtml(author)}</div>
        <div class="video-tags">#${videoData.tags ? escapeHtml(videoData.tags[0] || 'video') : 'viral'}</div>
    `;
    fragment.appendChild(infoDiv);

    // --- Sidebar Buttons ---
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.innerHTML = `
        <button class="sidebar-btn like-btn" type="button" aria-label="Like"><div class="icon">♥</div><span class="count">${formatNumber(likes)}</span></button>
        <button class="sidebar-btn" type="button" aria-label="Comment"><div class="icon">💬</div><span class="count">${formatNumber(comments)}</span></button>
        <button class="sidebar-btn share-btn" type="button" aria-label="Share"><div class="icon">↗</div><span class="count">Share</span></button>
    `;
    fragment.appendChild(sidebar);

    item.appendChild(fragment);

    // --- Event Listeners ---
    setupVideoEvents(item, video, spinner, playOverlay, progressBar, fullscreenBtn, videoData);

    // Register with IntersectionObserver
    getVideoObserver().observe(item);

    return item;
}

/**
 * Pasang semua event listener untuk satu video item.
 */
function setupVideoEvents(item, video, spinner, playOverlay, progressBar, fullscreenBtn, videoData) {
    const wrapper = video.closest('.video-wrapper');

    // Loading states
    video.addEventListener('loadeddata', () => { spinner.style.display = 'none'; }, { once: true });
    video.addEventListener('waiting', () => { spinner.style.display = 'block'; });
    video.addEventListener('playing', () => { spinner.style.display = 'none'; playOverlay.classList.remove('show'); });

    // Progress bar update
    video.addEventListener('timeupdate', () => {
        if (video.duration && isFinite(video.duration)) {
            progressBar.style.width = (video.currentTime / video.duration) * 100 + '%';
        }
    });
    video.addEventListener('ended', () => { progressBar.style.width = '0%'; });

    // Error handling
    video.addEventListener('error', (e) => {
        console.error('Video load error:', e);
        spinner.style.display = 'none';
        video.style.display = 'none';
        const errorIcon = document.createElement('div');
        errorIcon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:48px;opacity:0.7;';
        errorIcon.textContent = '⚠️';
        wrapper.appendChild(errorIcon);
    });

    // Click to play/pause
    wrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('sidebar-btn') ||
            e.target.classList.contains('fullscreen-btn') ||
            e.target.closest('.sidebar-btn')) return;
        togglePlay(video, playOverlay);
    });

    // Double tap fullscreen (mobile)
    let lastTap = 0;
    wrapper.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastTap < 300 && currentTime - lastTap > 0) {
            toggleFullscreen(fullscreenBtn);
            e.preventDefault();
        }
        lastTap = currentTime;
    }, { passive: false });

    // Like button
    const likeBtn = item.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', function () {
            this.classList.toggle('like-active');
            const countSpan = this.querySelector('.count');
            let count = parseCount(countSpan.textContent);
            count += this.classList.contains('like-active') ? 1 : -1;
            countSpan.textContent = formatNumber(count);
        });
    }

    // Share button
    const shareBtn = item.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            shareVideo(videoData.id);
        });
    }
}

// ==========================================
//  8. VIDEO PLAYER CONTROLS
// ==========================================

function togglePlay(video, overlay) {
    if (video.paused) {
        video.play();
        overlay.textContent = '▶';
    } else {
        video.pause();
        overlay.textContent = '⏸';
    }
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 500);
}

function toggleFullscreen(btn) {
    const videoItem = btn.closest('.video-item');
    if (!document.fullscreenElement) {
        videoItem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
        btn.textContent = '❐';
    } else {
        document.exitFullscreen();
        btn.textContent = '⛶';
    }
}

function shareVideo(id) {
    const url = `https://redgifs.com/watch/${id}`;
    if (navigator.share) {
        navigator.share({ title: 'Check out this video', url }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
    }
}

// ==========================================
//  9. INTERSECTION OBSERVER (Autoplay)
// ==========================================

let videoObserver = null;

function getVideoObserver() {
    if (!videoObserver) {
        videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const item = entry.target;
                const video = item.querySelector('video');
                const progressBar = item.querySelector('.progress-fill');

                if (!video || !progressBar) return;

                if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
                    video.muted = true;
                    video.play().catch(e => {
                        if (e.name !== 'AbortError') console.log('Autoplay prevented');
                    });
                    const index = parseInt(item.dataset.index);
                    if (!isNaN(index)) state.currentIndex = index;
                } else {
                    video.pause();
                    video.currentTime = 0;
                    progressBar.style.width = '0%';
                }
            });
        }, { threshold: [0.7], rootMargin: '50px' });
    }
    return videoObserver;
}

// ==========================================
// 10. LOADING & INFINITE SCROLL
// ==========================================

async function loadVideos(reset = true) {
    if (state.isLoading) return;
    state.isLoading = true;
    hideError();

    const container = document.getElementById('videoContainer');

    if (reset) {
        // Cleanup existing observers
        if (videoObserver) {
            document.querySelectorAll('.video-item').forEach(item => {
                videoObserver.unobserve(item);
            });
        }
        container.innerHTML = '';
        state.currentVideos = [];
        state.currentPage = 1;
        state.currentIndex = 0;
    }

    log('Loading videos, reset:', reset, 'page:', state.currentPage);
    const videos = await fetchVideos(state.currentTag, state.currentPage);
    log('Videos loaded:', videos.length);

    if (videos.length === 0) {
        if (reset) {
            logError('No videos available for tag:', state.currentTag);
            showError('No videos available. Try another category.');
        }
        state.isLoading = false;
        return;
    }

    state.currentVideos = [...state.currentVideos, ...videos];

    const fragment = document.createDocumentFragment();
    videos.forEach((video, index) => {
        const globalIndex = state.currentVideos.length - videos.length + index;
        fragment.appendChild(createVideoElement(video, globalIndex));
    });
    container.appendChild(fragment);

    state.currentPage++;
    state.isLoading = false;
}

async function loadMoreVideos() {
    if (state.isLoading || !state.hasMore) return;

    state.isLoading = true;
    document.getElementById('loadingMore').classList.add('show');

    const moreVideos = await fetchVideos(state.currentTag, state.currentPage);

    if (moreVideos.length > 0) {
        const container = document.getElementById('videoContainer');
        const fragment = document.createDocumentFragment();

        moreVideos.forEach((video, index) => {
            const globalIndex = state.currentVideos.length + index;
            fragment.appendChild(createVideoElement(video, globalIndex));
        });

        container.appendChild(fragment);
        state.currentVideos = [...state.currentVideos, ...moreVideos];
        state.currentPage++;
    }

    state.isLoading = false;
    document.getElementById('loadingMore').classList.remove('show');
}

// ==========================================
// 11. EVENT HANDLERS (Scroll, Touch, Keyboard)
// ==========================================

function setupScrollHandler() {
    const container = document.getElementById('videoContainer');

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollTop + clientHeight >= scrollHeight - CONFIG.SCROLL_THRESHOLD) {
            loadMoreVideos();
        }
    };

    container.addEventListener('scroll', throttle(handleScroll, CONFIG.THROTTLE_MS), { passive: true });
}

function setupTouchHandlers() {
    const container = document.getElementById('videoContainer');

    container.addEventListener('touchstart', (e) => {
        state.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        state.touchEndY = e.touches[0].clientY;
    }, { passive: true });
}

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        const videos = document.querySelectorAll('.video-item');

        switch (e.key) {
            case 'ArrowDown':
            case 'j':
                e.preventDefault();
                if (state.currentIndex < videos.length - 1) {
                    videos[state.currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
                }
                break;

            case 'ArrowUp':
            case 'k':
                e.preventDefault();
                if (state.currentIndex > 0) {
                    videos[state.currentIndex - 1].scrollIntoView({ behavior: 'smooth' });
                }
                break;

            case ' ':
            case 'Enter':
                e.preventDefault();
                const currentVideo = videos[state.currentIndex]?.querySelector('video');
                const overlay = videos[state.currentIndex]?.querySelector('.play-pause-overlay');
                if (currentVideo) togglePlay(currentVideo, overlay);
                break;

            case 'f':
                const btn = videos[state.currentIndex]?.querySelector('.fullscreen-btn');
                if (btn) toggleFullscreen(btn);
                break;
        }
    });
}

function setupNavigationTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentTag = tab.dataset.tag;
            loadVideos(true);
        });
    });
}

// ==========================================
// 12. INITIALIZATION
// ==========================================

async function initApp() {
    log('Initializing Video Feed App...');

    const token = await getAuthToken();
    if (token) {
        log('Auth successful, loading videos...');
        loadVideos(true);
    } else {
        logError('Auth failed on init');
        showError('Failed to authenticate. Please refresh.');
    }

    // Setup all event handlers
    setupScrollHandler();
    setupTouchHandlers();
    setupKeyboardNavigation();
    setupNavigationTabs();

    // Retry button
    document.getElementById('retryBtn')?.addEventListener('click', () => {
        loadVideos(true);
    });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// 13. CLEANUP & LIFECYCLE
// ==========================================

// Pause all videos when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.querySelectorAll('video').forEach(v => v.pause());
    }
});

// Sync fullscreen button text
document.addEventListener('fullscreenchange', () => {
    const currentVideoItem = document.querySelector(`#video-${state.currentIndex}`);
    if (currentVideoItem) {
        const btn = currentVideoItem.querySelector('.fullscreen-btn');
        if (btn) {
            btn.textContent = document.fullscreenElement ? '❐' : '⛶';
        }
    }
});

// Prevent memory leaks on page unload
window.addEventListener('beforeunload', () => {
    if (videoObserver) {
        videoObserver.disconnect();
        videoObserver = null;
    }
    document.querySelectorAll('video').forEach(v => {
        v.pause();
        v.src = '';
        v.load();
    });
});
