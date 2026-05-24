
/**
 * Universal Toaster (v4.0 - The Library)
 */

(function (window) {
    'use strict';

    const UniversalToaster = {
        isInitialized: false,
        config: {},
        _tooltipElement: null,
        _activeElement: null,
        _hideTimeout: null,
        _observer: null,
        _loadedFonts: new Set(),
        _defaultConfig: {
            delay: 100,
            mobileBreakpoint: 768,
            backgroundColor: null,
            textColor: null,
            fontFamily: 'inherit',
            fontSize: '13px',
            borderRadius: '6px',
            padding: '8px 12px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        },
        _icons: {
            'info': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>',
            'warning': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.636-1.026 2.287-1.026 2.923 0l5.428 8.756c.63 1.017-.16 2.345-1.462 2.345H4.29c-1.302 0-2.092-1.328-1.462-2.345l5.428-8.756zM9 13a1 1 0 112 0 1 1 0 01-2 0zm1-3a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>',
        },

        init(userConfig = {}) {
            if (this.isInitialized) return;
            this.updateConfig(userConfig);
            this._createTooltipElement();
            this._attachListeners();
            this._scanNode(document.body);
            this.isInitialized = true;
        },

        destroy() {
            if (!this.isInitialized) return;
            this._removeListeners();
            this._observer.disconnect();
            if (this._tooltipElement) {
                this._tooltipElement.remove();
            }
            Object.assign(this, { isInitialized: false, _tooltipElement: null, _activeElement: null, _observer: null });
        },

        updateConfig(userConfig = {}) {
            this.config = { ...this._defaultConfig, ...this.config, ...userConfig };
        },

        _createTooltipElement() {
            const style = document.createElement('style');
            style.id = 'universal-toaster-styles';
            style.textContent = `
                .universal-toaster-popup {
                    position: fixed; left:0; top:0; z-index: 2147483647; pointer-events: none;
                    opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s;
                    border-radius: ${this.config.borderRadius}; font-size: ${this.config.fontSize};
                    font-family: ${this.config.fontFamily}; padding: ${this.config.padding};
                    box-shadow: ${this.config.boxShadow}; border: 1px solid rgba(255,255,255,0.1);
                    white-space: pre-wrap; max-width: 95vw; line-height: 1.5;
                }
                .universal-toaster-popup.visible { opacity: 1; visibility: visible; }
                .universal-toaster-popup.interactive { pointer-events: auto; }
                .universal-toaster-popup hr { border: none; border-top: 1px solid rgba(128,128,128,0.2); margin: 6px 0; }
                .universal-toaster-popup .ut-list { display: grid; grid-template-columns: auto 1fr; gap: 4px; padding-left: 5px; }
                .universal-toaster-popup .ut-icon { display: inline-block; width: 1.2em; height: 1.2em; margin-right: 0.3em; vertical-align: -0.2em; }
                .universal-toaster-popup .ut-img { display: block; max-width: 100%; border-radius: 4px; margin-top: 5px; }
                .universal-toaster-popup .ut-link { text-decoration: underline; cursor: pointer; }
            `;
            document.head.appendChild(style);

            this._tooltipElement = document.createElement('div');
            this._tooltipElement.className = 'universal-toaster-popup';
            document.body.appendChild(this._tooltipElement);
        },

        _attachListeners() {
            this._onMouseOver = this._onMouseOver.bind(this);
            this._onMouseMove = this._onMouseMove.bind(this);
            this._onMouseOut = this._onMouseOut.bind(this);
            this._onGlobalAction = this._onGlobalAction.bind(this);
            this._onTooltipClick = this._onTooltipClick.bind(this);

            document.addEventListener('mouseover', this._onMouseOver);
            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseout', this._onMouseOut);

            window.addEventListener('scroll', this._onGlobalAction, true);
            window.addEventListener('mousedown', this._onGlobalAction);
            window.addEventListener('blur', this._onGlobalAction);

            this._tooltipElement.addEventListener('click', this._onTooltipClick);

            this._observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        this._scanNode(node);
                    }
                }
            });
            this._observer.observe(document.body, { childList: true, subtree: true });
        },

        _removeListeners() {
            document.removeEventListener('mouseover', this._onMouseOver);
            document.removeEventListener('mousemove', this._onMouseMove);
            document.removeEventListener('mouseout', this._onMouseOut);
            window.removeEventListener('scroll', this._onGlobalAction, true);
            window.removeEventListener('mousedown', this._onGlobalAction);
            window.removeEventListener('blur', this._onGlobalAction);
            this._tooltipElement.removeEventListener('click', this._onTooltipClick);
        },

        _scanNode(node) {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.hasAttribute('title')) {
                this._swapTitle(node);
            }
            node.querySelectorAll('[title]').forEach(el => this._swapTitle(el));
            node.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.addEventListener('mouseover', this._onMouseOver);
                    el.shadowRoot.addEventListener('mousemove', this._onMouseMove);
                    el.shadowRoot.addEventListener('mouseout', this._onMouseOut);
                }
            });
        },

        _onMouseOver(e) {
            const target = e.composedPath()[0].closest('[data-toaster-title]');
            if (!target) return;

            this._activeElement = target;
            clearTimeout(this._hideTimeout);

            this._showTimeout = setTimeout(() => {
                if (this._activeElement !== target) return;
                const rawText = target.getAttribute('data-toaster-title');
                if (!rawText) return;

                const { html, isInteractive, customWidth, customPos } = this._parseSyntax(rawText);

                this._tooltipElement.innerHTML = html;
                this._tooltipElement.classList.toggle('interactive', isInteractive);
                this._tooltipElement.style.width = customWidth ? customWidth : 'auto';
                this._applyTheme();

                this._activeElement.dataset.customPos = customPos || '';

                this._tooltipElement.classList.add('visible');
            }, this.config.delay);
        },

        _onMouseMove(e) {
            if (!this._activeElement || !this._tooltipElement.classList.contains('visible')) return;

            const rect = this._tooltipElement.getBoundingClientRect();
            const winW = window.innerWidth, winH = window.innerHeight;
            const offset = 15, mobileEdgePadding = 10;
            let x, y;

            y = e.clientY + offset;
            if (y + rect.height > winH) y = e.clientY - rect.height - offset;

            if (winW <= this.config.mobileBreakpoint) {
                x = e.clientX - (rect.width / 2);
                if (x < mobileEdgePadding) x = mobileEdgePadding;
                if (x + rect.width > winW - mobileEdgePadding) x = winW - rect.width - mobileEdgePadding;
            } else {
                x = e.clientX + offset;
                if (x + rect.width > winW) x = e.clientX - rect.width - offset;
            }

            this._tooltipElement.style.transform = `translate(${x}px, ${y}px)`;
        },

        _onMouseOut(e) {
            const target = e.composedPath()[0].closest('[data-toaster-title]');
            if (target && target === this._activeElement) {
                clearTimeout(this._showTimeout); // Cancel if we mouse out before delay
                this._hideTimeout = setTimeout(() => this._hideTooltip(), 100);
            }
        },

        _onGlobalAction() {
            this._hideTooltip();
        },

        _onTooltipClick(e) {
            const link = e.target.closest('.ut-link[data-href]');
            if (link) {
                window.open(link.dataset.href, '_blank', 'noopener,noreferrer');
                this._hideTooltip();
            }
        },

        _hideTooltip() {
            if (this._activeElement) {
                this._tooltipElement.classList.remove('visible');
                this._activeElement = null;
            }
        },

        _swapTitle(el) {
            const title = el.getAttribute('title');
            if (title && title.trim()) {
                el.setAttribute('data-toaster-title', title);
                el.removeAttribute('title');
            }
        },

        _escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); },

        _loadGoogleFont(fontName) {
            if (!fontName || this._loadedFonts.has(fontName)) return;
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            this._loadedFonts.add(fontName);
        },

        _applyTheme() {
            if (this.config.backgroundColor) {
                this._tooltipElement.style.backgroundColor = this.config.backgroundColor;
                this._tooltipElement.style.color = this.config.textColor;
            } else {
                let s = window.getComputedStyle(document.body),
                    c = s.backgroundColor; if (c === 'rgba(0, 0, 0, 0)' || c === 'transparent') c = 'rgb(255, 255, 255)'; const r = c.match(/\d+/g); let i = true; if (r) {
                        const b = Math.round(((parseInt(r[0]) * 299) + (parseInt(r[1]) * 587) + (parseInt(r[2]) * 114)) / 1000); if (b < 125) i = false
                    } if (i) {
                        this._tooltipElement.style.backgroundColor = '#222'; this._tooltipElement.style.color = '#fff'
                    } else {
                    this._tooltipElement.style.backgroundColor = '#fff'; this._tooltipElement.style.color = '#000'
                }
            }
        },

        _parseSyntax(rawText) {
            let text = this._escapeHtml(rawText);
            let isInteractive = false, customWidth = null, customPos = null;

            text = text.replace(/&amp;(cl|bgcl|fw|fn|chr|li|lnk|img|icon|w|pos|hr);/g, "&$1;")
                .replace(/&amp;(cl|bgcl|fw|fn|chr|li|lnk|img|icon|w|pos)=/g, "&$1=");

            text = text.replace(/&w=(.*?);/, (m, w) => { customWidth = w; return ''; });
            text = text.replace(/&pos=(.*?);/, (m, p) => { customPos = p; return ''; });
            text = text.replace(/&hr;/g, '<hr>');
            text = text.replace(/&li=(.*?);(.*?)&li;/g, '<div class="ut-list"><span>$1</span><span>$2</span></div>');

            text = text.replace(/&chr=(\d+);(.*?)&chr;/g, (m, l, c) => (c.length > l ? c.substring(0, l) + '...' : c));
            text = text.replace(/&icon=(.*?);/g, (m, n) => this._icons[n] ? `<span class="ut-icon">${this._icons[n]}</span>` : '');
            text = text.replace(/&img=(https?:\/\/[^;]+);/g, '<img class="ut-img" src="$1" alt="Tooltip Image">');

            text = text.replace(/&lnk=(.*?);(.*?)&lnk;/g, (m, href, content) => { isInteractive = true; return `<span class="ut-link" data-href="${href}">${content}</span>`; });
            text = text.replace(/&fn=(.*?);(.*?)&fn;/g, (m, font, content) => { this._loadGoogleFont(font); return `<span style="font-family:'${font}', sans-serif">${content}</span>`; });
            [{ t: 'cl', c: 'color' }, { t: 'bgcl', c: 'background-color' }, { t: 'fw', c: 'font-weight' }].forEach(i => {
                text = text.replace(new RegExp(`&${i.t}=(.*?);(.*?)&${i.t};`, 'g'), `<span style="${i.c}:$1">$2</span>`);
            });

            return { html: text, isInteractive, customWidth, customPos };
        }
    };

    window.UniversalToaster = UniversalToaster;

})(window);

