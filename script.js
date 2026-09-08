// =============================================
// ===== SETTINGS MANAGER (localStorage) =====
// =============================================

function saveSettings() {
    try {
        let currentTheme = 'dark';
        document.querySelectorAll('.theme-option').forEach(el => {
            if (el.classList.contains('active')) {
                currentTheme = el.dataset.theme;
            }
        });
        
        let currentBg = 'pipes';
        document.querySelectorAll('.bg-option').forEach(el => {
            if (el.classList.contains('active')) {
                currentBg = el.dataset.bg;
            }
        });
        
        let currentCursor = 'default';
        document.querySelectorAll('.cursor-option').forEach(el => {
            if (el.classList.contains('active')) {
                currentCursor = el.dataset.cursor;
            }
        });
        
        localStorage.setItem('mirror_theme', currentTheme);
        localStorage.setItem('mirror_background', currentBg);
        localStorage.setItem('mirror_cursor', currentCursor);
        
        console.log('✅ Settings saved');
    } catch (e) {
        console.warn('Could not save settings:', e);
    }
}

function loadSettings() {
    try {
        const savedTheme = localStorage.getItem('mirror_theme');
        if (savedTheme) {
            document.querySelectorAll('.theme-option').forEach(el => {
                el.classList.remove('active');
                if (el.dataset.theme === savedTheme) {
                    el.classList.add('active');
                }
            });
            document.body.className = 'theme-' + savedTheme;
        }
        
        const savedBg = localStorage.getItem('mirror_background');
        if (savedBg) {
            document.querySelectorAll('.bg-option').forEach(el => {
                el.classList.remove('active');
                if (el.dataset.bg === savedBg) {
                    el.classList.add('active');
                }
            });
            if (typeof setBackground === 'function') {
                setBackground(savedBg);
            }
        }
        
        const savedCursor = localStorage.getItem('mirror_cursor');
        if (savedCursor) {
            document.querySelectorAll('.cursor-option').forEach(el => {
                el.classList.remove('active');
                if (el.dataset.cursor === savedCursor) {
                    el.classList.add('active');
                }
            });
            const cursorEl = document.querySelector(`.cursor-option[data-cursor="${savedCursor}"]`);
            if (cursorEl && typeof setCursor === 'function') {
                setCursor(savedCursor, cursorEl);
            }
        }
        
        console.log('✅ Settings loaded');
    } catch (e) {
        console.warn('Could not load settings:', e);
    }
}

function saveAndApplyTheme(theme, el) {
    if (typeof setTheme === 'function') {
        setTheme(theme, el);
    }
    saveSettings();
}

function saveAndApplyBg(bg, el) {
    if (typeof setBackground === 'function') {
        setBackground(bg, el);
    }
    saveSettings();
}

function saveAndApplyCursor(cursor, el) {
    if (typeof setCursor === 'function') {
        setCursor(cursor, el);
    }
    saveSettings();
}

// =============================================
// ===== EXTERNAL TAB BLOCKER =====
// =============================================
(function() {
    'use strict';

    window.open = function(url) {
        const iframe = document.getElementById('mirror-iframe');
        if (iframe && url) iframe.src = url;
        else if (url) window.location.href = url;
        return null;
    };

    function fixLinks() {
        document.querySelectorAll('a').forEach(function(link) {
            if (link.target === '_blank' || link.target === '_new') {
                link.target = '_self';
                link.removeAttribute('rel');
            }
            link.addEventListener('click', function(e) {
                const iframe = document.getElementById('mirror-iframe');
                if (iframe && this.href) {
                    e.preventDefault();
                    iframe.src = this.href;
                }
            });
        });
    }

    document.addEventListener('auxclick', function(e) {
        if (e.button === 1) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                e.stopPropagation();
                const iframe = document.getElementById('mirror-iframe');
                if (iframe) iframe.src = link.href;
                else window.location.href = link.href;
                return false;
            }
        }
    }, true);

    document.addEventListener('click', function(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            const link = e.target.closest('a');
            if (link && link.href) {
                e.preventDefault();
                e.stopPropagation();
                const iframe = document.getElementById('mirror-iframe');
                if (iframe) iframe.src = link.href;
                else window.location.href = link.href;
                return false;
            }
        }
    }, true);

    const observer = new MutationObserver(function() {
        fixLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (name === 'target' && (value === '_blank' || value === '_new')) {
            return originalSetAttribute.call(this, 'target', '_self');
        }
        return originalSetAttribute.call(this, name, value);
    };

    Object.defineProperty(HTMLAnchorElement.prototype, 'target', {
        get: function() { return this.getAttribute('target') || ''; },
        set: function(value) {
            this.setAttribute('target', (value === '_blank' || value === '_new') ? '_self' : value);
        }
    });

    document.addEventListener('DOMContentLoaded', fixLinks);
    console.log('🛡️ Tab blocker active');
})();

// =============================================
// ===== LOAD SETTINGS ON START =====
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadSettings, 100);
});

window.addEventListener('beforeunload', saveSettings);

window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.saveAndApplyTheme = saveAndApplyTheme;
window.saveAndApplyBg = saveAndApplyBg;
window.saveAndApplyCursor = saveAndApplyCursor;

console.log('📦 Settings Manager loaded');
