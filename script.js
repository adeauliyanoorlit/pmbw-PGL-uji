/* =====================================================
   SCRIPT.JS - Grafik Interaktif Persamaan Garis Lurus
   Mode 1: slider gradien (m) dan titik potong sumbu-y (c)
   Mode 2: titik A dan B yang bisa digeser
   ===================================================== */
(function () {
    'use strict';

    /* ---------- 1. PENGATURAN ---------- */
    const NS = 'http://www.w3.org/2000/svg';
    const UKURAN = 600;                    // ukuran area gambar
    const MIN = -10;                       // batas bawah sumbu x dan y
    const MAX = 10;                        // batas atas sumbu x dan y
    const SKALA = UKURAN / (MAX - MIN);    // piksel untuk setiap 1 satuan

    // Posisi awal titik A dan B (boleh diubah)
    const A = { x: 1, y: 2 };
    const B = { x: 3, y: 6 };

    /* ---------- 2. ELEMEN HTML ---------- */
    const svg = document.getElementById('grafik-svg');
    if (!svg) return;

    const sliderM = document.getElementById('slider-m');
    const sliderC = document.getElementById('slider-c');
    const nilaiM = document.getElementById('nilai-m');
    const nilaiC = document.getElementById('nilai-c');
    const panelSlider = document.getElementById('panel-slider');
    const panelTitik = document.getElementById('panel-titik');
    const hasilPersamaan = document.getElementById('hasil-persamaan');
    const hasilInfo = document.getElementById('hasil-info');

    let mode = 'slider';
    let sedangDiseret = null;

    /* ---------- 3. FUNGSI BANTU ---------- */
    // Koordinat matematika -> koordinat piksel pada SVG
    const px = (x) => (x - MIN) * SKALA;
    const py = (y) => (MAX - y) * SKALA;

    // Format angka: maksimal 2 desimal, tanda minus tampil sebagai "−"
    const fmt = (n) => Number(n.toFixed(2)).toString().replace('-', '−');
    // Angka negatif diberi kurung, contoh: (−2)
    const kurung = (n) => (n < 0 ? '(' + fmt(n) + ')' : fmt(n));

    // Membuat elemen SVG
    function el(nama, atribut, induk) {
        const e = document.createElementNS(NS, nama);
        for (const k in atribut) e.setAttribute(k, atribut[k]);
        (induk || svg).appendChild(e);
        return e;
    }

    // Membuat teks SVG
    function teks(x, y, isi, atribut, induk) {
        const t = el('text', Object.assign({ x: x, y: y }, atribut || {}), induk);
        t.textContent = isi;
        return t;
    }

    // Menyusun teks persamaan y = mx + c
    function teksPersamaan(m, c) {
        const bagianX = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '−x' : fmt(m) + 'x';
        if (bagianX === '') return 'y = ' + fmt(c);
        if (c === 0) return 'y = ' + bagianX;
        return 'y = ' + bagianX + (c > 0 ? ' + ' : ' − ') + fmt(Math.abs(c));
    }

    /* ---------- 4. BIDANG KOORDINAT (kotak-kotak, sumbu, angka) ---------- */
    function gambarKisi() {
        for (let i = MIN; i <= MAX; i++) {
            if (i === 0) continue;
            el('line', { x1: px(i), y1: 0, x2: px(i), y2: UKURAN, class: 'kisi' });
            el('line', { x1: 0, y1: py(i), x2: UKURAN, y2: py(i), class: 'kisi' });
        }

        el('line', { x1: 0, y1: py(0), x2: UKURAN, y2: py(0), class: 'sumbu' });
        el('line', { x1: px(0), y1: 0, x2: px(0), y2: UKURAN, class: 'sumbu' });

        for (let i = -8; i <= 8; i += 2) {
            if (i === 0) continue;
            teks(px(i), py(0) + 16, fmt(i), { class: 'label-sumbu', 'text-anchor': 'middle' });
            teks(px(0) - 8, py(i) + 4, fmt(i), { class: 'label-sumbu', 'text-anchor': 'end' });
        }
        teks(px(0) - 8, py(0) + 16, '0', { class: 'label-sumbu', 'text-anchor': 'end' });
        teks(UKURAN - 10, py(0) - 8, 'x', { class: 'nama-sumbu', 'text-anchor': 'end' });
        teks(px(0) + 10, 16, 'y', { class: 'nama-sumbu' });
    }

    gambarKisi();
    // Lapisan untuk garis dan titik (dihapus dan digambar ulang setiap ada perubahan)
    const lapisan = el('g', { id: 'lapisan' });

    /* ---------- 5. FUNGSI MENGGAMBAR GARIS DAN TITIK ---------- */
    function garis(m, c) {
        el('line', {
            x1: px(MIN), y1: py(m * MIN + c),
            x2: px(MAX), y2: py(m * MAX + c),
            class: 'garis-grafik'
        }, lapisan);
    }

    function garisTegak(x) {
        el('line', { x1: px(x), y1: 0, x2: px(x), y2: UKURAN, class: 'garis-grafik' }, lapisan);
    }

    // Segitiga bantu: dari (x1,y1) ke (x2,y1) lalu ke (x2,y2)
    function segitiga(x1, y1, x2, y2) {
        el('polyline', {
            points: px(x1) + ',' + py(y1) + ' ' + px(x2) + ',' + py(y1) + ' ' + px(x2) + ',' + py(y2),
            class: 'bantu'
        }, lapisan);
    }

    function gambarTitik(p, nama, kelas) {
        el('circle', { cx: px(p.x), cy: py(p.y), r: 8, class: kelas }, lapisan);
        teks(px(p.x) + 12, py(p.y) - 12, nama + '(' + fmt(p.x) + ', ' + fmt(p.y) + ')',
            { class: 'label-titik' }, lapisan);
    }

    /* ---------- 6. MODE 1: SLIDER m DAN c ---------- */
    function modeSlider() {
        const m = parseFloat(sliderM.value);
        const c = parseFloat(sliderC.value);
        nilaiM.textContent = fmt(m);
        nilaiC.textContent = fmt(c);

        garis(m, c);

        // Segitiga gradien: maju 1 satuan ke kanan, naik/turun sebesar m
        segitiga(0, c, 1, c + m);
        teks(px(0.5), py(c) + (m >= 0 ? 18 : -8), '1',
            { class: 'label-bantu', 'text-anchor': 'middle' }, lapisan);
        teks(px(1) + 8, py(c + m / 2) + 4, 'm = ' + fmt(m),
            { class: 'label-bantu' }, lapisan);

        // Titik potong sumbu-y
        el('circle', { cx: px(0), cy: py(c), r: 7, class: 'titik-c' }, lapisan);
        teks(px(0) + 12, py(c) - 12, '(0, ' + fmt(c) + ')',
            { class: 'label-titik', fill: '#166534' }, lapisan);

        const jenis = m > 0 ? 'naik ke kanan (miring ke kanan atas)'
            : m < 0 ? 'turun ke kanan (miring ke kanan bawah)'
            : 'mendatar (horizontal)';

        hasilPersamaan.textContent = teksPersamaan(m, c);
        hasilInfo.innerHTML = 'Gradien <strong>m = ' + fmt(m) + '</strong> dan memotong sumbu-y di ' +
            '<strong>(0, ' + fmt(c) + ')</strong>.<br>Garis ' + jenis + '.';
    }

    /* ---------- 7. MODE 2: TITIK A DAN B ---------- */
    function modeTitik() {
        const dx = B.x - A.x;
        const dy = B.y - A.y;

        if (dx === 0 && dy === 0) {
            hasilPersamaan.textContent = 'Titik A dan B berimpit';
            hasilInfo.innerHTML = 'Geser salah satu titik agar terbentuk sebuah garis.';
        } else if (dx === 0) {
            garisTegak(A.x);
            hasilPersamaan.textContent = 'x = ' + fmt(A.x);
            hasilInfo.innerHTML = 'Titik A dan B memiliki nilai x yang sama, sehingga garisnya tegak (vertikal).<br>' +
                'Gradien <strong>tidak terdefinisi</strong> karena pembaginya ' +
                '(x<sub>2</sub> − x<sub>1</sub>) = 0.';
        } else {
            const m = dy / dx;
            const c = A.y - m * A.x;
            garis(m, c);

            // Segitiga bantu dari A ke B
            segitiga(A.x, A.y, B.x, B.y);
            teks(px((A.x + B.x) / 2), py(A.y) + (B.y >= A.y ? 18 : -8), 'selisih x = ' + fmt(dx),
                { class: 'label-bantu', 'text-anchor': 'middle' }, lapisan);
            teks(px(B.x) + (dx >= 0 ? 8 : -8), py((A.y + B.y) / 2) + 4, 'selisih y = ' + fmt(dy),
                { class: 'label-bantu', 'text-anchor': dx >= 0 ? 'start' : 'end' }, lapisan);

            hasilPersamaan.textContent = teksPersamaan(m, c);
            hasilInfo.innerHTML =
                'm = (y<sub>2</sub> − y<sub>1</sub>) / (x<sub>2</sub> − x<sub>1</sub>)<br>' +
                'm = (' + fmt(B.y) + ' − ' + kurung(A.y) + ') / (' + fmt(B.x) + ' − ' + kurung(A.x) + ')<br>' +
                'm = ' + fmt(dy) + ' / ' + fmt(dx) + ' = <strong>' + fmt(m) + '</strong>';
        }

        gambarTitik(A, 'A', 'titik-a');
        gambarTitik(B, 'B', 'titik-b');
    }

    /* ---------- 8. MENGGAMBAR ULANG ---------- */
    function perbarui() {
        while (lapisan.firstChild) lapisan.removeChild(lapisan.firstChild);
        if (mode === 'slider') modeSlider();
        else modeTitik();
    }

    /* ---------- 9. TAB PILIHAN MODE ---------- */
    document.querySelectorAll('.tab-btn').forEach(function (tombol) {
        tombol.addEventListener('click', function () {
            mode = tombol.dataset.mode;
            document.querySelectorAll('.tab-btn').forEach(function (t) {
                t.classList.toggle('aktif', t === tombol);
            });
            panelSlider.hidden = mode !== 'slider';
            panelTitik.hidden = mode !== 'titik';
            svg.classList.toggle('mode-titik', mode === 'titik');
            perbarui();
        });
    });

    sliderM.addEventListener('input', perbarui);
    sliderC.addEventListener('input', perbarui);

    /* ---------- 10. MENYERET TITIK (mouse dan sentuhan) ---------- */
    // Posisi pointer -> koordinat di dalam SVG
    function posisiPointer(e) {
        const r = svg.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * UKURAN / r.width,
            y: (e.clientY - r.top) * UKURAN / r.height
        };
    }

    // Koordinat SVG -> koordinat matematika (dibulatkan ke bilangan bulat)
    function keSatuan(p) {
        const batas = (n) => Math.max(MIN + 1, Math.min(MAX - 1, n));
        return {
            x: batas(Math.round(MIN + p.x / SKALA)),
            y: batas(Math.round(MAX - p.y / SKALA))
        };
    }

    svg.addEventListener('pointerdown', function (e) {
        if (mode !== 'titik') return;
        const p = posisiPointer(e);
        const jarakA = Math.hypot(p.x - px(A.x), p.y - py(A.y));
        const jarakB = Math.hypot(p.x - px(B.x), p.y - py(B.y));
        if (Math.min(jarakA, jarakB) > 36) return;   // terlalu jauh dari kedua titik

        sedangDiseret = jarakA <= jarakB ? A : B;
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    svg.addEventListener('pointermove', function (e) {
        if (!sedangDiseret) return;
        const u = keSatuan(posisiPointer(e));
        if (u.x !== sedangDiseret.x || u.y !== sedangDiseret.y) {
            sedangDiseret.x = u.x;
            sedangDiseret.y = u.y;
            perbarui();
        }
    });

    function lepas() { sedangDiseret = null; }
    svg.addEventListener('pointerup', lepas);
    svg.addEventListener('pointercancel', lepas);

    /* ==========================================================
       TAMBAHAN BARU - 11. TOMBOL PENYELESAIAN (Contoh Soal)
       DOM   : mengambil elemen dan mengubah atribut hidden
       EVENT : click pada tombol
       ========================================================== */
    document.querySelectorAll('.btn-solusi').forEach(function (tombol) {
        tombol.addEventListener('click', function () {            // EVENT: saat tombol diklik
            const solusi = tombol.nextElementSibling;              // DOM: elemen tepat setelah tombol
            solusi.hidden = !solusi.hidden;                        // DOM: tampilkan / sembunyikan
            tombol.textContent = solusi.hidden ? 'Lihat Penyelesaian' : 'Sembunyikan Penyelesaian';
        });
    });

    /* ==========================================================
       TAMBAHAN BARU - 12. KUIS GRADIEN (soal acak)
       DOM   : membaca kotak jawaban, menulis soal dan umpan balik
       EVENT : click (Periksa, Soal Baru) dan keydown (tombol Enter)
       ========================================================== */
    const kuisSoal = document.getElementById('kuis-soal');
    const kuisJawaban = document.getElementById('kuis-jawaban');
    const kuisPeriksa = document.getElementById('kuis-periksa');
    const kuisBaru = document.getElementById('kuis-baru');
    const kuisUmpan = document.getElementById('kuis-umpan');
    const kuisSkor = document.getElementById('kuis-skor');
    const kuisTotal = document.getElementById('kuis-total');

    let kuis = null;          // soal yang sedang tampil
    let jumlahBenar = 0;
    let jumlahSoal = 0;

    const acak = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    function fpb(a, b) { return b === 0 ? Math.abs(a) : fpb(b, a % b); }

    // Pecahan paling sederhana, contoh: 4/2 menjadi "2", 2/4 menjadi "1/2"
    function pecahan(dy, dx) {
        const g = fpb(dy, dx);
        const n = dy / g;
        const d = dx / g;
        return d === 1 ? fmt(n) : fmt(n) + '/' + d;
    }

    // Membaca jawaban siswa: boleh 2, -1/2, 0.5, atau 0,5
    function bacaAngka(isi) {
        const t = isi.trim().replace(/−/g, '-').replace(/,/g, '.');
        if (t.indexOf('/') !== -1) {
            const bagian = t.split('/');
            return parseFloat(bagian[0]) / parseFloat(bagian[1]);
        }
        return parseFloat(t);
    }

    function tampilUmpan(isi, jenis) {
        kuisUmpan.innerHTML = isi;                 // DOM: menulis umpan balik ke halaman
        kuisUmpan.className = 'umpan ' + jenis;    // DOM: mengganti kelas (warna hijau/merah)
    }

    function soalBaru(fokus) {
        const x1 = acak(-4, 4);
        const y1 = acak(-4, 4);
        const dx = acak(1, 4);
        const dy = acak(-5, 5);
        kuis = { x1: x1, y1: y1, x2: x1 + dx, y2: y1 + dy, dx: dx, dy: dy };

        kuisSoal.textContent = 'P(' + fmt(kuis.x1) + ', ' + fmt(kuis.y1) + ') dan Q(' +
            fmt(kuis.x2) + ', ' + fmt(kuis.y2) + ')';
        kuisJawaban.value = '';
        kuisJawaban.disabled = false;
        kuisPeriksa.disabled = false;
        tampilUmpan('', '');
        if (fokus) kuisJawaban.focus();
    }

    function periksa() {
        if (!kuis) return;
        const jawab = bacaAngka(kuisJawaban.value);   // DOM: membaca isi kotak jawaban
        if (!isFinite(jawab)) {
            tampilUmpan('Isi jawaban dengan angka, misalnya 2, −1/2, atau 0.5.', 'info');
            return;
        }

        const benar = Math.abs(jawab - kuis.dy / kuis.dx) < 0.01;
        jumlahSoal++;
        if (benar) jumlahBenar++;
        kuisSkor.textContent = jumlahBenar;
        kuisTotal.textContent = jumlahSoal;

        const langkah = 'm = (' + fmt(kuis.y2) + ' − ' + kurung(kuis.y1) + ') / (' +
            fmt(kuis.x2) + ' − ' + kurung(kuis.x1) + ') = ' + fmt(kuis.dy) + ' / ' + kuis.dx +
            ' = <strong>' + pecahan(kuis.dy, kuis.dx) + '</strong>';
        tampilUmpan((benar ? '<strong>Benar!</strong> ' : '<strong>Belum tepat.</strong> Pembahasan: ') + langkah,
            benar ? 'benar' : 'salah');

        kuisJawaban.disabled = true;     // DOM: soal ini selesai, kunci kotak jawaban
        kuisPeriksa.disabled = true;
    }

    kuisPeriksa.addEventListener('click', periksa);                        // EVENT: tombol Periksa diklik
    kuisBaru.addEventListener('click', function () { soalBaru(true); });   // EVENT: tombol Soal Baru diklik
    kuisJawaban.addEventListener('keydown', function (e) {                 // EVENT: menekan tombol keyboard
        if (e.key === 'Enter') periksa();
    });

    soalBaru(false);   // soal pertama saat halaman dibuka

    /* ---------- 13. TAMPILAN AWAL ---------- */
    perbarui();
})();