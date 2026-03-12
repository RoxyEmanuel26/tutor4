/**
 * =============================================
 *  ADS LOADER - File Terpisah untuk Iklan
 * =============================================
 *  Semua script iklan dikelola di sini supaya
 *  rapi dan mudah ditambah/dihapus nantinya.
 *
 *  CARA MENAMBAH IKLAN BARU:
 *  - Popunder : tambahkan URL ke array POPUNDER_SCRIPTS
 *  - Social Bar: tambahkan URL ke array SOCIALBAR_SCRIPTS
 *  - Lainnya  : buat array baru dan panggil loadScripts()
 * =============================================
 */

(function () {
    'use strict';

    // ==========================================
    //  DAFTAR SCRIPT POPUNDER
    //  (Tambahkan URL baru di bawah ini)
    // ==========================================
    const POPUNDER_SCRIPTS = [
        'https://latherachelesscatastrophe.com/f8/11/b2/f811b26d75b7c9fa8cf9029819eff8e8.js',
        // Tambahkan popunder baru di sini:
        // 'https://example.com/popunder3.js',
        // 'https://example.com/popunder4.js',
    ];

    // ==========================================
    //  DAFTAR SCRIPT SOCIAL BAR
    //  (Tambahkan URL baru di bawah ini)
    // ==========================================
    const SOCIALBAR_SCRIPTS = [
        'https://latherachelesscatastrophe.com/a0/a3/f7/a0a3f73e5c3da28dfd611ae7ffa7ab51.js',
        // Tambahkan social bar baru di sini:
        // 'https://example.com/socialbar2.js',
    ];

    // ==========================================
    //  FUNGSI PEMUAT SCRIPT
    //  Memuat semua script dari array secara async
    // ==========================================
    function loadScripts(scriptUrls) {
        scriptUrls.forEach(function (url) {
            if (!url || url.trim() === '') return;
            var s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.setAttribute('data-cfasync', 'false');
            document.body.appendChild(s);
        });
    }

    // Muat semua iklan setelah halaman selesai load
    // agar tidak menghambat render utama
    if (document.readyState === 'complete') {
        loadScripts(POPUNDER_SCRIPTS);
        loadScripts(SOCIALBAR_SCRIPTS);
    } else {
        window.addEventListener('load', function () {
            loadScripts(POPUNDER_SCRIPTS);
            loadScripts(SOCIALBAR_SCRIPTS);
        });
    }
})();
