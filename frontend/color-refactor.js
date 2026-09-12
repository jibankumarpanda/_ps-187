const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('./app'), ...walk('./components')];
let modifiedFiles = 0;

const replacements = [
  { regex: /bg-\[#141C24\]/g, replacement: 'bg-card' },
  { regex: /bg-\[#18222C\]/g, replacement: 'bg-muted' },
  { regex: /bg-\[#0A0F14\]/g, replacement: 'bg-background' },
  { regex: /bg-\[#1E2A35\]/g, replacement: 'bg-muted' },
  { regex: /hover:bg-\[#1E2A35\]/g, replacement: 'hover:bg-muted' },
  { regex: /hover:bg-\[#18222C\]/g, replacement: 'hover:bg-muted' },
  { regex: /text-\[#F3F6F8\]/g, replacement: 'text-foreground' },
  { regex: /text-\[#A7B2BD\]/g, replacement: 'text-muted-foreground' },
  { regex: /text-\[#6E7B87\]/g, replacement: 'text-muted-foreground' },
  { regex: /text-\[#37B9FF\]/g, replacement: 'text-accent' },
  { regex: /border-\[#263442\]/g, replacement: 'border-border' },
  { regex: /border-\[#344454\]/g, replacement: 'border-border' },
  { regex: /bg-\[#37B9FF\]/g, replacement: 'bg-accent' },
  { regex: /text-\[#39D98A\]/g, replacement: 'text-green-500' },
  { regex: /text-\[#FF5C67\]/g, replacement: 'text-red-500' },
  { regex: /text-\[#FF8A4C\]/g, replacement: 'text-orange-500' },
  { regex: /bg-\[#FF5C67\]/g, replacement: 'bg-red-500' },
  { regex: /rounded-\[[^\]]+\]/g, replacement: 'rounded-none' },
  { regex: /rounded-md|rounded-lg|rounded-xl|rounded-2xl/g, replacement: 'rounded-none' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replacement);
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    modifiedFiles++;
  }
});

console.log(`Modified ${modifiedFiles} files.`);
