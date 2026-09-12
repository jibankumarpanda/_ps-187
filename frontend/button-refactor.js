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
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('./app'), ...walk('./components')];
let modified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace primary button classes (bg-ibvap-accent or bg-accent)
  content = content.replace(/className="([^"]*?(?:bg-ibvap-accent|bg-accent)[^"]*?text-(?:white|ibvap-bg|ibvap-bg-secondary)[^"]*?)"/g, (match, classes) => {
    // Remove the background, old text colors, and rounded
    let newClasses = classes
      .replace(/bg-ibvap-accent(?:\/\d+)?|bg-accent(?:\/\d+)?/g, '')
      .replace(/hover:bg-ibvap-accent(?:\/\d+)?|hover:bg-accent(?:\/\d+)?/g, '')
      .replace(/text-white|text-ibvap-bg|text-ibvap-bg-secondary/g, '')
      .replace(/rounded-[a-z0-9]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return `className="relative group inline-flex items-center justify-center gap-2 uppercase tracking-wider font-semibold text-accent py-2 transition-all duration-150 active:translate-y-px ${newClasses}"`;
  });

  // We need to inject the underline span if it's a primary button, but it's hard to do via regex on the opening tag alone.
  // Actually, we can just use a Tailwind `@layer components` to style buttons globally!

  if (content !== original) {
    fs.writeFileSync(file, content);
    modified++;
  }
});

console.log(`Modified ${modified} files.`);
