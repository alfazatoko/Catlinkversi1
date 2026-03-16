// ==================== ANDROID/APK SAFE DIALOGS ====================
(function initGsDialogs() {
    if (window.__gsDialogsReady) return;
    window.__gsDialogsReady = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'gs-backdrop';
    backdrop.id = 'gs-backdrop';
    backdrop.innerHTML = `
        <div class="gs-modal" role="dialog" aria-modal="true">
            <div class="gs-modal-h" id="gs-title">Info</div>
            <div class="gs-modal-b" id="gs-message"></div>
            <div class="gs-modal-f" id="gs-actions"></div>
        </div>`;
    document.body.appendChild(backdrop);

    const toast = document.createElement('div');
    toast.className = 'gs-toast';
    toast.id = 'gs-toast';
    document.body.appendChild(toast);
})();

function gsToast(msg, ms = 1800) {
    const el = document.getElementById('gs-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(window.__gsToastT);
    window.__gsToastT = setTimeout(() => { el.style.display = 'none'; }, ms);
}

function gsAlert(msg, title = 'Info') {
    return new Promise(resolve => {
        const back = document.getElementById('gs-backdrop');
        if (!back) { console.log(msg); resolve(); return; }
        back.style.display = 'flex';
        document.getElementById('gs-title').textContent = title;
        document.getElementById('gs-message').textContent = msg;
        const actions = document.getElementById('gs-actions');
        actions.innerHTML = '';
        const ok = document.createElement('button');
        ok.className = 'gs-btn gs-btn-ok';
        ok.textContent = 'OK';
        ok.onclick = () => { back.style.display = 'none'; resolve(); };
        actions.appendChild(ok);
    });
}

function gsConfirm(msg, title = 'Konfirmasi') {
    return new Promise(resolve => {
        const back = document.getElementById('gs-backdrop');
        if (!back) { resolve(false); return; }
        back.style.display = 'flex';
        document.getElementById('gs-title').textContent = title;
        document.getElementById('gs-message').textContent = msg;
        const actions = document.getElementById('gs-actions');
        actions.innerHTML = '';
        const cancel = document.createElement('button');
        cancel.className = 'gs-btn gs-btn-cancel';
        cancel.textContent = 'Batal';
        cancel.onclick = () => { back.style.display = 'none'; resolve(false); };
        const ok = document.createElement('button');
        ok.className = 'gs-btn gs-btn-ok';
        ok.textContent = 'Ya';
        ok.onclick = () => { back.style.display = 'none'; resolve(true); };
        actions.appendChild(cancel);
        actions.appendChild(ok);
    });
}

function exitAppSafely() {
    try { if (window.Android && typeof window.Android.exitApp === 'function') { window.Android.exitApp(); return true; } } catch (e) { }
    try { if (navigator.app && typeof navigator.app.exitApp === 'function') { navigator.app.exitApp(); return true; } } catch (e) { }
    return false;
}

// ==================== DATA & STATE ====================
let mainDB = JSON.parse(localStorage.getItem('alfaza_v14_8')) || {
    "KASIR 01": { bank: 0, cash: 0, tarik: 0, aks: 0, admin: 0, loginTime: "", tr: [], ts: [] },
    "KASIR 02": { bank: 0, cash: 0, tarik: 0, aks: 0, admin: 0, loginTime: "", tr: [], ts: [] }
};
let currentUser = "", db = null, katAktif = 'BANK';
let tambahSaldoJenis = 'Bank';
let filterKategoriAktif = 'all', filterTambahSaldoAktif = 'all';

// ==================== FORMAT ANGKA (DENGAN TITIK) ====================
// Format input saat mengetik (langsung tambah titik)
window.fmt = function(el) {
    let nilai = el.value.replace(/[^0-9]/g, ''); // Hanya angka
    if (nilai) {
        // Format dengan titik sebagai pemisah ribuan
        el.value = new Intl.NumberFormat('id-ID').format(nilai);
    } else {
        el.value = '';
    }
}

// Konversi dari format Rp 10.000 ke integer 10000
function toInt(v) {
    if (!v) return 0;
    // Hapus semua kecuali angka
    return parseInt(v.toString().replace(/[^0-9]/g, '')) || 0;
}

// Format angka ke tampilan Rupiah (untuk tabel/laporan)
function fmtN(v) {
    return new Intl.NumberFormat('id-ID').format(v || 0);
}

// ==================== LOGIN ====================
window.prosesLogin = function() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pin').value;
    const pins = { "KASIR 01": "1212", "KASIR 02": "2323" };

    if (pins[u] === p) {
        currentUser = u; db = mainDB[u];
        if (!db.loginTime) db.loginTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        document.getElementById('page-login').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('disp-user').innerText = currentUser;
        document.getElementById('disp-login').innerText = db.loginTime;

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('f-tgl-history').value = today;
        document.getElementById('f-tgl-report').value = today;

        const jamNow = new Date().getHours();
        document.getElementById('disp-shift').innerText = (jamNow >= 6 && jamNow < 15) ? "Pagi" : "Malam";

        initEvents();
        refresh();
        filterRiwayat();
    } else { gsAlert('PIN SALAH! Coba lagi.', '❌ Gagal Masuk'); }
}

function initEvents() {
    const inpNom = document.getElementById('t-nom');
    const inpAdm = document.getElementById('t-adm');
    const inpKet = document.getElementById('t-ket');

    // Format otomatis saat mengetik di nominal
    if (inpNom) {
        inpNom.addEventListener('keyup', function(e) {
            let nilai = this.value.replace(/[^0-9]/g, '');
            if (nilai) {
                this.value = new Intl.NumberFormat('id-ID').format(parseInt(nilai));
            } else {
                this.value = '';
            }
        });
        inpNom.addEventListener('keypress', e => { 
            if (e.key == 'Enter') { 
                e.preventDefault(); 
                inpAdm.focus(); 
            } 
        });
    }

    // Format otomatis saat mengetik di admin
    if (inpAdm) {
        inpAdm.addEventListener('keyup', function(e) {
            let nilai = this.value.replace(/[^0-9]/g, '');
            if (nilai) {
                this.value = new Intl.NumberFormat('id-ID').format(parseInt(nilai));
            } else {
                this.value = '';
            }
        });
        inpAdm.addEventListener('keypress', e => { 
            if (e.key == 'Enter') { 
                e.preventDefault(); 
                inpKet.focus(); 
            } 
        });
    }

    if (inpKet) inpKet.addEventListener('keypress', e => { 
        if (e.key == 'Enter') { 
            e.preventDefault(); 
            simpanTr(); 
        } 
    });

    // Format untuk modal tambah saldo
    const modalInput = document.getElementById('modalInput');
    if (modalInput) {
        modalInput.addEventListener('keyup', function(e) {
            let nilai = this.value.replace(/[^0-9]/g, '');
            if (nilai) {
                this.value = new Intl.NumberFormat('id-ID').format(parseInt(nilai));
            } else {
                this.value = '';
            }
        });
        modalInput.addEventListener('keypress', e => { 
            if (e.key == 'Enter') { 
                e.preventDefault(); 
                prosesTambahSaldo(); 
            } 
        });
    }

    // Format untuk modal saldo real
    const modalSaldoRealInput = document.getElementById('modalSaldoRealInput');
    if (modalSaldoRealInput) {
        modalSaldoRealInput.addEventListener('keyup', function(e) {
            let nilai = this.value.replace(/[^0-9]/g, '');
            if (nilai) {
                this.value = new Intl.NumberFormat('id-ID').format(parseInt(nilai));
            } else {
                this.value = '';
            }
        });
        modalSaldoRealInput.addEventListener('keypress', e => { 
            if (e.key == 'Enter') { 
                e.preventDefault(); 
                simpanSaldoReal(); 
            } 
        });
    }

    document.getElementById('modalBatal').onclick = tutupModalTambahSaldo;
    document.getElementById('modalOke').onclick = prosesTambahSaldo;
}

setInterval(() => {
    const d = new Date();
    document.getElementById('disp-jam-jalan').innerText = d.toLocaleTimeString('id-ID');
    document.getElementById('disp-tgl-header').innerText = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}, 1000);

// ==================== NAVIGATION ====================
window.bukaPage = function(pg, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-' + pg).classList.add('active');
    if (el) el.classList.add('active');
    if (pg === 'history') filterRiwayat();
    if (pg === 'report') hitungLaporan();
    tutupModalPilihSaldo();
    tutupModalTambahSaldo();
}

window.pilihKat = function(k, el) {
    katAktif = k;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

// ==================== SIMPAN TRANSAKSI ====================
window.simpanTr = function() {
    const nom = toInt(document.getElementById('t-nom').value);
    const adm = toInt(document.getElementById('t-adm').value);
    const ket = document.getElementById('t-ket').value;
    if (!nom) { gsAlert('Masukkan nominal terlebih dahulu!', '⚠️ Perhatian'); document.getElementById('t-nom').focus(); return; }

    const now = new Date();
    const tgl = now.toISOString().split('T')[0];
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (katAktif === 'TARIK TUNAI') {
        db.cash -= nom;
        db.tarik += nom;
    }
    else if (katAktif === 'AKSESORIS') {
        db.aks += nom;
    }
    else if (katAktif === 'BANK' || katAktif === 'FLIP' || katAktif === 'DANA' || katAktif === 'APP PULSA') {
        db.bank -= nom;
        db.cash += nom;
    }

    db.admin += adm;
    db.tr.unshift({ tgl, jam, kat: katAktif, nom, adm, ket });

    refresh();
    document.getElementById('t-nom').value = document.getElementById('t-adm').value = document.getElementById('t-ket').value = "";
    document.getElementById('t-nom').focus();
    gsToast('✅ Transaksi berhasil disimpan');
}

// ==================== SALDO ====================
window.bukaMenuSaldo = function() { document.getElementById('modalPilihSaldo').style.display = 'flex'; }
window.tutupModalPilihSaldo = function() { document.getElementById('modalPilihSaldo').style.display = 'none'; }

window.pilihJenisSaldo = function(jenis) {
    tambahSaldoJenis = jenis;
    document.getElementById('modalTitle').innerText = jenis === 'Bank' ? '🏦 Tambah Saldo Bank' : '💵 Tambah Saldo Cash';
    document.getElementById('modalInput').value = '';
    tutupModalPilihSaldo();
    document.getElementById('modalTambahSaldo').style.display = 'flex';
    document.getElementById('modalInput').focus();
}

window.prosesTambahSaldo = function() {
    const raw = document.getElementById('modalInput').value.replace(/\./g, '');
    if (raw) {
        const nom = toInt(raw);
        const now = new Date();
        if (tambahSaldoJenis === 'Bank') db.bank += nom; else db.cash += nom;
        db.ts.unshift({ tgl: now.toISOString().split('T')[0], jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), jenis: tambahSaldoJenis, nom, ket: '' });
        refresh();
        gsToast('✅ Saldo berhasil ditambahkan');
    }
    tutupModalTambahSaldo();
}

window.tutupModalTambahSaldo = function() { document.getElementById('modalTambahSaldo').style.display = 'none'; }

// ==================== SALDO REAL APP ====================
window.bukaModalSaldoReal = function() {
    document.getElementById('modalSaldoRealInput').value = '';
    document.getElementById('modalSaldoRealKet').value = '';
    document.getElementById('modalSaldoReal').style.display = 'flex';
    document.getElementById('modalSaldoRealInput').focus();
}

window.tutupModalSaldoReal = function() {
    document.getElementById('modalSaldoReal').style.display = 'none';
}

window.simpanSaldoReal = function() {
    const raw = document.getElementById('modalSaldoRealInput').value.replace(/\./g, '');
    const ket = document.getElementById('modalSaldoRealKet').value;

    if (raw) {
        const nom = toInt(raw);
        const now = new Date();
        db.ts.unshift({
            tgl: now.toISOString().split('T')[0],
            jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            jenis: 'Saldo Real App',
            nom,
            ket
        });
        refresh();
        gsToast('✅ Saldo Real App berhasil disimpan');
    }
    tutupModalSaldoReal();
    if (document.getElementById('page-report').classList.contains('active')) {
        hitungLaporan();
    }
}

// ==================== FILTER ====================
window.filterKategori = function(k, el) { filterKategoriAktif = k; updateFilterActive('#filter-transaksi', el); filterRiwayat(); }
window.filterTambahSaldo = function(j, el) { filterTambahSaldoAktif = j; updateFilterActive('#filter-tambahsaldo', el); filterRiwayat(); }

function updateFilterActive(selector, el) {
    document.querySelectorAll(selector + ' .filter-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

// ==================== FILTER RIWAYAT ====================
window.filterRiwayat = function() {
    const tgl = document.getElementById('f-tgl-history').value;
    const cari = document.getElementById('f-cari').value.toLowerCase();
    let hTr = '', hTs = '';

    const allForDate = [...db.tr.filter(i => i.tgl === tgl)].reverse();

    const katClass = {
        'BANK': 'tr-bank', 'FLIP': 'tr-flip', 'APP PULSA': 'tr-app',
        'DANA': 'tr-dana', 'TARIK TUNAI': 'tr-tarik', 'AKSESORIS': 'tr-aks'
    };

    const filtered = allForDate
        .map((i, idx) => ({ ...i, no: idx + 1 }))
        .filter(i => filterKategoriAktif === 'all' || i.kat === filterKategoriAktif)
        .filter(i => i.kat.toLowerCase().includes(cari) || (i.ket && i.ket.toLowerCase().includes(cari)));

    let totalNomFiltered = 0, totalAdmFiltered = 0;

    filtered.forEach(i => {
        let label = i.kat;
        if (label === 'AKSESORIS') label = 'Aks';
        if (label === 'TARIK TUNAI') label = 'Tarik';
        const cls = katClass[i.kat] || '';
        const ketTeks = i.ket ? (i.ket.length > 7 ? i.ket.substring(0, 7) + '…' : i.ket) : '-';
        totalNomFiltered += i.nom;
        totalAdmFiltered += i.adm;
        hTr += `<tr class="${cls}">
            <td class="no-col" style="text-align:center">${i.no}</td>
            <td>${i.jam}</td>
            <td>${label}</td>
            <td>${fmtN(i.nom)}</td>
            <td>${i.adm > 0 ? fmtN(i.adm) : '-'}</td>
            <td>${ketTeks}</td>
        </tr>`;
    });

    if (filtered.length > 0) {
        hTr += `<tr>
            <td colspan="3" style="text-align:right; font-weight:800; color:#2b67f6; padding:5px 4px; background:#f0f4ff; font-size:8px;">TOTAL (${filtered.length})</td>
            <td style="font-weight:800; color:#2b67f6; font-size:8px; background:#f0f4ff;">${fmtN(totalNomFiltered)}</td>
            <td style="font-weight:800; color:var(--orange); font-size:8px; background:#f0f4ff;">${fmtN(totalAdmFiltered)}</td>
            <td style="background:#f0f4ff;"></td>
        </tr>`;
    }

    const allTsForDate = [...db.ts.filter(i => i.tgl === tgl)].reverse();
    const filteredTs = allTsForDate
        .map((i, idx) => ({ ...i, no: idx + 1 }))
        .filter(i => filterTambahSaldoAktif === 'all' || i.jenis === filterTambahSaldoAktif);

    let totalTsFiltered = 0;
    filteredTs.forEach(i => {
        const tsClass = i.jenis === 'Bank' ? 'tr-bank' : (i.jenis === 'Cash' ? 'tr-aks' : 'tr-bank');
        totalTsFiltered += i.nom;
        hTs += `<tr class="${tsClass}">
            <td class="no-col" style="text-align:center">${i.no}</td>
            <td>${i.jam}</td>
            <td>${i.jenis}</td>
            <td>Rp ${fmtN(i.nom)}</td>
            <td>${i.ket || '-'}</td>
        </tr>`;
    });

    if (filteredTs.length > 0) {
        hTs += `<tr>
            <td colspan="4" style="text-align:right; font-weight:800; color:#2b67f6; padding:5px 4px; background:#f0f4ff; font-size:8px;">TOTAL (${filteredTs.length})</td>
            <td style="font-weight:800; color:#2b67f6; font-size:8px; background:#f0f4ff;">Rp ${fmtN(totalTsFiltered)}</td>
        </tr>`;
    }

    document.getElementById('list-riwayat').innerHTML = hTr ||
        `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-inbox"></i>Tidak ada transaksi</div></td></tr>`;
    document.getElementById('list-tambah-saldo').innerHTML = hTs ||
        `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-inbox"></i>Tidak ada tambah saldo</div></td></tr>`;
}

// ==================== LAPORAN ====================
window.hitungLaporan = function() {
    const tgl = document.getElementById('f-tgl-report').value;
    const fTr = db.tr.filter(x => x.tgl === tgl);
    const fTs = db.ts.filter(x => x.tgl === tgl);

    const getSum = k => fTr.filter(x => x.kat === k).reduce((a, b) => a + b.nom, 0);
    let sBank = getSum('BANK'), sFlip = getSum('FLIP'), sDana = getSum('DANA'), sApp = getSum('APP PULSA');
    let sAks = getSum('AKSESORIS'), sTarik = getSum('TARIK TUNAI');
    let totalPenjualan = sBank + sFlip + sDana + sApp;

    let tModCash = fTs.filter(x => x.jenis === 'Cash').reduce((a, b) => a + b.nom, 0);
    let tModBank = fTs.filter(x => x.jenis === 'Bank').reduce((a, b) => a + b.nom, 0);

    let totalAdmin = fTr.reduce((a, b) => a + b.adm, 0);
    let sisaCashTotal = db.cash + totalAdmin + sAks;

    const saldoRealHistory = fTs.filter(x => x.jenis === 'Saldo Real App');
    let totalSaldoReal = saldoRealHistory.reduce((sum, item) => sum + item.nom, 0);

    // Format tanggal Indonesia
    let tglFmt = tgl;
    try {
        const d = new Date(tgl + 'T12:00:00');
        const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][d.getDay()];
        const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus',
            'September', 'Oktober', 'November', 'Desember'][d.getMonth()];
        tglFmt = `${hariNama}, ${d.getDate()} ${bln} ${d.getFullYear()}`;
    } catch (e) { }

    let saldoRealHistoryHtml = '';
    if (saldoRealHistory.length > 0) {
        saldoRealHistoryHtml = '<div class="history-saldo-real"><div style="font-weight:700; color:var(--primary); margin-bottom:5px; font-size:11px;">📋 Riwayat Saldo Real App:</div>';
        saldoRealHistory.forEach((item, index) => {
            saldoRealHistoryHtml += `
                <div class="history-saldo-item">
                    <span><span class="history-saldo-time">${item.jam}</span> ${item.ket ? '<span class="history-saldo-ket"> - ' + item.ket + '</span>' : ''}</span>
                    <span class="history-saldo-nominal">Rp ${fmtN(item.nom)}</span>
                </div>
            `;
        });
        saldoRealHistoryHtml += `
            <div style="display:flex; justify-content:space-between; margin-top:6px; padding-top:4px; border-top:1px solid var(--primary); font-weight:700; color:var(--primary);">
                <span>TOTAL SALDO REAL:</span>
                <span>Rp ${fmtN(totalSaldoReal)}</span>
            </div>
        </div>`;
    }

    document.getElementById('rep-area').innerHTML = `
        <div class="report-card" id="report-card">
            <div class="report-header">
                <div class="report-logo">
                    <img src="logo.png" style="width:40px; height:40px; border-radius:8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <i class="fa-solid fa-store" style="display:none;"></i>
                </div>
                <div class="report-title">ALFAZA CELL</div>
                <div class="report-subtitle">Brilink Pembukuan Digital</div>
                <div class="report-date">${tglFmt}</div>
            </div>

            <div class="report-row"><span>🏦 Saldo Bank Masuk (Tambah)</span><b>Rp ${fmtN(tModBank)}</b></div>
            
            <h4 style="margin:10px 0 5px; font-size:11px; color:var(--primary); font-weight:800;">📊 Penjualan:</h4>
            <div class="report-row"><span>🏦 Bank</span><b>Rp ${fmtN(sBank)}</b></div>
            <div class="report-row"><span>🔀 Flip</span><b>Rp ${fmtN(sFlip)}</b></div>
            <div class="report-row"><span>👛 Dana</span><b>Rp ${fmtN(sDana)}</b></div>
            <div class="report-row"><span>📱 App Pulsa</span><b>Rp ${fmtN(sApp)}</b></div>
            <div class="report-row" style="background:#f0f4ff; border-radius:8px; padding:6px 4px;">
                <span style="font-weight:800; color:var(--primary)">TOTAL PENJUALAN</span>
                <b style="color:var(--primary)">Rp ${fmtN(totalPenjualan)}</b>
            </div>

            <div class="report-row" style="color:var(--red);"><span>💸 Tarik Tunai</span><b>-Rp ${fmtN(sTarik)}</b></div>
            <div class="report-row" style="background:#f0fff4; border-radius:8px; padding:6px 4px;">
                <span>💰 Sisa Cash Penjualan</span><b style="color:#2d8a47">Rp ${fmtN(db.cash)}</b>
            </div>

            <div class="report-row"><span>📋 Admin</span><b style="color:var(--orange)">Rp ${fmtN(totalAdmin)}</b></div>
            <div class="report-row"><span>🎧 Aksesoris</span><b>Rp ${fmtN(sAks)}</b></div>

            <div class="report-total-section">
                <div class="report-total-row">
                    <span class="report-total-label">💰 SISA CASH TOTAL</span>
                    <span class="report-total-value">Rp ${fmtN(sisaCashTotal)}</span>
                </div>
                <div class="report-footer">
                    Cash: Rp ${fmtN(db.cash)} + Admin: Rp ${fmtN(totalAdmin)} + Aks: Rp ${fmtN(sAks)}
                </div>
            </div>
            
            <div style="margin-top:15px; padding:10px; background:#f8f9ff; border-radius:12px; border:1.5px solid #dde4f5;">
                <div style="font-weight:800; color:var(--primary); margin-bottom:8px; font-size:12px;">
                    <i class="fa-solid fa-scale-balanced"></i> CEK KESESUAIAN SALDO BANK
                </div>
                <div class="comparison-item">
                    <span class="comparison-label">🏦 Saldo Bank Catatan:</span>
                    <span class="comparison-value">Rp ${fmtN(db.bank)}</span>
                </div>
                <div class="comparison-item">
                    <span class="comparison-label">💰 TOTAL Saldo Real App:</span>
                    <span class="comparison-value">Rp ${fmtN(totalSaldoReal)}</span>
                </div>
                <div class="comparison-diff">
                    ${db.bank !== totalSaldoReal ?
            `⚠️ Selisih: Rp ${fmtN(Math.abs(db.bank - totalSaldoReal))} (${db.bank > totalSaldoReal ? 'Lebih catatan' : 'Kurang catatan'})` :
            '✅ Sesuai'}
                </div>
            </div>
            
            ${saldoRealHistoryHtml}
        </div>

        <div class="action-buttons">
            <button type="button" class="action-btn btn-orange" onclick="resetSaldo()">
                <i class="fa-solid fa-rotate-right"></i> Reset
            </button>
            <button type="button" class="action-btn btn-green" onclick="shareLaporanFoto()">
                <i class="fa-solid fa-camera"></i> Share Foto
            </button>
            <button type="button" class="action-btn btn-purple" onclick="shareLaporanPdf()">
                <i class="fa-solid fa-file-pdf"></i> Share PDF
            </button>
            <button type="button" class="action-btn btn-blue" onclick="bukaModalSaldoReal()">
                <i class="fa-solid fa-pencil"></i> Saldo Real
            </button>
        </div>
    `;
}

// ==================== SHARE FOTO (VERSI ANDROID APK) ====================
window.shareLaporanFoto = async function() {
    const element = document.getElementById('report-card');
    if (!element) {
        gsAlert('Tidak ada laporan untuk difoto!', '⚠️ Gagal');
        return;
    }

    try {
        gsToast('📸 Memproses foto laporan...');
        
        // Buat canvas dari elemen laporan
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: false,
            useCORS: true
        });

        // Konversi ke blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // Buat URL object
        const url = URL.createObjectURL(blob);
        
        // Buat link download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'laporan-alfaza-' + new Date().getTime() + '.png';
        
        // Simulasikan klik
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Bersihkan URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        gsToast('✅ Foto laporan tersimpan di folder Download');
        
        // Tanya user mau share manual
        setTimeout(async () => {
            await gsAlert(
                'Foto sudah tersimpan di folder Download.\n\n' +
                'Sekarang buka WhatsApp/Telegram dan lampirkan foto tersebut secara manual.',
                '📸 Berhasil'
            );
        }, 500);
        
    } catch (error) {
        console.error(error);
        gsAlert('Gagal memproses foto: ' + error.message, '❌ Error');
    }
}

// ==================== SHARE PDF (VERSI ANDROID APK) ====================
window.shareLaporanPdf = async function() {
    const element = document.getElementById('report-card');
    if (!element) {
        gsAlert('Tidak ada laporan untuk di-PDF!', '⚠️ Gagal');
        return;
    }

    try {
        gsToast('📄 Membuat PDF...');
        
        // Buat canvas dari elemen laporan
        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: false,
            useCORS: true
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Buat PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width / 2, canvas.height / 2]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        
        // Konversi ke blob
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        // Buat link download
        const link = document.createElement('a');
        link.href = url;
        link.download = 'laporan-alfaza-' + new Date().getTime() + '.pdf';
        
        // Simulasikan klik
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Bersihkan URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        gsToast('✅ PDF laporan tersimpan di folder Download');
        
        // Tanya user mau share manual
        setTimeout(async () => {
            await gsAlert(
                'PDF sudah tersimpan di folder Download.\n\n' +
                'Sekarang buka WhatsApp/Telegram dan lampirkan file PDF tersebut secara manual.',
                '📄 Berhasil'
            );
        }, 500);
        
    } catch (error) {
        console.error(error);
        gsAlert('Gagal membuat PDF: ' + error.message, '❌ Error');
    }
}

// ==================== REFRESH ====================
function refresh() {
    if (!db) return;
    document.getElementById('s-bank').innerText = "Rp " + fmtN(db.bank);
    document.getElementById('s-cash').innerText = "Rp " + fmtN(db.cash);
    document.getElementById('s-tarik').innerText = fmtN(db.tarik);
    document.getElementById('s-aks').innerText = fmtN(db.aks);
    document.getElementById('s-admin').innerText = fmtN(db.admin);
    localStorage.setItem('alfaza_v14_8', JSON.stringify(mainDB));
}

// ==================== RESET ====================
window.resetSaldo = async function() {
    const ok = await gsConfirm('Reset semua saldo ke 0?', '⚠️ Konfirmasi');
    if (ok) {
        Object.keys(mainDB).forEach(k => {
            mainDB[k].bank = 0; mainDB[k].cash = 0;
            mainDB[k].tarik = 0; mainDB[k].aks = 0; mainDB[k].admin = 0;
        });
        localStorage.setItem('alfaza_v14_8', JSON.stringify(mainDB));
        refresh();
        await gsAlert('Saldo telah direset ke 0', '✅ Berhasil');
    }
}

window.logout = async function() {
    const ok = await gsConfirm('Anda yakin ingin keluar?', '👋 Keluar');
    if (!ok) return;
    if (exitAppSafely()) return;
    location.href = location.href;
}