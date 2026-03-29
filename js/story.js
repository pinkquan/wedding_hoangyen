; (function () {
    'use strict';
    var W = window.__WeddingApp;
    if (!W) return;
    var $ = W.$;
    var $$ = W.$$;
    var showToast = W.showToast;
    var copyToClipboard = W.copyToClipboard;
    var prefersReducedMotion = W.prefersReducedMotion;
    const STORY_IMAGE_PRELOAD_ROOT_MARGIN = '1400px 0px';
    const STORY_IMAGE_INITIAL_PRELOAD_COUNT = 2;
    const STORY_BLOCK_DIRECTIONS = new Set(['up', 'down', 'left', 'right']);
    const STORY_FRAME_CLASSES = {
        none: 'frame-none',
        square: 'frame-square',
        circle: 'frame-circle',
        oval: 'frame-oval',
        ellipse: 'frame-ellipse',
        'rounded-rect': 'frame-rounded-rect',
    };
    const STORY_TEXT_STYLE_KEYS = new Set([
        'font_family',
        'font_size',
        'font_weight',
        'line_height',
        'letter_spacing',
        'text_transform',
        'text_align',
        'color',
        'opacity',
        'rotate',
    ]);
    function clampNumber(value, min, max, fallback) {
        const n = parseInt(String(value ?? ''), 10);
        if (!Number.isInteger(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }
    function safeStyleValue(value) {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const lowered = trimmed.toLowerCase();
        if (lowered.includes('url(') || lowered.includes('expression(')) return null;
        if (lowered.includes('position') || lowered.includes('z-index') || lowered.includes('filter') || lowered.includes('backdrop-filter')) return null;
        return trimmed;
    }
    function mapLegacyStoryToLayout() {
        if (!W.CFG.story) return null;
        const legacyPhotos = Array.isArray(W.CFG.story.photos) ? [...W.CFG.story.photos] : [];
        const lines = Array.isArray(W.CFG.story.lines) ? [...W.CFG.story.lines] : [];
        const groom = W.CFG.couple?.groom || 'Tiến';
        const bride = W.CFG.couple?.bride || 'Quyên';
        return {
            title: W.CFG.story.title || 'Chuyện Tình',
            grid: {
                columns: 10,
                row_unit_mode: 'square_from_column',
                gap: '0.08rem',
                min_height: '3.2rem',
                max_width: '4.6rem',
            },
            animation: {
                duration_ms: 420,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                stagger_ms: 80,
            },
            blocks: [
                {
                    id: 'legacy-photo-left',
                    col_span: 7,
                    row_span: 10,
                    col_start: 1,
                    row_start: 1,
                    item: {
                        type: 'image',
                        src: legacyPhotos[0]?.src || '',
                        alt: legacyPhotos[0]?.alt || 'Ảnh story trái',
                        frame: 'square',
                    },
                    effect: { fade_in: true, slide_from: 'left' },
                },
                {
                    id: 'legacy-photo-right',
                    col_span: 5,
                    row_span: 7,
                    col_start: 8,
                    row_start: 4,
                    item: {
                        type: 'image',
                        src: legacyPhotos[1]?.src || '',
                        alt: legacyPhotos[1]?.alt || 'Ảnh story phải',
                        frame: 'square',
                    },
                    effect: { fade_in: true, slide_from: 'right' },
                },
                {
                    id: 'legacy-couple',
                    col_span: 8,
                    row_span: 4,
                    col_start: 3,
                    row_start: 11,
                    item: {
                        type: 'text',
                        text: `${groom}
&
${bride}`,
                        font_family: 'var(--font-script)',
                        font_size: '0.28rem',
                        line_height: '1.15',
                        color: 'var(--maroon)',
                        text_align: 'center',
                    },
                    effect: { fade_in: true, slide_from: 'up' },
                },
                {
                    id: 'legacy-poem',
                    col_span: 10,
                    row_span: 8,
                    col_start: 2,
                    row_start: 15,
                    item: {
                        type: 'text',
                        text: lines.join('\n'),
                        font_family: 'var(--font-script)',
                        font_size: '0.18rem',
                        line_height: '1.55',
                        color: 'var(--text-dark)',
                        opacity: '0.92',
                        text_align: 'center',
                    },
                    effect: { fade_in: true, slide_from: 'up' },
                },
                {
                    id: 'legacy-photo-ellipse',
                    col_span: 10,
                    row_span: 12,
                    col_start: 2,
                    row_start: 23,
                    item: {
                        type: 'image',
                        src: legacyPhotos[2]?.src || '',
                        alt: legacyPhotos[2]?.alt || 'Ảnh story oval',
                        frame: 'ellipse',
                    },
                    effect: { fade_in: true, slide_from: 'up' },
                },
            ],
        };
    }
    function getNormalizedStoryLayout() {
        const layout = W.STORY_LAYOUT?.story_layout && typeof W.STORY_LAYOUT.story_layout === 'object'
            ? W.STORY_LAYOUT.story_layout
            : mapLegacyStoryToLayout();
        if (!layout || !Array.isArray(layout.blocks)) return null;
        const columns = clampNumber(layout.grid?.columns, 12, 12, 12);
        const normalizedBlocks = layout.blocks.map((block, index) => {
            const colStart = clampNumber(block?.col_start, 1, columns, 1);
            const rowStart = clampNumber(block?.row_start, 1, 500, 1);
            const colSpan = clampNumber(block?.col_span, 1, columns, 1);
            const rowSpan = clampNumber(block?.row_span, 1, 500, 1);
            const maxColSpan = Math.max(1, columns - colStart + 1);
            const clampedColSpan = Math.min(colSpan, maxColSpan);
            const item = block?.item && typeof block.item === 'object' ? { ...block.item } : { type: 'text', text: '' };
            const effect = block?.effect && typeof block.effect === 'object' ? { ...block.effect } : {};
            const slideFrom = STORY_BLOCK_DIRECTIONS.has(effect.slide_from) ? effect.slide_from : null;
            return {
                id: typeof block?.id === 'string' && block.id.trim() ? block.id.trim() : `story-block-${index + 1}`,
                col_start: colStart,
                row_start: rowStart,
                col_span: clampedColSpan,
                row_span: rowSpan,
                item,
                effect: {
                    fade_in: effect.fade_in !== false,
                    slide_from: slideFrom,
                    slide_distance: effect.slide_distance,
                },
            };
        });
        return {
            title: layout.title || W.CFG.story?.title || 'Chuyện Tình',
            grid: {
                columns,
                gap: safeStyleValue(layout.grid?.gap) || '0.08rem',
                min_height: safeStyleValue(layout.grid?.min_height) || '3.2rem',
                max_width: safeStyleValue(layout.grid?.max_width) || '4.6rem',
            },
            animation: {
                duration_ms: clampNumber(layout.animation?.duration_ms, 120, 1600, 420),
                easing: safeStyleValue(layout.animation?.easing) || 'cubic-bezier(0.22, 1, 0.36, 1)',
                stagger_ms: clampNumber(layout.animation?.stagger_ms, 0, 480, 80),
            },
            blocks: normalizedBlocks,
        };
    }
    function createStoryTextNode(textItem) {
        const textEl = document.createElement('div');
        textEl.className = 'story-item-text';
        const stylePatch = {};
        STORY_TEXT_STYLE_KEYS.forEach((key) => {
            const rawValue = textItem[key];
            const safeValue = safeStyleValue(rawValue);
            if (!safeValue) return;
            stylePatch[key] = safeValue;
        });
        if (stylePatch.font_family) textEl.style.fontFamily = stylePatch.font_family;
        if (stylePatch.font_size) textEl.style.fontSize = stylePatch.font_size;
        if (stylePatch.font_weight) textEl.style.fontWeight = stylePatch.font_weight;
        if (stylePatch.line_height) textEl.style.lineHeight = stylePatch.line_height;
        if (stylePatch.letter_spacing) textEl.style.letterSpacing = stylePatch.letter_spacing;
        if (stylePatch.text_transform) textEl.style.textTransform = stylePatch.text_transform;
        if (stylePatch.text_align) textEl.style.textAlign = stylePatch.text_align;
        if (stylePatch.color) textEl.style.color = stylePatch.color;
        if (stylePatch.opacity) textEl.style.opacity = stylePatch.opacity;
        if (stylePatch.rotate) {
            const rotateVal = stylePatch.rotate;
            if (/^-?\d+(\.\d+)?(deg|rad|turn|grad)$/.test(rotateVal)) {
                textEl.style.transform = `rotate(${rotateVal})`;
            }
        }
        const lines = String(textItem.text || '').split('\n');
        lines.forEach((line) => {
            if (line.trim() === '—') {
                const divider = document.createElement('div');
                divider.className = 'story-poem-divider';
                textEl.appendChild(divider);
                return;
            }
            const p = document.createElement('p');
            p.textContent = line;
            if (stylePatch.text_align) p.style.textAlign = stylePatch.text_align;
            textEl.appendChild(p);
        });
        return textEl;
    }
    function applyStoryGridMetrics(storyGrid, storyConfig) {
        const columns = storyConfig.grid.columns;
        const width = storyGrid.clientWidth;
        if (!width || columns <= 0) return 0.1;
        storyGrid.style.setProperty('--story-columns', String(columns));
        storyGrid.style.setProperty('--story-grid-gap', storyConfig.grid.gap);
        storyGrid.style.setProperty('--story-min-height', storyConfig.grid.min_height);
        storyGrid.style.setProperty('--story-max-width', storyConfig.grid.max_width);
        storyGrid.style.setProperty('--story-duration', `${storyConfig.animation.duration_ms}ms`);
        storyGrid.style.setProperty('--story-easing', storyConfig.animation.easing);
        storyGrid.style.setProperty('--story-stagger', `${storyConfig.animation.stagger_ms}ms`);
        const rootFontSizePx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        const gridStyle = getComputedStyle(storyGrid);
        const columnGapPx = parseFloat(gridStyle.columnGap || gridStyle.gap) || 0;
        const totalGapPx = Math.max(0, columns - 1) * columnGapPx;
        const usableWidthPx = Math.max(0, width - totalGapPx);
        const cellSizePx = usableWidthPx / columns;
        const cellSizeRem = cellSizePx / rootFontSizePx;
        storyGrid.style.setProperty('--story-cell-size', `${cellSizeRem.toFixed(4)}rem`);
        return cellSizeRem;
    }
    function setupStoryReveal(storyBlocks) {
        if (!storyBlocks.length) return;
        if (prefersReducedMotion()) {
            storyBlocks.forEach((block) => block.classList.add('is-visible'));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.16, rootMargin: '0px 0px -24px 0px' });
        storyBlocks.forEach((block) => observer.observe(block));
    }
    function parseSlideDistance(value, cellSizeRem, defaultValueRem) {
        if (value == null) return `${defaultValueRem}rem`;
        const strValue = String(value).trim();
        if (/^-?\d+(\.\d+)?$/.test(strValue)) {
            const cellCount = parseFloat(strValue);
            return `${(cellCount * cellSizeRem).toFixed(4)}rem`;
        }
        return strValue;
    }
    function activateStoryImage(img, priority) {
        if (!(img instanceof HTMLImageElement)) return;
        const src = img.dataset.src;
        if (!src || img.dataset.storyImageLoaded === 'true') return;
        img.decoding = 'async';
        img.loading = 'eager';
        img.fetchPriority = priority || 'low';
        img.src = src;
        img.dataset.storyImageLoaded = 'true';
    }
    function setupStoryImagePreload(storyGrid) {
        if (!storyGrid) return;
        const storyImages = Array.from(storyGrid.querySelectorAll('img[data-story-image="true"]'));
        if (!storyImages.length) return;
        storyImages.slice(0, STORY_IMAGE_INITIAL_PRELOAD_COUNT).forEach((img, index) => {
            activateStoryImage(img, index === 0 ? 'auto' : 'low');
        });
        const remainingImages = storyImages.filter((img) => img.dataset.storyImageLoaded !== 'true');
        if (!remainingImages.length) return;
        if (typeof IntersectionObserver !== 'function') {
            remainingImages.forEach((img) => activateStoryImage(img, 'low'));
            return;
        }
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                activateStoryImage(entry.target, 'low');
                imageObserver.unobserve(entry.target);
            });
        }, {
            rootMargin: STORY_IMAGE_PRELOAD_ROOT_MARGIN,
            threshold: 0.01,
        });
        remainingImages.forEach((img) => imageObserver.observe(img));
    }
    function initStoryLayout() {
        const storySec = $('#story');
        const storyGrid = $('#story-grid');
        if (!storySec || !storyGrid) return;
        const storyConfig = getNormalizedStoryLayout();
        if (!storyConfig) return;
        const titleEl = $('#story-title');
        if (titleEl) titleEl.textContent = storyConfig.title;
        storyGrid.innerHTML = '';
        const cellSizeRem = applyStoryGridMetrics(storyGrid, storyConfig);
        const defaultDistanceRem = 0.22;
        const renderedBlocks = storyConfig.blocks.map((block, index) => {
            const blockEl = document.createElement('article');
            blockEl.className = 'story-block';
            blockEl.style.gridColumn = `${block.col_start} / span ${block.col_span}`;
            blockEl.style.gridRow = `${block.row_start} / span ${block.row_span}`;
            blockEl.style.zIndex = String(10 + index);
            if (block.effect.slide_from) {
                blockEl.classList.add(`slide-${block.effect.slide_from}`);
                const slideDistance = block.effect.slide_distance;
                const parsedDistance = parseSlideDistance(slideDistance, cellSizeRem, defaultDistanceRem);
                if (block.effect.slide_from === 'left' || block.effect.slide_from === 'right') {
                    blockEl.style.setProperty('--story-slide-x', parsedDistance);
                } else {
                    blockEl.style.setProperty('--story-slide-y', parsedDistance);
                }
            }
            const viewport = document.createElement('div');
            viewport.className = 'story-block-viewport';
            const item = block.item || {};
            if (item.type === 'image' && typeof item.src === 'string' && item.src.trim()) {
                const img = document.createElement('img');
                img.className = 'story-item-image';
                img.dataset.src = item.src;
                img.dataset.storyImage = 'true';
                img.alt = typeof item.alt === 'string' ? item.alt : '';
                viewport.appendChild(img);
            } else {
                viewport.appendChild(createStoryTextNode(item));
            }
            const frameClass = STORY_FRAME_CLASSES[item.frame];
            if (frameClass) {
                viewport.classList.add(frameClass);
            }
            if (item.border_radius && typeof item.border_radius === 'string') {
                const safeBR = safeStyleValue(item.border_radius);
                if (safeBR) {
                    viewport.style.borderRadius = safeBR;
                }
            }
            if (block.effect.fade_in === false) {
                blockEl.classList.add('is-visible');
            }
            blockEl.appendChild(viewport);
            storyGrid.appendChild(blockEl);
            return blockEl;
        });
        const revealBlocks = renderedBlocks.filter((blockEl, index) => storyConfig.blocks[index]?.effect?.fade_in !== false);
        setupStoryReveal(revealBlocks);
        setupStoryImagePreload(storyGrid);
        let resizeTicking = false;
        const updateGrid = () => {
            if (resizeTicking) return;
            resizeTicking = true;
            requestAnimationFrame(() => {
                applyStoryGridMetrics(storyGrid, storyConfig);
                resizeTicking = false;
            });
        };
        if (typeof ResizeObserver === 'function') {
            const resizeObserver = new ResizeObserver(() => updateGrid());
            resizeObserver.observe(storyGrid);
        } else {
            window.addEventListener('resize', updateGrid, { passive: true });
        }
    }
    function initGiftPopup() {
        const overlay = $('#gift-popup-overlay');
        const openBtn = $('#btn-open-gift-popup');
        const closeBtn = $('#btn-close-gift-popup');
        if (!overlay) return;
        const qrLightbox = $('#gift-qr-lightbox');
        const qrLightboxImg = $('#gift-qr-lightbox-img');
        const qrLightboxClose = $('#gift-qr-lightbox-close');
        function openPopup() {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closePopup() {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
        function openQRLightbox(src, alt) {
            if (!qrLightbox || !qrLightboxImg) return;
            qrLightboxImg.src = src;
            qrLightboxImg.alt = alt || 'QR toàn màn hình';
            qrLightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeQRLightbox() {
            if (!qrLightbox) return;
            qrLightbox.classList.remove('open');
            if (!overlay.classList.contains('open')) {
                document.body.style.overflow = '';
            }
        }
        window.openGiftPopup = openPopup;
        if (openBtn) openBtn.addEventListener('click', openPopup);
        if (closeBtn) closeBtn.addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePopup();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (qrLightbox && qrLightbox.classList.contains('open')) {
                    closeQRLightbox();
                } else if (overlay.classList.contains('open')) {
                    closePopup();
                }
            }
        });
        function bindTapAndClick(element, handler) {
            let touchHandled = false;
            element.addEventListener('touchend', (event) => {
                touchHandled = true;
                event.preventDefault();
                handler(event);
                window.setTimeout(() => {
                    touchHandled = false;
                }, 350);
            }, { passive: false });
            element.addEventListener('click', (event) => {
                if (touchHandled) {
                    event.preventDefault();
                    return;
                }
                handler(event);
            });
        }
        overlay.querySelectorAll('.gift-popup-copy-btn').forEach((btn) => {
            bindTapAndClick(btn, () => {
                const targetId = btn.dataset.copyTarget;
                const el = targetId ? $(`#${targetId}`) : null;
                if (!el) return;
                const text = el.textContent.trim().replace(/\s+/g, '');
                copyToClipboard(text)
                    .then((success) => {
                        if (success) {
                            showToast('📋 Đã sao chép số tài khoản!');
                        } else {
                            showToast('📋 ' + text);
                        }
                    });
            });
        });
        overlay.querySelectorAll('.gift-popup-download-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                showToast('⬇️ Đang tải mã QR...');
            });
        });
        overlay.querySelectorAll('.gift-popup-qr-img').forEach((img) => {
            const handleClick = () => {
                openQRLightbox(img.src, img.alt);
            };
            img.addEventListener('click', handleClick);
            img.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            });
        });
        if (qrLightboxClose) {
            qrLightboxClose.addEventListener('click', closeQRLightbox);
        }
        if (qrLightbox) {
            qrLightbox.addEventListener('click', (e) => {
                if (e.target === qrLightbox) closeQRLightbox();
            });
        }
    }
    W.initStoryLayout = initStoryLayout;
    W.initGiftPopup = initGiftPopup;
    W.register('storyLayout', initStoryLayout, 90);
    W.register('giftPopup', initGiftPopup, 100);
})();
