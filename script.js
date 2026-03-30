document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    //  KONFIGURASI URL TARGET
    //  Ganti URL di bawah sesuai kebutuhan
    // ==========================================
    const TAB_URLS = {
        firstClick: 'https://glamournakedemployee.com/c5xf7679?key=80dc863578016519ca9167abc7090944',      // Tab dibuka saat klik pertama di halaman
        gallerySwipe: 'https://kumpulan5.vercel.app/',      // Tab dibuka saat swipe/klik gallery pertama kali
        download: 'https://omg10.com/4/10806729',   // Tab dibuka saat klik DOWNLOAD
        watch: 'https://omg10.com/4/10806728',        // Tab dibuka saat klik WATCH NOW
        dismiss: 'https://kumpulan1.vercel.app/',      // Tab dibuka saat klik tombol tutup modal
    };

    // URL tujuan setelah redirect (halaman saat ini pindah ke sini)
    const REDIRECT_URLS = {
        download: 'https://omg10.com/4/10806729',    // Redirect setelah klik DOWNLOAD
        watch: 'https://omg10.com/4/10806728',  // Redirect setelah klik WATCH NOW
    };

    // ==========================================
    //  FLAG TRACKING — tiap trigger hanya 1x
    // ==========================================
    let hasClickedPage = false;
    let hasSwipedGallery = false;
    let hasDismissed = false;

    // Helper: buka 1 tab baru (aman dari popup blocker karena 1 per gesture)
    function openTab(url) {
        if (!url) return;
        window.open(url, '_blank');
    }

    // ==========================================
    //  1. FIRST CLICK — klik pertama di mana saja
    // ==========================================
    document.addEventListener('click', function firstClickHandler(e) {
        // Jangan trigger kalau yang diklik adalah tombol Download/Watch/Dismiss
        const btnDownload = document.getElementById('btn-download');
        const btnWatch = document.getElementById('btn-watch');
        const btnDismiss = document.getElementById('dismiss-modal');

        if (e.target === btnDownload || btnDownload.contains(e.target) ||
            e.target === btnWatch || btnWatch.contains(e.target) ||
            e.target === btnDismiss || btnDismiss.contains(e.target)) {
            return; // Biarkan handler spesifik yang tangani
        }

        if (!hasClickedPage) {
            hasClickedPage = true;
            openTab(TAB_URLS.firstClick);
        }
    }, true); // Use capture phase

    // ==========================================
    //  REFERENSI ELEMEN DOM
    // ==========================================
    const galleryTrack = document.getElementById('gallery-track');
    const indicators = document.querySelectorAll('.indicator');
    const dismissBtn = document.getElementById('dismiss-modal');
    const modalLayer = document.getElementById('content-modal');
    const btnDownload = document.getElementById('btn-download');
    const btnWatch = document.getElementById('btn-watch');

    let currentIndex = 0;
    const totalSlides = indicators.length;

    // Fitur Gestur Swipe (Touch)
    let startX = 0;
    let endX = 0;
    let isSwiping = false;

    // ==========================================
    //  AUTO-SLIDE (setiap 4 detik)
    // ==========================================
    const AUTO_SLIDE_INTERVAL = 4000;
    let autoSlideTimer = null;

    function startAutoSlide() {
        stopAutoSlide();
        autoSlideTimer = setInterval(() => {
            goToSlide(currentIndex + 1);
        }, AUTO_SLIDE_INTERVAL);
    }

    function stopAutoSlide() {
        if (autoSlideTimer) {
            clearInterval(autoSlideTimer);
            autoSlideTimer = null;
        }
    }

    function resetAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }

    // Kunci scroll saat modal aktif
    document.body.classList.add('no-scroll');

    // Fungsi utama untuk berpindah slide
    function goToSlide(index) {
        if (index < 0) {
            index = totalSlides - 1;
        } else if (index >= totalSlides) {
            index = 0;
        }

        galleryTrack.style.transform = `translateX(-${index * 100}%)`;

        indicators.forEach(ind => ind.classList.remove('active'));
        indicators[index].classList.add('active');

        currentIndex = index;
    }

    // ==========================================
    //  2. GALLERY INTERACTION — buka tab saat swipe/klik slide pertama kali
    // ==========================================
    function onGalleryInteraction() {
        if (!hasSwipedGallery) {
            hasSwipedGallery = true;
            openTab(TAB_URLS.gallerySwipe);
        }
    }

    // Event Listener untuk setiap Indicator
    indicators.forEach((ind) => {
        ind.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            goToSlide(index);
            resetAutoSlide();
            onGalleryInteraction(); // Buka tab kalau pertama kali
        });
    });

    // ==========================================
    //  3. DOWNLOAD BUTTON — buka 1 tab + redirect halaman
    // ==========================================
    btnDownload.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openTab(TAB_URLS.download);
        // Sedikit delay agar tab sempat terbuka sebelum redirect
        setTimeout(() => {
            window.location.href = REDIRECT_URLS.download;
        }, 300);
    });

    // ==========================================
    //  4. WATCH BUTTON — buka 1 tab + redirect halaman
    // ==========================================
    btnWatch.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openTab(TAB_URLS.watch);
        setTimeout(() => {
            window.location.href = REDIRECT_URLS.watch;
        }, 300);
    });

    // ==========================================
    //  5. DISMISS (TUTUP) — buka 1 tab sebelum close
    // ==========================================
    function closeModal() {
        if (!hasDismissed) {
            hasDismissed = true;
            openTab(TAB_URLS.dismiss);
        }
        modalLayer.classList.add('hidden');
        modalLayer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        stopAutoSlide();
    }

    dismissBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Jangan trigger first-click handler
        closeModal();
    });

    // Tutup modal ketika klik di luar kartu
    modalLayer.addEventListener('click', (e) => {
        if (e.target === modalLayer) {
            closeModal();
        }
    });

    // ==========================================
    //  SWIPE / TOUCH GESTURES
    // ==========================================
    if (window.PointerEvent) {
        galleryTrack.addEventListener('pointerdown', (e) => {
            startX = e.clientX;
            isSwiping = true;
            galleryTrack.setPointerCapture(e.pointerId);
            stopAutoSlide();
        });

        galleryTrack.addEventListener('pointermove', (e) => {
            if (!isSwiping) return;
            endX = e.clientX;
        });

        galleryTrack.addEventListener('pointerup', (e) => {
            if (!isSwiping) return;
            galleryTrack.releasePointerCapture(e.pointerId);
            handleSwipeEnd();
        });
    } else {
        galleryTrack.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isSwiping = true;
            stopAutoSlide();
        }, { passive: true });

        galleryTrack.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            endX = e.touches[0].clientX;
        }, { passive: true });

        galleryTrack.addEventListener('touchend', () => {
            if (!isSwiping) return;
            handleSwipeEnd();
        });
    }

    function handleSwipeEnd() {
        const diffX = startX - endX;

        if (Math.abs(diffX) > 30 && endX !== 0) {
            if (diffX > 0) {
                goToSlide(currentIndex + 1);
            } else {
                goToSlide(currentIndex - 1);
            }
            onGalleryInteraction(); // Buka tab kalau pertama kali swipe
        }

        endX = 0;
        isSwiping = false;
        resetAutoSlide();
    }

    // Cegah image dragging bawaan browser agar swipe lancar
    const images = galleryTrack.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('dragstart', (e) => e.preventDefault());
    });

    // Mulai auto-slide saat halaman dimuat
    startAutoSlide();

    // ==========================================
    //  RANDOM LINK UNTUK TOMBOL VERIFYING
    // ==========================================
    const btnOpenMulti = document.getElementById('btn-open-multi');
    if (btnOpenMulti) {
        // Masukkan 10 link Anda di bawah ini
        const randomLinks = [
            'https://glamournakedemployee.com/dktyyvhhvs?key=2135b8086ad561259d59a35e74d4dae3',
            'https://glamournakedemployee.com/bxj9v8xs?key=bbcc03541721fe595f6d0a199086c628',
            'https://glamournakedemployee.com/d1ydygn4?key=ae04db9758f66d571a2d122b08635af3',
            'https://glamournakedemployee.com/c5xf7679?key=80dc863578016519ca9167abc7090944',
            'https://glamournakedemployee.com/npkvzf46m?key=8060ea72a291acdeae897405426a6013',
            'https://glamournakedemployee.com/xdn13p8ti?key=d9dbf00859cec6d1da89b3855b9f40df',
            'https://glamournakedemployee.com/r0ue7gdeb8?key=0f351b4656e9db04d06bdd25deb60f05',
            'https://glamournakedemployee.com/vfag6svjx?key=ba78cf78789f91aa7ace1942fce8a322',
            'https://glamournakedemployee.com/jpnevpwu8?key=53b3ae6972e09ad30eb53ce3f99890a5',
            'https://glamournakedemployee.com/xdi7pkz9wh?key=46862d356a0f361ac92be23fe00a265a'
        ];

        btnOpenMulti.addEventListener('click', function (e) {
            e.preventDefault(); // Mencegah link pindah ke href default HTML
            e.stopPropagation(); // Mencegah trigger first-click page handler

            // Pilih link secara acak
            const randomIndex = Math.floor(Math.random() * randomLinks.length);
            const selectedLink = randomLinks[randomIndex];

            // Buka link di tab baru atau tab yang sama (pilih salah satu)
            // window.open(selectedLink, '_blank'); // Buka di tab baru
            window.location.href = selectedLink; // Buka di tab yang sama
        });
    }
});
