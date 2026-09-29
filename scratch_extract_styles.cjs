const fs = require('fs');
const css = fs.readFileSync('demo-style.css', 'utf8');

function extractRules(pattern) {
  const re = new RegExp(`([^{}]*${pattern}[^{}]*)\\{([^}]+)\\}`, 'gi');
  let match;
  const results = [];
  while ((match = re.exec(css)) !== null) {
    results.push(`${match[1].trim()} {\n  ${match[2].trim().split(';').map(s=>s.trim()).filter(Boolean).join(';\n  ')};\n}`);
  }
  return results;
}

console.log('=== BRAND & RAIL ===');
console.log(extractRules('(?:brand|rail|nav-i)').slice(0, 25).join('\n\n'));

console.log('\n=== TOPBAR & HEADER ===');
console.log(extractRules('(?:topbar|header|crumb)').slice(0, 15).join('\n\n'));

console.log('\n=== KPI & CARD ===');
console.log(extractRules('(?:kpi|card)').slice(0, 20).join('\n\n'));

console.log('\n=== TABLE & BADGE ===');
console.log(extractRules('(?:table|badge|tag|pill)').slice(0, 20).join('\n\n'));
