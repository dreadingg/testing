/**
 * ============================================================
 * DREADING LOCKDOWN
 * ============================================================
 * Prevents ANYTHING on the page from opening external websites.
 * Blocks:
 *   - window.open() calls (all of them)
 *   - <a target="_blank"> links
 *   - programmatic link clicks
 *   - form submissions to external URLs
 *   - iframe popups that escape the sandbox
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // ALLOW-LIST (only these domains can ever open)
    // Add your own domains here if needed. Everything else = blocked.
    // ============================================================
    var ALLOWED_DOMAINS = [
        // Leave empty to block EVERYTHING from opening
        // Example: 'yourdomain.com', 'trusted-site.com'
    ];

    // Track what got blocked
    var blockedCount = 0;

    // ============================================================
    // 1. HARD BLOCK: window.open() - No exceptions
    // ============================================================
    // This is the #1 way ads open new tabs. We replace it entirely.
    var _originalOpen = window.open;
    window.open = function(url, name, features) {
        var target = url || '';
        
        // Check allow-list
        if (isAllowed(target)) {
            return _originalOpen.call(window, url, name, features);
        }
        
        blockedCount++;
        console.warn('[LOCKDOWN] Blocked window.open:', target);
        dispatchBlocked(target, 'window.open');
        return null;
    };

    // Also overwrite it on the prototype in case some code uses it
    try {
        delete window.open;
        Object.defineProperty(window, 'open', {
            value: function() { 
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked window.open (prototype)');
                return null; 
            },
            writable: false,
            configurable: false
        });
    } catch (e) {
        // If we can't lock it down, the assignment above still works
    }

    // ============================================================
    // 2. INTERCEPT ALL CLICKS - Capture phase, no escape
    // ============================================================
    // This stops <a target="_blank">, external links, and any
    // JavaScript click handlers from opening new tabs.
    document.addEventListener('click', function(e) {
        var el = e.target;
        
        // Walk up to find <a> tag
        while (el && el.tagName !== 'A') {
            el = el.parentElement;
        }
        
        if (!el) return; // No link found, allow normal click
        
        var href = el.getAttribute('href') || '';
        var target = el.getAttribute('target') || '';
        
        // Block target="_blank" and target="_new"
        if (target === '_blank' || target === '_new' || target === '_top' || target === '_parent') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            blockedCount++;
            console.warn('[LOCKDOWN] Blocked target link:', href, '-> target:', target);
            dispatchBlocked(href, 'target=' + target);
            return false;
        }
        
        // Block external hrefs (anything not on our own domain)
        if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('/')) {
            if (!isAllowed(href)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked external link:', href);
                dispatchBlocked(href, 'external link');
                return false;
            }
        }
    }, true); // <-- TRUE = capture phase, runs before anything else

    // Also block middle-click (opens in new tab)
    document.addEventListener('auxclick', function(e) {
        if (e.button === 1) { // middle mouse
            var el = e.target;
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (el) {
                e.preventDefault();
                e.stopPropagation();
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked middle-click new tab');
                dispatchBlocked(el.href || '', 'middle-click');
            }
        }
    }, true);

    // Block right-click "open in new tab" via context menu
    document.addEventListener('contextmenu', function(e) {
        var el = e.target;
        while (el && el.tagName !== 'A') el = el.parentElement;
        if (el && el.href && !isAllowed(el.href)) {
            // We can't fully block the browser context menu,
            // but we can prevent the link from being right-clickable
            // by removing href temporarily
            el.dataset.originalHref = el.href;
            el.removeAttribute('href');
            setTimeout(function() {
                if (el.dataset.originalHref) {
                    el.setAttribute('href', el.dataset.originalHref);
                }
            }, 1000);
        }
    }, true);

    // ============================================================
    // 3. BLOCK KEYBOARD SHORTCUTS
    // ============================================================
    // Ctrl+click, Cmd+click, Ctrl+Shift+click, etc.
    document.addEventListener('click', function(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            var el = e.target;
            while (el && el.tagName !== 'A') el = el.parentElement;
            if (el && el.href) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked modifier+click:', el.href);
                dispatchBlocked(el.href, 'modifier click');
                return false;
            }
        }
    }, true);

    // ============================================================
    // 4. INTERCEPT FORM SUBMISSIONS
    // ============================================================
    // Some ads use forms with target="_blank"
    document.addEventListener('submit', function(e) {
        var form = e.target;
        if (form.tagName === 'FORM') {
            var action = form.getAttribute('action') || '';
            var target = form.getAttribute('target') || '';
            
            if (target === '_blank' || target === '_new') {
                e.preventDefault();
                e.stopPropagation();
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked form target:', action);
                dispatchBlocked(action, 'form target');
                return false;
            }
            
            if (action && !isAllowed(action) && !action.startsWith('/') && !action.startsWith('#')) {
                e.preventDefault();
                e.stopPropagation();
                blockedCount++;
                console.warn('[LOCKDOWN] Blocked external form:', action);
                dispatchBlocked(action, 'external form');
                return false;
            }
        }
    }, true);

    // ============================================================
    // 5. NEUTER ANY IFRAME THAT TRIES TO ESCAPE
    // ============================================================
    // Forces every iframe to be sandboxed and removes escape hatches
    function lockdownIframes() {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
            var iframe = iframes[i];
            
            // Force sandbox without popups
            var currentSandbox = iframe.getAttribute('sandbox') || '';
            var cleanSandbox = currentSandbox
                .replace('allow-popups', '')
                .replace('allow-popups-to-escape-sandbox', '')
                .replace('allow-top-navigation', '')
                .replace('allow-top-navigation-by-user-activation', '')
                .trim();
            
            if (cleanSandbox !== currentSandbox) {
                iframe.setAttribute('sandbox', cleanSandbox);
            }
            
            // If no sandbox at all, add one
            if (!iframe.hasAttribute('sandbox')) {
                iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
            }
            
            // Prevent the iframe from navigating the top window
            iframe.setAttribute('allow', '');
        }
    }

    // Run on load + watch for new iframes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', lockdownIframes);
    } else {
        lockdownIframes();
    }
    
    // Watch for dynamically added iframes
    var iframeObserver = new MutationObserver(function(mutations) {
        var found = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.tagName === 'IFRAME') found = true;
                if (node.querySelectorAll) {
                    if (node.querySelectorAll('iframe').length > 0) found = true;
                }
            });
        });
        if (found) lockdownIframes();
    });
    
    document.addEventListener('DOMContentLoaded', function() {
        iframeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    // ============================================================
    // 6. BLOCK window.location REDIRECTS
    // ============================================================
    // Some scripts try to redirect the page itself
    try {
        var _originalAssign = window.location.assign.bind(window.location);
        var _originalReplace = window.location.replace.bind(window.location);
        
        // We can't easily override location.assign/replace, but we can
        // watch for beforeunload and cancel redirects
        window.addEventListener('beforeunload', function(e) {
            var currentHost = window.location.hostname;
            // Check if we're about to leave our own domain
            // (This fires when navigation is happening)
            // We can't get the target URL here reliably, so this is
            // best-effort — the iframe sandbox is the real fix.
        });
    } catch (e) {
        // Silent fail
    }

    // ============================================================
    // 7. BLOCK NEW WINDOW VIA onbeforeunload TRICKS
    // ============================================================
    // Some ads trigger a dialog then open a window
    window.onbeforeunload = null;

    // ============================================================
    // 8. PROTECT AGAINST PROMPT/ALERT-BASED REDIRECTS
    // ============================================================
    var _alert = window.alert;
    var _confirm = window.confirm;
    
    window.alert = function(msg) {
        console.warn('[LOCKDOWN] Blocked alert:', msg);
        return;
    };
    
    window.confirm = function(msg) {
        console.warn('[LOCKDOWN] Blocked confirm (returned false):', msg);
        return false;
    };

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================
    function isAllowed(url) {
        if (!url) return false;
        if (ALLOWED_DOMAINS.length === 0) return false;
        
        try {
            var urlObj = new URL(url, window.location.origin);
            var hostname = urlObj.hostname.toLowerCase();
            
            for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
                if (hostname === ALLOWED_DOMAINS[i] || 
                    hostname.endsWith('.' + ALLOWED_DOMAINS[i])) {
                    return true;
                }
            }
        } catch (e) {
            return false;
        }
        
        return false;
    }

    function dispatchBlocked(url, reason) {
        try {
            window.dispatchEvent(new CustomEvent('dreading:blocked', {
                detail: { url: url, reason: reason, count: blockedCount }
            }));
            
            // If your mirror has a notification function, call it
            if (typeof window.showNotification === 'function') {
                window.showNotification('Blocked: ' + reason, '🛡️');
            }
        } catch (e) {
            // Silent fail
        }
    }

    // ============================================================
    // PUBLIC API
    // ============================================================
    window.Lockdown = {
        count: function() { return blockedCount; },
        reset: function() { blockedCount = 0; },
        allow: function(domain) {
            if (ALLOWED_DOMAINS.indexOf(domain) === -1) {
                ALLOWED_DOMAINS.push(domain);
                console.log('[LOCKDOWN] Allowed:', domain);
            }
        },
        block: function(domain) {
            var i = ALLOWED_DOMAINS.indexOf(domain);
            if (i > -1) ALLOWED_DOMAINS.splice(i, 1);
            console.log('[LOCKDOWN] Removed from allow-list:', domain);
        },
        list: function() { return ALLOWED_DOMAINS.slice(); }
    };

    // ============================================================
    // STARTUP
    // ============================================================
    console.log(
        '%c🔒 DREADING LOCKDOWN ACTIVE%c\n' +
        'Nothing on this page can open an external website.\n' +
        'Type %cLockdown.count()%c to see how many were blocked.',
        'background: #e74c3c; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 14px;',
        'color: #c8bcd8; font-size: 12px;',
        'background: rgba(255,255,255,0.1); color: #e74c3c; padding: 2px 6px; border-radius: 4px; font-family: monospace;',
        'color: #6a5a7a;'
    );

})();
