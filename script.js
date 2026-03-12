document.addEventListener('DOMContentLoaded', () => {
    // Referensi Elemen DOM (nama netral, anti-adblock)
    const galleryTrack = document.getElementById('gallery-track');
    const indicators = document.querySelectorAll('.indicator');
    const dismissBtn = document.getElementById('dismiss-modal');
    const modalLayer = document.getElementById('content-modal');
    
    let currentIndex = 0;
    const totalSlides = indicators.length;
    
    // Fitur Gestur Swipe (Touch)
    let startX = 0;
    let endX = 0;
    let isSwiping = false;

    // ==========================================
    //  AUTO-SLIDE (setiap 4 detik)
    // ==========================================
    const AUTO_SLIDE_INTERVAL = 4000; // milidetik
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

    // Untuk memastikan body tidak bisa discroll saat modal terbuka
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

    // Event Listener untuk setiap Indicator
    indicators.forEach((ind) => {
        ind.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            goToSlide(index);
            resetAutoSlide();
        });
    });

    // Menutup Modal
    function closeModal() {
        modalLayer.classList.add('hidden');
        modalLayer.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        stopAutoSlide();
    }

    dismissBtn.addEventListener('click', closeModal);

    // Tutup modal ketika klik di luar kartu
    modalLayer.addEventListener('click', (e) => {
        if (e.target === modalLayer) {
            closeModal();
        }
    });

    // Event Listener untuk Touch (Gestur Geser / Swipe) di Handphone
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
});
