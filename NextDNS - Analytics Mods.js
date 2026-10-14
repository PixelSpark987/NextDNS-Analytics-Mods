// ==UserScript==
// @name         NextDNS - Analytics Mods
// @description  Customises NextDNS analytics graph colours, positions the tooltip, and forces the default analytics timeframe to the last 6 hours
// @author       PixelSpark987 - https://is.gd/PS987
// @icon         https://my.nextdns.io/favicon.ico
// @version      3.1
// @downloadURL  https://raw.githubusercontent.com/PixelSpark987/NextDNS-Analytics-Mods/refs/heads/main/NextDNS%20-%20Analytics%20Mods.js
// @updateURL    https://raw.githubusercontent.com/PixelSpark987/NextDNS-Analytics-Mods/refs/heads/main/NextDNS%20-%20Analytics%20Mods.js
// @namespace    http://tampermonkey.net/
// @match        *://my.nextdns.io/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Inject global CSS rules to format the custom tooltip into a single flex row with hyphen separators
    if (!document.getElementById('nextdns-tooltip-custom-style')) {
        const style = document.createElement('style');
        style.id = 'nextdns-tooltip-custom-style';
        style.innerHTML = `
            .recharts-tooltip-wrapper > div {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                gap: 6px !important;
                white-space: nowrap !important;
            }
            .recharts-tooltip-wrapper > div > *:not(:last-child)::after {
                content: " - " !important;
                margin: 0 4px !important;
                color: #888 !important;
                font-weight: normal !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Function to apply custom graph colours
    function applyColours() {
        const queries = document.querySelectorAll('.area-queries path, .recharts-area-area');
        const blocked = document.querySelectorAll('.area-queries-blocked path');

        queries.forEach(path => {
            if (path.classList.info ? path.classList.contains('recharts-area-area') : path.classList.contains('recharts-area-area')) {
                path.style.setProperty('fill', '#646464', 'important');
            } else {
                path.style.setProperty('stroke', '#555555', 'important');
            }
        });

        blocked.forEach(path => {
            if (path.classList.contains('recharts-area-area')) {
                path.style.setProperty('fill', '#aa0055', 'important');
            } else {
                path.style.setProperty('stroke', '#550011', 'important');
            }
        });
    }

    let isProcessing = false;
    let lastUrl = location.href;

    const triggerClick = (el) => {
        ['touchstart', 'touchend', 'click'].forEach(type => {
            el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
        });
    };

    // Function to force select the 6-hour analytics timeframe
    const selectSixHours = () => {
        if (isProcessing || !window.location.pathname.includes('/analytics')) return;

        const toggleBtn = Array.from(document.querySelectorAll('.dropdown-toggle'))
            .find(btn => btn.textContent && btn.textContent.includes('Last '));

        if (!toggleBtn || toggleBtn.textContent.trim() === 'Last 6 hours') return;

        isProcessing = true;

        let targetOption = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item'))
            .find(opt => opt.textContent && opt.textContent.trim() === 'Last 6 hours');

        if (targetOption) {
            triggerClick(targetOption);
            setTimeout(() => { isProcessing = false; }, 300);
            return;
        }

        if (toggleBtn.getAttribute('aria-expanded') !== 'true') {
            triggerClick(toggleBtn);
        }

        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            targetOption = Array.from(document.querySelectorAll('.dropdown-menu .dropdown-item'))
                .find(opt => opt.textContent && opt.textContent.trim() === 'Last 6 hours');

            if (targetOption) {
                clearInterval(checkInterval);
                triggerClick(targetOption);
                setTimeout(() => { isProcessing = false; }, 300);
            } else if (attempts > 200) {
                clearInterval(checkInterval);
                isProcessing = false;
            }
        }, 0);
    };

    const checkUrlChange = () => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            isProcessing = false;
            if (window.location.pathname.includes('/analytics')) {
                selectSixHours();
            }
        }
    };

    const wrapHistoryMethod = (type) => {
        const orig = history[type];
        return function() {
            const rv = orig.apply(this, arguments);
            checkUrlChange();
            return rv;
        };
    };
    history.pushState = wrapHistoryMethod('pushState');
    history.replaceState = wrapHistoryMethod('replaceState');

    window.addEventListener('popstate', checkUrlChange);

    // Optimized event listener for tooltips instead of high-frequency style attribute mutation observations
    document.addEventListener('mousemove', () => {
        const tooltip = document.querySelector('.recharts-tooltip-wrapper');
        if (tooltip && tooltip.style.visibility === 'visible') {
            const transform = tooltip.style.transform;
            if (transform && !transform.includes(', 122px)')) {
                const match = transform.match(/translate\(([^p]+)px,\s*([^p]+)px\)/);
                if (match) {
                    const xCoord = match[1];
                    tooltip.style.setProperty('transform', `translate(${xCoord}px, 122px)`, 'important');
                    tooltip.style.setProperty('z-index', '99999', 'important');
                }
            }
        }
    }, { passive: true });

    // Lightweight MutationObserver restricted only to node additions, avoiding expensive attribute checks
    let pending = false;
    const lightObserver = new MutationObserver(() => {
        checkUrlChange();
        applyColours();

        if (pending || isProcessing || !window.location.pathname.includes('/analytics')) return;

        pending = true;
        requestAnimationFrame(() => {
            selectSixHours();
            pending = false;
        });
    });

    lightObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run
    applyColours();
    selectSixHours();
})();