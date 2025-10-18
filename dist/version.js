// Auto version update for cache busting
const VERSION = Date.now().toString();
console.log('App version:', VERSION);

// Update CSS version
const cssLink = document.querySelector('link[href*="style.css"]');
if (cssLink) {
    cssLink.href = cssLink.href.split('?')[0] + '?v=' + VERSION;
}

// Update JS versions
const jsScripts = document.querySelectorAll('script[src*="script.js"], script[src*="random-fix.js"]');
jsScripts.forEach(script => {
    script.src = script.src.split('?')[0] + '?v=' + VERSION;
});
