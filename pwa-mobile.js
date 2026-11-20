/* ==========================================================================
   Pazarkule KİBA - PWA katmanı (mobil / tablet arayüzü + dokunmatik kontroller)
   --------------------------------------------------------------------------
   MASAÜSTÜ SÜRÜMÜ DEĞİŞMEZ:
   - Tüm düzen ekleri yalnızca genişlik < 1024 px iken devreye girer
     (<html class="mobile-layout">). PC'de uygulama orijinal dosyadaki gibi
     görünür ve birebir aynı şekilde çalışır.
   - Uygulamanın mevcut mantığı (localStorage kayıtları, tablo çizimi,
     modallar, Excel/yedekleme) olduğu gibi kullanılır. Bu dosya yalnızca
     arayüz ekler ve dokunma olaylarını (uzun basma, sürükle-bırak)
     mevcut fonksiyonlara bağlar.
   ========================================================================== */
(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Yardımcılar                                                        */
    /* ------------------------------------------------------------------ */
    const MOBILE_MAX = 1024;                       // < 1024px = mobil/tablet düzeni
    const TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);

    const $ = id => document.getElementById(id);
    const ready = fn => document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', fn)
        : fn();

    // Uygulamanın kendi fonksiyonlarını güvenli çağırma (yoksa sessiz geç)
    const call = (name, ...args) => {
        try {
            if (typeof window[name] === 'function') return window[name](...args);
        } catch (err) { console.warn('[KİBA] ' + name + ' çağrılamadı', err); }
        return undefined;
    };

    const TAB_IDS = ['evrak', 'tahkikat', 'kiba', 'notlar'];
    const activeTab = () => {
        for (const t of TAB_IDS) {
            const el = $('tabContent-' + t);
            if (el && !el.classList.contains('hidden')) return t;
        }
        return 'evrak';
    };

    const isMobile = () => document.documentElement.classList.contains('mobile-layout');
    const isLoggedIn = () => {
        const m = $('loginModal');
        return !!m && m.classList.contains('hidden');
    };
    const visibleModals = () => Array.from(document.querySelectorAll('.fixed.inset-0'))
        .filter(m => !m.classList.contains('hidden') &&
                     m.id !== 'loginModal' &&
                     m.id !== 'kibaSheet' &&
                     !m.classList.contains('kiba-mlist'));
    const anyModalOpen = () => visibleModals().length > 0;

    /* ------------------------------------------------------------------ */
    /*  1) Dokunmatik ipucu balonu (masaüstündeki title="..." karşılığı)   */
    /* ------------------------------------------------------------------ */
    let tipEl = null;
    function showTip(text, x, y) {
        if (!text) return;
        if (!tipEl) {
            tipEl = document.createElement('div');
            tipEl.id = 'kibaTip';
            document.body.appendChild(tipEl);
        }
        tipEl.textContent = text;
        tipEl.style.maxWidth = Math.min(window.innerWidth * 0.8, 300) + 'px';
        tipEl.style.left = Math.min(window.innerWidth - 16, Math.max(16, x)) + 'px';
        tipEl.style.top = Math.max(8, y) + 'px';
        tipEl.classList.add('show');
        clearTimeout(showTip._t);
        showTip._t = setTimeout(hideTip, 1900);
    }
    function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
    const elementTip = el => {
        const t = el && el.closest ? el.closest('[title]') : null;
        return t ? (t.getAttribute('title') || '').trim() : '';
    };

    /* ------------------------------------------------------------------ */
    /*  2) Düzen modu (masaüstü <-> mobil)                                 */
    /* ------------------------------------------------------------------ */
    let resizeTimer = null;
    let lastMobile = null;

    /* Mobil düzen koşulu: genişlik < 1024px  veya  yatay telefon (kısa ekran) */
    function isMobileViewport() {
        return window.innerWidth < MOBILE_MAX ||
            (window.innerHeight < 500 && window.innerWidth < 1180);
    }

    function applyLayoutMode() {
        const mobile = isMobileViewport();
        document.documentElement.classList.toggle('mobile-layout', mobile);
        document.documentElement.classList.toggle('touch-device', TOUCH);
        document.body.classList.toggle('touch-device', TOUCH);

        if (lastMobile !== null && lastMobile !== mobile) {
            if (!mobile) closeDrawer();                // masaüstüne dönünce çekmece kapanır
            call('refreshAllTableWidths');             // sütun genişlikleri yeni genişliğe göre
            if (mobile) renderMobileList();
        }
        lastMobile = mobile;
        syncFab();
    }

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyLayoutMode, 150);
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => { applyLayoutMode(); renderMobileList(); }, 260);
    });

    /* ------------------------------------------------------------------ */
    /*  3) Uygulama çubuğu, alt sekme çubuğu, çekmece, işlem sayfası       */
    /* ------------------------------------------------------------------ */
    const TABS = [
        { id: 'evrak', label: 'Evrak', icon: 'fa-file-lines' },
        { id: 'tahkikat', label: 'Tahkikat', icon: 'fa-gavel' },
        { id: 'kiba', label: 'Memur', icon: 'fa-user-shield' },
        { id: 'notlar', label: 'Notlar', icon: 'fa-note-sticky' }
    ];
    const TAB_TITLES_M = {
        evrak: 'Evrak Takip',
        tahkikat: 'Tahkikat',
        kiba: 'Memur',
        notlar: 'Yapışkan Notlar'
    };

    function buildChrome() {
        const root = document.querySelector('body > div.flex-1');
        const aside = document.querySelector('aside');
        const main = root ? root.querySelector('main') : null;
        if (!root || !aside || !main) return;

        /* --- Üst uygulama çubuğu --- */
        const bar = document.createElement('div');
        bar.className = 'kiba-appbar no-print';
        bar.innerHTML = `
            <button type="button" class="kiba-icon-btn" id="kibaMenuBtn" title="Menü" aria-label="Menü">
                <i class="fa-solid fa-bars"></i>
            </button>
            <div class="kiba-appbar-title">
                <i class="fa-solid fa-shield-halved"></i>
                <span id="kibaAppbarTitle">Pazarkule KİBA</span>
            </div>
            <button type="button" class="kiba-icon-btn" id="kibaSearchBtn" title="Ara" aria-label="Ara">
                <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <button type="button" class="kiba-icon-btn" id="kibaMoreBtn" title="Hızlı İşlemler" aria-label="Hızlı İşlemler">
                <i class="fa-solid fa-ellipsis-vertical"></i>
            </button>`;
        /* Üst çubuk body'nin flex sütununda, uygulama gövdesinin üstünde durur */
        root.parentElement.insertBefore(bar, root);

        /* --- Çekmece kapatma düğmesi --- */
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.id = 'kibaDrawerClose';
        closeBtn.className = 'no-print';
        closeBtn.setAttribute('aria-label', 'Menüyü kapat');
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        aside.appendChild(closeBtn);

        /* --- Arka plan perdesi --- */
        const scrim = document.createElement('div');
        scrim.className = 'kiba-scrim no-print';
        document.body.appendChild(scrim);

        /* --- Alt sekme çubuğu --- */
        const bn = document.createElement('nav');
        bn.className = 'kiba-bn no-print';
        bn.innerHTML = TABS.map(t => `
            <button type="button" data-tab="${t.id}" id="kibaBn-${t.id}" aria-label="${t.label}">
                <i class="fa-solid ${t.icon}"></i><span>${t.label}</span>
            </button>`).join('');
        document.body.appendChild(bn);
        bn.addEventListener('click', ev => {
            const b = ev.target.closest('button[data-tab]');
            if (!b) return;
            call('switchTab', b.dataset.tab);
            closeDrawer();
            updateHeaderTitle(b.dataset.tab, true);
        });

        /* --- Hızlı ekleme düğmesi --- */
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.id = 'kibaFab';
        fab.className = 'kiba-fab no-print';
        fab.setAttribute('aria-label', 'Yeni kayıt ekle');
        fab.innerHTML = '<i class="fa-solid fa-plus"></i>';
        fab.addEventListener('click', () => {
            const tab = activeTab();
            if (tab === 'notlar') return call('addStickyNote');
            if (tab === 'evrak') return call('openModal', 'evrak');
            if (tab === 'tahkikat') return call('openModal', 'tahkikat');
            if (tab === 'kiba') return call('openModal', 'kiba');
        });
        document.body.appendChild(fab);

        /* --- Hızlı işlemler sayfası (alt panel) --- */
        const sheet = document.createElement('div');
        sheet.id = 'kibaSheet';
        sheet.className = 'kiba-sheet no-print';
        sheet.innerHTML = `
            <div class="kiba-sheet-bg" data-close="1"></div>
            <div class="kiba-sheet-panel" role="dialog" aria-label="Hızlı İşlemler">
                <div class="kiba-sheet-grip"></div>
                <div class="kiba-sheet-title">Hızlı İşlemler</div>
                <button type="button" class="kiba-sheet-item" data-act="stats"><i class="fa-solid fa-chart-pie"></i> İstatistik</button>
                <button type="button" class="kiba-sheet-item" data-act="logs"><i class="fa-solid fa-clock-rotate-left"></i> Loglar</button>
                <button type="button" class="kiba-sheet-item" data-act="excel"><i class="fa-solid fa-floppy-disk"></i> Excel Güncelle</button>
                <button type="button" class="kiba-sheet-item" data-act="backup"><i class="fa-solid fa-database"></i> Yedek Al</button>
                <button type="button" class="kiba-sheet-item" data-act="settings"><i class="fa-solid fa-gear"></i> Ayarlar</button>
                <button type="button" class="kiba-sheet-item" data-act="password"><i class="fa-solid fa-key"></i> Şifre Değiştir</button>
                <button type="button" class="kiba-sheet-item" data-act="help"><i class="fa-solid fa-circle-question"></i> Kısayollar / Yardım</button>
                <button type="button" class="kiba-sheet-item" data-act="install" id="kibaInstallItem" style="display:none"><i class="fa-solid fa-mobile-screen-button"></i> Ana Ekrana Ekle</button>
                <button type="button" class="kiba-sheet-item danger" data-act="logout"><i class="fa-solid fa-right-from-bracket"></i> Çıkış Yap</button>
            </div>`;
        document.body.appendChild(sheet);

        sheet.addEventListener('click', ev => {
            if (ev.target.dataset && ev.target.dataset.close) return closeSheet();
            const b = ev.target.closest('[data-act]');
            if (!b) return;
            const act = b.dataset.act;
            closeSheet();
            setTimeout(() => {
                if (act === 'stats') call('showStatsModal');
                else if (act === 'logs') call('showLogsModal');
                else if (act === 'excel') call('showExcelOptionModal');
                else if (act === 'backup') call('showBackupOptionModal');
                else if (act === 'settings') call('showSettingsModal');
                else if (act === 'password') call('showChangePasswordModal');
                else if (act === 'help') showMobileHelp();
                else if (act === 'install') doInstall();
                else if (act === 'logout') call('logout');
            }, 190);
        });

        /* --- Güncelleme bildirimi --- */
        const upd = document.createElement('div');
        upd.id = 'kibaUpdateBar';
        upd.innerHTML = '<i class="fa-solid fa-circle-arrow-down"></i><span>Yeni sürüm hazır.</span><button type="button">Yenile</button>';
        document.body.appendChild(upd);
        upd.querySelector('button').addEventListener('click', () => window.location.reload());

        /* --- Olay bağlantıları --- */
        $('kibaMenuBtn').addEventListener('click', toggleDrawer);
        $('kibaMoreBtn').addEventListener('click', openSheet);
        $('kibaSearchBtn').addEventListener('click', focusSearch);
        closeBtn.addEventListener('click', closeDrawer);
        scrim.addEventListener('click', closeDrawer);

        updateHeaderTitle(activeTab(), true);
    }

    function updateHeaderTitle(tab, force) {
        const lbl = $('kibaAppbarTitle');
        const t = tab || activeTab();
        if (lbl && (force || lbl.dataset.tab !== t)) {
            lbl.textContent = 'Pazarkule KİBA · ' + (TAB_TITLES_M[t] || 'Evrak Takip');
            lbl.dataset.tab = t;
        }
        TABS.forEach(x => {
            const b = $('kibaBn-' + x.id);
            if (b) b.classList.toggle('active', x.id === t);
        });
    }

    let drawerOpen = false;
    function openDrawer() {
        if (!isMobile()) return;
        document.documentElement.classList.add('sb-open');
        drawerOpen = true;
        const dd = $('userDropdownMenu');
        if (dd) dd.classList.add('hidden');
        syncFab();
    }
    function closeDrawer() {
        document.documentElement.classList.remove('sb-open');
        drawerOpen = false;
        syncFab();
    }
    function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

    let sheetOpen = false;
    function openSheet() {
        const s = $('kibaSheet');
        if (!s) return;
        s.classList.add('open');
        sheetOpen = true;
        syncFab();
    }
    function closeSheet() {
        const s = $('kibaSheet');
        if (!s) return;
        s.classList.remove('open');
        sheetOpen = false;
        syncFab();
    }

    /* Arama alanına odaklan */
    function focusSearch() {
        const idMap = { evrak: 'searchEvrakInput', tahkikat: 'searchTahkikatInput', kiba: 'searchKibaInput' };
        const tab = activeTab();
        const input = $(idMap[tab]);
        if (!input) return;
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => {
            try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        }, 240);
    }

    /* Hızlı ekleme düğmesinin görünürlüğü */
    function syncFab() {
        const fab = $('kibaFab');
        if (!fab) return;
        const show = isMobile() && isLoggedIn() && !anyModalOpen() && !drawerOpen && !sheetOpen;
        fab.classList.toggle('hidden', !show);
    }

    /* --- Ana ekrana ekleme (Android/Chrome kurulum akışı) --- */
    let installEvent = null;
    window.addEventListener('beforeinstallprompt', ev => {
        ev.preventDefault();
        installEvent = ev;
        const item = $('kibaInstallItem');
        if (item) item.style.display = 'flex';
    });
    window.addEventListener('appinstalled', () => {
        installEvent = null;
        const item = $('kibaInstallItem');
        if (item) item.style.display = 'none';
    });
    function doInstall() {
        if (!installEvent) {
            alert('Uygulama zaten kurulu görünüyor.\n\nTelefon/tablet tarayıcısında menüden (⋮) "Ana ekrana ekle" / "Uygulamayı yükle" seçeneğini de kullanabilirsiniz.');
            return;
        }
        installEvent.prompt();
        installEvent.userChoice.then(() => { installEvent = null; }).catch(() => { });
    }

    /* Mobil yardım metni (masaüstü klavye kısayolları yerine dokunma ipuçları) */
    function showMobileHelp() {
        alert(
            'Dokunmatik Kullanım\n\n' +
            '• Kayıt ekle: sağ alttaki mavi + düğmesi\n' +
            '• Sekmeler: alttaki Evrak / Tahkikat / Memur / Notlar çubuğu\n' +
            '• Menü (ayarlar, Excel, yedek, çıkış): sol üstteki ≡ düğmesi\n' +
            '• Hızlı işlemler: sağ üstteki ⋮ düğmesi\n' +
            '• Arama: sağ üstteki büyüteç\n' +
            '• Bir düğmenin/alanın görevini görmek için üzerine uzun basın\n' +
            '• Kart listesinde birden fazla kayıt seçmek için kartlara uzun basın, sonra "Seçilenleri Sil"\n' +
            '• Yapışkan notu taşımak için notu sürükleyin; kategoriye veya çöp kutusuna bırakabilirsiniz\n' +
            '• Tablo sütun genişliği: başlıktaki tutamacı sürükleyin, içeriğe sığdırmak için çift dokunun'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  4) switchTab sarmalama (davranış aynı; ek olarak arayüz senkronu)  */
    /* ------------------------------------------------------------------ */
    function wrapSwitchTab() {
        const orig = window.switchTab;
        if (typeof orig !== 'function' || orig.__kibaWrapped) return;
        const wrapped = function (tabName) {
            const r = orig.apply(this, arguments);
            try {
                updateHeaderTitle(tabName, true);
                if (isMobile()) renderMobileList(tabName);
            } catch (e) { /* yok say */ }
            return r;
        };
        wrapped.__kibaWrapped = true;
        window.switchTab = wrapped;
    }

    /* ------------------------------------------------------------------ */
    /*  5) Kart listesi (tablet / telefonda tablo yerine dokunma dostu)    */
    /* ------------------------------------------------------------------ */
    const MODULE_TABLES = { evrak: 'evrakRecordTable', tahkikat: 'tahkikatRecordTable', kiba: 'kibaRecordTable' };

    /* Kartın başlığında hangi sütunun gösterileceği tercih sırası */
    const BADGE_PREF = {
        evrak: ['TAHKİKAT NO', 'EBYS NO', 'KONUSU', 'TARİH'],
        tahkikat: ['TAHKİKAT NO', 'ŞAHIS/FİRMA', 'KONUSU'],
        kiba: ['ADI', 'SOYADI', 'SİCİL']
    };
    const MODULE_EMPTY = { evrak: 'evrakEmptyState', tahkikat: 'tahkikatEmptyState', kiba: 'kibaEmptyState' };

    /* Başlık hücrelerinden sütun adlarını oku (sıra/gizli sütunlar dahil) */
    function headerTitles(table) {
        const tr = table.querySelector('thead tr');
        if (!tr) return [];
        return Array.from(tr.children)
            .filter(th => !th.classList.contains('tbl-filler'))
            .map(th => (th.textContent || '').trim().replace(/\s+/g, ' '));
    }

    /* Kullanıcının "Tümünü gör" ile açtığı kartlar (liste yenilenince korunur) */
    const expandedCards = new Set();

    /* Hücrede gösterilecek anlamlı bir metin var mı? */
    function hasMeaningfulText(td) {
        const probe = td.cloneNode(true);
        probe.querySelectorAll('input, button, select, textarea').forEach(x => x.remove());
        return !!(probe.textContent || '').replace(/[-–—\s]/g, '');
    }

    /* Bir düğüm ağacını kopyalar ve her kopyayı kaynağıyla eşler (__orig) */
    function cloneLinked(src) {
        const dst = src.cloneNode(true);
        const walk = (a, b) => {
            b.__orig = a;
            if (a.nodeType !== 1 || b.nodeType !== 1) return;
            const ac = Array.from(a.children), bc = Array.from(b.children);
            for (let i = 0; i < ac.length && i < bc.length; i++) walk(ac[i], bc[i]);
        };
        walk(src, dst);
        /* Kopyada id çakışması olmasın (orijinal tabloda kalsın) */
        if (dst.nodeType === 1) {
            dst.removeAttribute('id');
            dst.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        }
        /* Satır içi olay öznitelikleri kopyadan kaldırılır: aksi hâlde olay hem
           tarayıcı tarafından (kopyada) hem de bizim yönlendirmemizle (orijinalde)
           iki kez çalışırdı. Tek çalışma yeri: orijinal hücre (__orig). */
        const strip = el => {
            ['onclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onpaste', 'onblur', 'onfocus']
                .forEach(a => el.removeAttribute(a));
        };
        if (dst.nodeType === 1) {
            strip(dst);
            dst.querySelectorAll('*').forEach(strip);
        }
        return dst;
    }

    /* Kart içindeki kopya alanların değerlerini orijinal (gizli) tabloya yazar */
    function syncField(root) {
        root.querySelectorAll('input, select, textarea').forEach(el => {
            const o = el.__orig;
            if (!o) return;
            if (el.type === 'checkbox' || el.type === 'radio') o.checked = el.checked;
            else o.value = el.value;
        });
    }

    function bindCardEvents(card) {
        card.addEventListener('change', ev => {
            const el = ev.target;
            const o = el.__orig;
            if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                syncField(card);
                if (o && typeof o.onchange === 'function') {
                    try { o.onchange.call(o, { target: o, type: 'change' }); } catch (e) { console.warn(e); }
                    setTimeout(() => renderMobileList(), 140);
                }
            }
        });

        card.addEventListener('keydown', ev => {
            if (ev.key !== 'Enter') return;
            const o = ev.target.__orig;
            if (!o || typeof o.onkeydown !== 'function') return;
            ev.preventDefault();
            syncField(card);
            try { o.onkeydown.call(o, { key: 'Enter', preventDefault() { }, target: o }); } catch (e) { console.warn(e); }
            setTimeout(() => renderMobileList(), 160);
        });

        /* Butonlar: tıklamadan önce aynı alandaki girdiler orijinale yazılır */
        card.addEventListener('click', ev => {
            const btn = ev.target.closest('button');
            if (!btn) return;
            ev.preventDefault();
            ev.stopPropagation();
            const field = btn.closest('.km-field') || card;
            syncField(field);
            const o = btn.__orig;
            if (o && typeof o.onclick === 'function') {
                try { o.onclick.call(o, { target: o, preventDefault() { }, stopPropagation() { } }); } catch (e) { console.warn(e); }
                setTimeout(() => renderMobileList(), 170);
            } else if (!o) {
                /* Kopyası eşlenemeyen düğme: kendi onclick metnini çalıştır */
                const code = btn.getAttribute('onclick');
                if (code) { try { (0, eval)(code); setTimeout(() => renderMobileList(), 170); } catch (e) { console.warn(e); } }
            }
        });
    }

    function moduleList(tab) {
        const t = tab || activeTab();
        const tableId = MODULE_TABLES[t];
        if (!tableId) return;
        const table = $(tableId);
        if (!table) return;

        const wrap = table.closest('.overflow-x-auto') || table.parentElement;
        const host = wrap.parentElement || table.parentElement;
        if (!host) return;

        let list = host.querySelector('.kiba-mlist');
        if (!list) {
            list = document.createElement('div');
            list.className = 'kiba-mlist no-print';
            host.appendChild(list);
        }
        list.dataset.mod = t;
        if (wrap !== table) wrap.classList.add('kiba-table-wrap');

        const titles = headerTitles(table);
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const frag = document.createDocumentFragment();

        rows.forEach((tr, rowIdx) => {
            const cells = Array.from(tr.children).filter(td => !td.classList.contains('tbl-filler'));

            const card = document.createElement('div');
            card.className = 'km-card';
            if (tr.classList.contains('bg-rose-100')) card.classList.add('km-crit');
            else if (tr.classList.contains('bg-amber-100')) card.classList.add('km-warn');
            else if (tr.classList.contains('opacity-60')) card.classList.add('km-done');

            const head = document.createElement('div');
            head.className = 'km-head';

            const idx = document.createElement('span');
            idx.className = 'km-idx';
            idx.textContent = String(rowIdx + 1);
            head.appendChild(idx);

            let badgeEl = null;
            let actionsEl = null;
            let checkEl = null;

            const fields = document.createElement('div');
            fields.className = 'km-fields';

            /* Kart başlığı için uygun sütunu önceden belirle */
            const prefs = BADGE_PREF[t] || [];
            let badgeIdx = -1;
            for (const pref of prefs) {
                const k = titles.findIndex((x, ix) => x.toLocaleUpperCase('tr-TR') === pref &&
                    cells[ix] && hasMeaningfulText(cells[ix]));
                if (k >= 0) { badgeIdx = k; break; }
            }
            if (badgeIdx < 0) {
                badgeIdx = cells.findIndex(td => !td.querySelector('.evrak-select-checkbox') &&
                    !td.querySelector('button') && hasMeaningfulText(td));
            }

            const fieldNodes = [];
            cells.forEach((td, i) => {
                const title = titles[i] || '';
                const T = title.toLocaleUpperCase('tr-TR');

                /* Seçim kutusu -> kart başlığındaki onay kutusu */
                if (td.querySelector('.evrak-select-checkbox')) {
                    checkEl = document.createElement('label');
                    checkEl.className = 'km-check no-print';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.className = 'evrak-select-checkbox';
                    cb.dataset.id = td.querySelector('.evrak-select-checkbox').dataset.id;
                    cb.setAttribute('aria-label', 'Seç');
                    checkEl.appendChild(cb);
                    return;
                }

                /* İşlem düğmeleri -> kartın alt satırı */
                const isActionCell = T === 'İŞLEM' || (td.classList.contains('no-print') && td.querySelector('button'));
                if (isActionCell) {
                    actionsEl = document.createElement('div');
                    actionsEl.className = 'km-actions no-print';
                    const inner = document.createElement('div');
                    Array.from(td.querySelectorAll('button')).forEach(b => {
                        outer: {
                            const nb = cloneLinked(b);
                            nb.className = b.className;
                            nb.setAttribute('type', 'button');
                            inner.appendChild(nb);
                        }
                    });
                    actionsEl.appendChild(inner);
                    return;
                }

                /* ---- Normal alan ---- */
                const field = document.createElement('div');
                field.className = 'km-field';
                const wide = T === 'YAPILACAKLAR (NOTLAR)' || T === 'KONUSU' || /NOT|AÇIKLAMA|ADRES/.test(T);
                if (wide) field.classList.add('km-wide');

                /* Sıra numarası sütunu kart başlığındaki numarayla aynıdır */
                if (T === 'S.NO' || T === 'S. NO' || T === 'SEÇ') return;

                /* Seçilen sütun kartın başlığı olur (altta tekrar edilmez) */
                if (i === badgeIdx && !T.includes('SEÇ')) {
                    const probe = td.cloneNode(true);
                    probe.querySelectorAll('input, button, select, textarea').forEach(x => x.remove());
                    probe.querySelectorAll('.whitespace-nowrap').forEach(x => x.classList.remove('whitespace-nowrap'));
                    if ((probe.textContent || '').trim()) {
                        badgeEl = document.createElement('span');
                        badgeEl.className = 'km-badge';
                        badgeEl.innerHTML = probe.innerHTML;
                        return;
                    }
                }

                const label = document.createElement('span');
                label.className = 'km-label';
                label.textContent = title || '—';

                const val = document.createElement('div');
                val.className = 'km-val';
                Array.from(td.childNodes).forEach(node => val.appendChild(cloneLinked(node)));

                const text = (val.textContent || '').trim();
                /* Yalnızca "-" / "—" içeren alanlar boş sayılır */
                if (/^[-–—\s]*$/.test(text) && !val.querySelector('input, button, select, textarea, audio, img, a, video')) return;
                const hasControl = !!val.querySelector('input, button, select, textarea, audio, img, a, video');
                if (!text && !hasControl) field.classList.add('km-empty');

                field.appendChild(label);
                field.appendChild(val);
                fields.appendChild(field);
                if (!field.classList.contains('km-empty')) fieldNodes.push(field);
            });

            if (badgeEl) head.appendChild(badgeEl);
            else {
                const b = document.createElement('span');
                b.className = 'km-badge';
                b.textContent = 'Kayıt ' + (rowIdx + 1);
                head.appendChild(b);
            }
            if (checkEl) head.appendChild(checkEl);

            card.appendChild(head);
            card.appendChild(fields);

            /* Mobilde kartlar kısa dursun: ilk 4 alan görünür, kalanı "Tümünü gör" ile açılır.
               Kullanıcı bir kartı açtıysa, liste yenilense de açık kalır. */
            const LIMIT = 4;
            const cardKey = t + '|' + (badgeEl ? (badgeEl.textContent || '').trim() : rowIdx);
            if (fieldNodes.length > LIMIT + 1) {
                fieldNodes.forEach((f, k) => { if (k >= LIMIT) f.classList.add('km-extra'); });
                card.classList.toggle('km-collapsed', !expandedCards.has(cardKey));
                const more = document.createElement('button');
                more.type = 'button';
                more.className = 'km-more no-print';
                more.innerHTML = '<span></span><i class="fa-solid fa-chevron-down"></i>';
                const labelMore = open => {
                    more.querySelector('span').textContent = open ? 'Daralt' : ('Tümünü gör (' + fieldNodes.length + ')');
                    more.querySelector('i').classList.toggle('fa-chevron-up', open);
                    more.querySelector('i').classList.toggle('fa-chevron-down', !open);
                };
                labelMore(expandedCards.has(cardKey));
                more.addEventListener('click', ev => {
                    ev.preventDefault(); ev.stopPropagation();
                    const open = card.classList.toggle('km-collapsed') === false;
                    if (open) expandedCards.add(cardKey); else expandedCards.delete(cardKey);
                    labelMore(open);
                });
                card.appendChild(more);
            }
            if (actionsEl) card.appendChild(actionsEl);

            bindCardEvents(card);
            frag.appendChild(card);
        });

        list.innerHTML = '';
        list.appendChild(frag);
        list.style.display = rows.length ? '' : 'none';   // görünüm CSS'te (telefon: tek sütun, tablet: iki sütun)
    }

    function renderMobileList(tab) {
        if (!isMobile()) return;
        try { moduleList(tab); } catch (e) { console.warn('[KİBA] kart listesi', e); }
    }

    /* Tablo çizimlerini sarmala: davranış aynı, sadece kart listesi tazelenir */
    function wrapRenderers() {
        const map = {
            renderEvrakTable: 'evrak',
            renderTahkikatTable: 'tahkikat',
            renderKibaTable: 'kiba'
        };
        Object.keys(map).forEach(name => {
            const orig = window[name];
            if (typeof orig !== 'function' || orig.__kibaWrapped) return;
            const mod = map[name];
            const wrapped = function () {
                const r = orig.apply(this, arguments);
                if (isMobile()) { try { moduleList(mod); } catch (e) { console.warn(e); } }
                return r;
            };
            wrapped.__kibaWrapped = true;
            window[name] = wrapped;
        });
    }

    /* ------------------------------------------------------------------ */
    /*  6) Mobilde toplu silme: kartlara uzun basarak seçim                */
    /* ------------------------------------------------------------------ */
    const selectedIds = () => Array.from(document.querySelectorAll('.evrak-select-checkbox'))
        .filter(cb => cb.checked)
        .map(cb => Number(cb.dataset.id))
        .filter(n => !isNaN(n));

    function syncSelection() {
        const on = new Set(selectedIds());
        document.querySelectorAll('.evrak-select-checkbox').forEach(cb => { cb.checked = on.has(Number(cb.dataset.id)); });
        document.querySelectorAll('.km-card').forEach(c => {
            const cb = c.querySelector('.evrak-select-checkbox');
            c.classList.toggle('km-selected', !!cb && cb.checked);
        });
    }

    function toggleCardSelection(card) {
        const cb = card.querySelector('.evrak-select-checkbox');
        if (!cb) return;
        cb.checked = !cb.checked;
        syncSelection();
    }

    function deleteSelectedMobile() {
        const ids = Array.from(new Set(selectedIds()));
        if (!ids.length) return call('showToast', 'Önce kartlara uzun basarak seçim yapın', null, null);
        if (!confirm(`Seçili ${ids.length} kayıt çöp kutusuna taşınacak. Devam edilsin mi?`)) return;
        const n = call('moveRecordsToTrash', 'evrak', ids);
        call('logAction', 'Sil', `${n} evrak kaydı toplu olarak çöp kutusuna taşındı`);
        call('renderEvrakTable');
        call('showToast', `${n} evrak kaydı çöp kutusuna taşındı`, 'Geri al', () => call('undoRecordTrash', 'evrak', ids));
    }

    /* ------------------------------------------------------------------ */
    /*  7) Dokunmatik: uzun basma (ipucu + kart seçimi)                    */
    /* ------------------------------------------------------------------ */
    function bindTouchGestures() {
        if (!TOUCH) return;
        let timer = null, sx = 0, sy = 0, target = null, longFired = false;

        document.addEventListener('touchstart', ev => {
            if (ev.touches.length !== 1) return;
            const t = ev.touches[0];
            sx = t.clientX; sy = t.clientY; longFired = false;
            target = ev.target;
            if (!target || !target.closest) return;
            if (target.closest('.resizer')) return;

            const card = target.closest('.km-card');
            const tip = elementTip(target);
            if (!card && !tip) return;

            clearTimeout(timer);
            timer = setTimeout(() => {
                longFired = true;
                hideTip();
                if (card) {
                    toggleCardSelection(card);
                    if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { } }
                } else if (tip) {
                    showTip(tip, sx, sy - 14);
                }
            }, 470);
        }, { passive: true });

        document.addEventListener('touchmove', ev => {
            if (!ev.touches.length) return;
            const t = ev.touches[0];
            if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) {
                clearTimeout(timer);
                hideTip();
            }
        }, { passive: true });

        const end = () => { clearTimeout(timer); };
        document.addEventListener('touchend', end, { passive: true });
        document.addEventListener('touchcancel', end, { passive: true });

        /* Uzun basma ile seçim yapıldıysa ardından gelen dokunma yutulur */
        document.addEventListener('click', ev => {
            if (longFired) {
                ev.preventDefault();
                ev.stopPropagation();
                longFired = false;
            }
        }, true);
    }

    /* ------------------------------------------------------------------ */
    /*  8) Dokunmatik sürükle-bırak (yapışkan not -> kategori / çöp)       */
    /* ------------------------------------------------------------------ */
    function bindStickyTouchDnD() {
        const board = $('stickyNotesContainer');
        if (!board) return;

        let drag = null, ghost = null, hot = null, sx = 0, sy = 0;

        const targetAt = (x, y) => {
            const stack = document.elementsFromPoint(x, y) || [];
            for (const t of stack) {
                const d = t.closest ? t.closest('[data-drop]') : null;
                if (d) return d;
            }
            return null;
        };

        const cleanup = () => {
            if (ghost) { ghost.remove(); ghost = null; }
            document.querySelectorAll('.kiba-drop-hot').forEach(el => el.classList.remove('kiba-drop-hot'));
            hot = null;
            drag = null;
        };

        board.addEventListener('touchstart', ev => {
            if (ev.touches.length !== 1) return;
            const note = ev.target.closest('.sticky-note');
            if (!note) return;
            if (ev.target.closest('textarea, input, button, select, audio, a, img, .sticky-resize')) return;
            const t = ev.touches[0];
            sx = t.clientX; sy = t.clientY;
            drag = { note, id: Number(note.dataset.id), armed: false };

            drag.timer = setTimeout(() => {
                if (!drag) return;
                drag.armed = true;
                note.style.opacity = '.85';
                ghost = document.createElement('div');
                ghost.className = 'kiba-drag-ghost';
                ghost.textContent = 'Kategori veya çöp kutusuna bırak';
                ghost.style.left = sx + 'px';
                ghost.style.top = sy + 'px';
                document.body.appendChild(ghost);
                if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) { } }
            }, 320);
        }, { passive: true });

        board.addEventListener('touchmove', ev => {
            if (!drag) return;
            const t = ev.touches[0];
            if (!drag.armed) {
                if (Math.abs(t.clientX - sx) > 9 || Math.abs(t.clientY - sy) > 9) {
                    clearTimeout(drag.timer);
                    drag = null;
                }
                return;
            }
            ev.preventDefault();
            if (ghost) { ghost.style.left = t.clientX + 'px'; ghost.style.top = t.clientY + 'px'; }
            const d = targetAt(t.clientX, t.clientY);
            if (d !== hot) {
                if (hot) hot.classList.remove('kiba-drop-hot');
                hot = d;
                if (hot) hot.classList.add('kiba-drop-hot');
            }
        }, { passive: false });

        const finish = ev => {
            if (!drag) return;
            clearTimeout(drag.timer);
            const armed = drag.armed;
            const id = drag.id;
            const note = drag.note;
            if (armed) {
                ev.preventDefault();
                const pt = (ev.changedTouches && ev.changedTouches[0]) || null;
                const d = pt ? targetAt(pt.clientX, pt.clientY) : null;
                if (note) note.style.opacity = '';
                if (d && d.dataset.drop === 'trash') call('deleteStickyNote', id);
                else if (d && d.dataset.drop === 'cat') call('setStickyCategory', id, d.dataset.cat);
            }
            cleanup();
        };
        board.addEventListener('touchend', finish, { passive: false });
        board.addEventListener('touchcancel', () => {
            if (drag) { clearTimeout(drag.timer); if (drag.note) drag.note.style.opacity = ''; }
            cleanup();
        }, { passive: true });
    }

    /* ------------------------------------------------------------------ */
    /*  9) Çekmece içi bağlantılar                                         */
    /* ------------------------------------------------------------------ */
    function bindDrawerNav() {
        document.querySelectorAll('aside [onclick*="switchTab"]').forEach(b => {
            b.addEventListener('click', () => setTimeout(closeDrawer, 120));
        });
        const dd = $('userDropdownMenu');
        if (dd) dd.querySelectorAll('button').forEach(b => {
            b.addEventListener('click', () => setTimeout(() => { closeDrawer(); syncFab(); }, 80));
        });
    }

    /* ------------------------------------------------------------------ */
    /* 10) Arayüz durumunu izle (giriş, modal, sekme)                      */
    /* ------------------------------------------------------------------ */
    let loginObserversBound = false;
    function observeUI() {
        const apply = () => {
            const logged = isLoggedIn();
            const bn = document.querySelector('.kiba-bn');
            if (bn) bn.style.visibility = logged ? '' : 'hidden';
            const bar = document.querySelector('.kiba-appbar');
            if (bar) bar.style.visibility = logged ? '' : 'hidden';
            if (!logged) closeDrawer();
            syncFab();
        };
        apply();

        /* Sık tetiklenen sınıf değişimlerini tek karede topla (gereksiz iş yapılmasın) */
        let pending = false;
        new MutationObserver(() => {
            if (pending) return;
            pending = true;
            requestAnimationFrame(() => { pending = false; try { apply(); } catch (e) { /* yok say */ } });
        }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

        const titleObs = new MutationObserver(() => updateHeaderTitle(activeTab()));
        TAB_IDS.forEach(t => {
            const el = $('tabContent-' + t);
            if (el) titleObs.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        /* Giriş yapıldığında ilk kart listesini hazırla */
        if (!loginObserversBound) {
            loginObserversBound = true;
            const login = $('loginModal');
            if (login) {
                new MutationObserver(() => {
                    if (isLoggedIn()) setTimeout(() => { renderMobileList(); syncFab(); }, 350);
                }).observe(login, { attributes: true, attributeFilter: ['class'] });
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* 11) Klavye: PC kısayolları korunur, + Esc ile çekmece kapanır       */
    /* ------------------------------------------------------------------ */
    function bindKeys() {
        document.addEventListener('keydown', ev => {
            if (ev.key !== 'Escape') return;
            if (sheetOpen) { closeSheet(); return; }
            if (drawerOpen) { closeDrawer(); return; }
            hideTip();
        });
    }

    /* ------------------------------------------------------------------ */
    /* 12) PWA: service worker + güncelleme bildirimi                      */
    /* ------------------------------------------------------------------ */
    function registerPWA() {
        if (!('serviceWorker' in navigator)) return;
        if (location.protocol === 'file:') return;         // dosyadan açıldıysa SW yok
        navigator.serviceWorker.register('sw.js', { scope: './' }).then(reg => {
            const showUpdate = () => {
                const bar = $('kibaUpdateBar');
                if (bar) bar.classList.add('show');
            };
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
                });
            });
        }).catch(err => console.warn('[KİBA] Service worker kaydı başarısız:', err && err.message));
    }

    /* ------------------------------------------------------------------ */
    /* 13) Başlatma                                                        */
    /* ------------------------------------------------------------------ */
    ready(() => {
        applyLayoutMode();
        buildChrome();
        wrapSwitchTab();
        wrapRenderers();
        bindTouchGestures();
        bindStickyTouchDnD();
        bindDrawerNav();
        observeUI();
        bindKeys();
        registerPWA();

        setTimeout(() => { renderMobileList(); syncFab(); }, 500);

        /* Mobilde "Seçilenleri Sil": seçim yoksa nasıl seçileceğini anlatır */
        const delBtn = Array.from(document.querySelectorAll('#tabContent-evrak button'))
            .find(b => (b.getAttribute('onclick') || '').indexOf('deleteSelectedEvrak') >= 0);
        if (delBtn) {
            delBtn.addEventListener('click', ev => {
                if (!isMobile() || selectedIds().length) return;
                ev.preventDefault();
                ev.stopImmediatePropagation();
                call('showToast', 'Karta uzun basarak kayıt seçebilirsiniz', null, null);
            }, true);
        }
    });

    /* Hata ayıklama / test */
    window.__kibaMobile = {
        refresh: renderMobileList,
        openDrawer, closeDrawer, openSheet, closeSheet,
        isMobile
    };
})();
