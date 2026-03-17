; (function () {
    'use strict';
    var W = window.__WeddingApp;
    if (!W) return;
    var $ = W.$;
    var $$ = W.$$;
    var pad = W.pad;
    var showToast = W.showToast;
    var CONFIG = W.CONFIG;
    function initScrollReveal() {
        const items = $$('.reveal');
        if (items.length) {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('revealed');
                        obs.unobserve(e.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
            items.forEach(el => obs.observe(el));
        }
        const gallerySection = $('#gallery');
        if (!gallerySection) return;
        W.prepareGalleryRevealState();
        const galleryObs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                W.revealGalleryOnFirstEntry();
                galleryObs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
        galleryObs.observe(gallerySection);
    }
    function initCountdown() {
        const els = {
            days: $('#cd-days'),
            hours: $('#cd-hours'),
            mins: $('#cd-mins'),
            secs: $('#cd-secs'),
        };
        if (!els.days) return;
        let countdownTimer = null;
        function tick() {
            if (document.hidden) return;
            const now = new Date();
            const diff = CONFIG.weddingDate - now;
            if (diff <= 0) {
                els.days.textContent = '00';
                els.hours.textContent = '00';
                els.mins.textContent = '00';
                els.secs.textContent = '00';
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                }
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            els.days.textContent = pad(d);
            els.hours.textContent = pad(h);
            els.mins.textContent = pad(m);
            els.secs.textContent = pad(s);
        }
        tick();
        countdownTimer = setInterval(tick, 1000);
    }
    function initCalendar() {
        const container = $('#calendar-days');
        if (!container) return;
        const wDay = parseInt(W.CFG.wedding?.day || '20', 10);
        const wMonth = parseInt(W.CFG.wedding?.month || '12', 10);
        const wYear = parseInt(W.CFG.wedding?.year || '2026', 10);
        const year = wYear;
        const month = wMonth - 1;
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const monthLabel = monthNames[month];
        const headerMonth = $('#calendar-month-name');
        const headerYear = $('#calendar-year-name');
        const subtitle = $('#calendar-subtitle');
        if (headerMonth) headerMonth.textContent = monthLabel;
        if (headerYear) headerYear.textContent = `Năm ${year}`;
        if (subtitle) subtitle.textContent = `${monthLabel} - ${year}`;
        const firstDaySundayBased = new Date(year, month, 1).getDay();
        const firstDayMondayBased = (firstDaySundayBased + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const toDayList = (value) => {
            if (!Array.isArray(value)) return [];
            return value
                .map((item) => parseInt(String(item), 10))
                .filter((item) => Number.isInteger(item));
        };
        const configuredPrimaryDays = toDayList(W.CFG.wedding?.calendar_marks?.primary_days);
        const configuredSecondaryDays = toDayList(W.CFG.wedding?.calendar_marks?.secondary_days);
        const fallbackPrimaryDays = Number.isInteger(wDay) ? [wDay] : [];
        const primaryDaySet = new Set((configuredPrimaryDays.length ? configuredPrimaryDays : fallbackPrimaryDays)
            .filter((day) => day >= 1 && day <= daysInMonth));
        const secondaryDaySet = new Set(configuredSecondaryDays
            .filter((day) => day >= 1 && day <= daysInMonth && !primaryDaySet.has(day)));
        let html = '';
        for (let i = firstDayMondayBased - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
        }
        for (let d = 1; d <= daysInMonth; d++) {
            if (primaryDaySet.has(d)) {
                html += `<div class="calendar-day wedding-day calendar-day--primary" aria-label="Ngày chính ${d}">
                    <span class="heart-marker">
                        <img src="./assets/images/heart_calendar.png" alt="ngày chính" loading="lazy">
                    </span>
                    <span class="day-num">${d}</span>
                </div>`;
            } else if (secondaryDaySet.has(d)) {
                html += `<div class="calendar-day wedding-day calendar-day--secondary" aria-label="Ngày phụ ${d}">
                    <span class="heart-marker">
                        <img src="./assets/images/heart_calendar.png" alt="ngày phụ" loading="lazy">
                    </span>
                    <span class="day-num">${d}</span>
                </div>`;
            } else {
                html += `<div class="calendar-day">${d}</div>`;
            }
        }
        const totalCells = Math.ceil((firstDayMondayBased + daysInMonth) / 7) * 7;
        const remaining = totalCells - firstDayMondayBased - daysInMonth;
        for (let d = 1; d <= remaining; d++) {
            html += `<div class="calendar-day other-month">${d}</div>`;
        }
        container.innerHTML = html;
    }
    function initRSVP() {
        const form = $('#rsvp-form');
        const success = $('#rsvp-success');
        if (!form) return;
        const personalization = W.getInvitationPersonalization();
        const nameInput = $('#rsvp-name');
        if (nameInput && personalization.guestName) {
            nameInput.value = personalization.guestName;
        }
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = $('#rsvp-name')?.value.trim();
            const attendance = form.querySelector('[name="attendance"]:checked')?.value;
            const guests = $('#rsvp-guests')?.value;
            const side = form.querySelector('[name="side"]:checked')?.value;
            if (!name) { showToast('⚠️ Vui lòng nhập tên của bạn'); return; }
            if (!attendance) { showToast('⚠️ Vui lòng chọn tham dự hay không'); return; }
            if (!side) { showToast('⚠️ Vui lòng chọn bạn ở phía nào'); return; }
            const gFormBase = 'https://docs.google.com/forms/d/e/1FAIpQLScvA8RgdsDZ6nuMolrkGabpP2ZuQkbrIHFawOQOmmNQGr88JQ/viewform';
            const gAttendance = attendance === 'yes' ? 'Có tham dự' : 'Không thể đến';
            const gSide = side === 'groom' ? 'Nhà Trai' : 'Nhà Gái';
            const params = new URLSearchParams({
                'entry.559352220': name,
                'entry.877086558': gAttendance,
                'entry.924523986': guests || '',
                'entry.186230675': gSide
            });
            const GOOGLE_FORM_URL = `${gFormBase}?${params.toString()}`;
            try {
                window.open(GOOGLE_FORM_URL, '_blank');
                form.style.display = 'none';
                success.classList.add('show');
                showToast('💌 Đang mở form xác nhận!');
                W.shootHearts(5);
            } catch (err) {
                showToast('❌ Không thể mở form. Vui lòng thử lại.');
            }
        });
    }
    function initToolbarVisibilityToggle() {
        const toggleBtn = $('#toolbar-toggle-btn');
        const toolbar = $('#toolbar');
        const blessingMessages = $('#blessing-messages');
        if (!toggleBtn || !toolbar || !blessingMessages) return;
        let state = { collapsed: false };
        const applyState = (nextState) => {
            toolbar.classList.toggle('is-hidden', nextState.collapsed);
            blessingMessages.classList.toggle('is-hidden', nextState.collapsed);
            toggleBtn.classList.toggle('is-collapsed', nextState.collapsed);
            toggleBtn.setAttribute('aria-expanded', nextState.collapsed ? 'false' : 'true');
            state = nextState;
        };
        toggleBtn.addEventListener('click', () => {
            applyState({ collapsed: !state.collapsed });
        });
        applyState(state);
    }
    W.register('scrollReveal', initScrollReveal, 10);
    W.register('countdown', initCountdown, 20);
    W.register('calendar', initCalendar, 30);
    W.register('rsvp', initRSVP, 70);
    W.register('toolbarVisibilityToggle', initToolbarVisibilityToggle, 110);
})();
