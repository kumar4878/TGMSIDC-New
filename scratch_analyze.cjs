const fs = require('fs');

const css = fs.readFileSync('demo-style.css', 'utf8');

// Find root variables
const rootMatches = css.match(/:root\s*\{([^}]+)\}/g);
if (rootMatches) {
  console.log('=== ROOT VARIABLES ===');
  rootMatches.forEach(m => console.log(m));
}

// Find font family
const fontMatches = css.match(/font-family:[^;]+/g);
if (fontMatches) {
  console.log('=== FONT FAMILIES ===');
  console.log([...new Set(fontMatches)].slice(0, 10).join('\n'));
}

// Search for sidebar, nav, menu classes in css
const classMatches = css.match(/\.([a-zA-Z0-9_-]*(?:sidebar|nav|menu|header|table|kpi|card|badge)[a-zA-Z0-9_-]*)\s*\{([^}]+)\}/gi);
if (classMatches) {
  console.log('=== MATCHED CLASSES (' + classMatches.length + ') ===');
  console.log(classMatches.slice(0, 20).join('\n'));
}

// Let's inspect demo-script.js for Deloitte, neoInt, navigation items, layouts
const js = fs.readFileSync('demo-script.js', 'utf8');
console.log('=== JS SEARCH FOR BRANDING ===');
const deloitteIdx = js.indexOf('Deloitte');
if (deloitteIdx !== -1) {
  console.log('Deloitte snippet:', js.substring(Math.max(0, deloitteIdx - 100), deloitteIdx + 200));
}

const neointIdx = js.indexOf('neoInt');
if (neointIdx !== -1) {
  console.log('neoInt snippet:', js.substring(Math.max(0, neointIdx - 100), neointIdx + 200));
}

const poweredIdx = js.indexOf('Powered by');
if (poweredIdx !== -1) {
  console.log('Powered by snippet:', js.substring(Math.max(0, poweredIdx - 100), poweredIdx + 200));
}
