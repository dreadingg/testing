// =============================================
// ===== AD BLOCKER =====
// =============================================
(function() {
    'use strict';

    const adKeywords = [
        'ad', 'advertisement', 'sponsored', 'promotion', 'promo',
        'banner', 'popup', 'pop-up', 'advert', 'advertising',
        'google ads', 'adsense', 'doubleclick', 'amazon-ads',
        'taboola', 'outbrain', 'criteo', 'adnxs', 'adzerk',
        'analytics', 'tracking', 'pixel', 'affiliate',
        'buy now', 'free money', 'click here', 'limited offer',
        'sponsored content', 'promoted', 'recommended for you'
    ];

    let adBlockedCount = 0;

    function blockAds() {
        adBlockedCount = 0;
        document.querySelectorAll('*').forEach(function(el) {
            let isAd = false;
            let reason = '';

            // Check class names
            if (el.className && typeof el.className === 'string') {
                const classLower = el.className.toLowerCase();
                adKeywords.forEach(function(keyword) {
                    if (classLower.includes(keyword)) {
                        isAd = true;
                        reason = 'class contains "' + keyword + '"';
                    }
                });
            }

            // Check id
            if (el.id && typeof el.id === 'string') {
                const idLower = el.id.toLowerCase();
                adKeywords.forEach(function(keyword) {
                    if (idLower.includes(keyword)) {
                        isAd = true;
                        reason = 'id contains "' + keyword + '"';
                    }
                });
            }

            // Check inner text (short elements only)
            if (el.innerText && el.innerText.length < 100) {
                const textLower = el.innerText.toLowerCase();
                adKeywords.forEach(function(keyword) {
                    if (textLower.includes(keyword) && el.innerText.length < 80) {
                        isAd = true;
                        reason = 'text contains "' + keyword + '"';
                    }
                });
            }

            // Check image src for ad domains
            if (el.tagName === 'IMG' && el.src) {
                const srcLower = el.src.toLowerCase();
                const adDomains = ['doubleclick', 'googleads', 'adserver', 'adnxs', 'amazon-ads'];
                adDomains.forEach(function(domain) {
                    if (srcLower.includes(domain)) {
                        isAd = true;
                        reason = 'src contains "' + domain + '"';
                    }
                });
            }

            // Check for ad label elements
            if (el.innerText && el.innerText.toLowerCase().includes('ad') && el.innerText.length < 30) {
                if (el.innerText.trim() === 'ad' || el.innerText.trim() === 'advertisement' || 
                    el.innerText.trim() === 'sponsored' || el.innerText.trim() === 'promotion') {
                    if (el.parentElement) {
                        isAd = true;
                        reason = 'ad label detected';
                    }
                }
            }

            if (isAd && el.parentElement && !el.dataset.adBlocked) {
                el.dataset.adBlocked = 'true';
                el.style.display = 'none';
                adBlockedCount++;
                console.log('🛡️ Ad blocked:', reason);
            }
        });

        console.log('🛡️ Blocked ' + adBlockedCount + ' ad(s)');
        return adBlockedCount;
    }

    function resetAds() {
        document.querySelectorAll('[data-adBlocked]').forEach(function(el) {
            el.dataset.adBlocked = '';
            el.style.display = '';
        });
        adBlockedCount = 0;
        console.log('🔄 Ads reset');
    }

    // Run after page loads
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(blockAds, 800);
    });

    // Also run when new content is added
    const adObserver = new MutationObserver(function() {
        blockAds();
    });
    adObserver.observe(document.body, { childList: true, subtree: true });

    // Expose for manual use
    window.blockAds = blockAds;
    window.resetAds = resetAds;

    console.log('🛡️ Ad blocker active');
})();

// =============================================
// ===== EXTERNAL TAB BLOCKER =====
// =============================================
(function() {
    'use strict';

    // 1. BLOCK window.open() - stops popups/tabs
    const originalOpen = window.open;
    window.open = function(url, name, specs) {
        console.warn('🛡️ Blocked: window.open() to', url);
        const iframe = document.getElementById('mirror-iframe');
        if (iframe && url) {
            iframe.src = url;
        } else if (url) {
            window.location.href = url;
        }
        return null;
    };

    // 2. FORCE all links to open in the same page
    function fixLinks() {
        document.querySelectorAll('a').forEach(function(link) {
            // Remove target="_blank" and other external attributes
            if (link.target === '_blank' || link.target === '_new') {
                link.target = '_self';
                link.removeAttribute('rel');
            }
            
            // Add click interceptor
            link.addEventListener('click', function(e) {
                const iframe = document.getElementById('mirror-iframe');
                if (iframe && this.href) {
                    e.preventDefault();
                    iframe.src = this.href;
                }
            });
        });
    }

    // 3. BLOCK middle-click (opens new tab)
    document.addEventListener('auxclick', function(e) {
        if (e.button === 1) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                e.stopPropagation();
                const iframe = document.getElementById('mirror-iframe');
                if (iframe) {
                    iframe.src = link.href;
                } else {
                    window.location.href = link.href;
                }
                return false;
            }
        }
    }, true);

    // 4. BLOCK Ctrl+Click (opens new tab)
    document.addEventListener('click', function(e) {
        if (e.ctrlKey || e.metaKey) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                e.stopPropagation();
                const iframe = document.getElementById('mirror-iframe');
                if (iframe) {
                    iframe.src = link.href;
                } else {
                    window.location.href = link.href;
                }
                return false;
            }
        }
    }, true);

    // 5. BLOCK Shift+Click (opens new window)
    document.addEventListener('click', function(e) {
        if (e.shiftKey) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                e.stopPropagation();
                const iframe = document.getElementById('mirror-iframe');
                if (iframe) {
                    iframe.src = link.href;
                } else {
                    window.location.href = link.href;
                }
                return false;
            }
        }
    }, true);

    // 6. WATCH for new links added dynamically
    const observer = new MutationObserver(function() {
        fixLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 7. OVERRIDE any attempt to set target="_blank"
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (name === 'target' && (value === '_blank' || value === '_new')) {
            console.warn('🛡️ Blocked: setting target="' + value + '"');
            return originalSetAttribute.call(this, 'target', '_self');
        }
        return originalSetAttribute.call(this, name, value);
    };

    // 8. OVERRIDE target property directly
    Object.defineProperty(HTMLAnchorElement.prototype, 'target', {
        get: function() {
            return this.getAttribute('target') || '';
        },
        set: function(value) {
            if (value === '_blank' || value === '_new') {
                console.warn('🛡️ Blocked: setting target="' + value + '"');
                this.setAttribute('target', '_self');
            } else {
                this.setAttribute('target', value);
            }
        }
    });

    // 9. RUN on page load
    document.addEventListener('DOMContentLoaded', fixLinks);

    console.log('🛡️ Mirror: External tab blocker active');
})();
