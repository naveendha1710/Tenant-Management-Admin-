const fs = require('fs');
const path = require('path');

const replacements = [
  // Grid layouts
  { find: /className="([^"]*?)grid grid-cols-5(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5$2"' },
  { find: /className="([^"]*?)grid grid-cols-4(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4$2"' },
  { find: /className="([^"]*?)grid grid-cols-3(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3$2"' },
  { find: /className="([^"]*?)grid grid-cols-2(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1grid grid-cols-1 sm:grid-cols-2$2"' },
  
  // Spacing
  { find: /className="([^"]*?)gap-6(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1gap-4 sm:gap-6$2"' },
  { find: /className="([^"]*?)space-y-6(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1space-y-4 sm:space-y-6$2"' },
  
  // Flex layouts - specific patterns
  { find: /className="flex items-center justify-between"/g, replace: 'className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"' },
  { find: /className="flex gap-2"/g, replace: 'className="flex flex-col sm:flex-row gap-2"' },
  { find: /className="flex gap-4"/g, replace: 'className="flex flex-col sm:flex-row gap-3 sm:gap-4"' },
  
  // Text sizes
  { find: /className="([^"]*?)text-2xl(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1text-lg sm:text-xl md:text-2xl$2"' },
  { find: /className="([^"]*?)text-xl(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1text-base sm:text-lg md:text-xl$2"' },
  
  // Width
  { find: /className="([^"]*?)w-64(?!\s+sm:)([^"]*?)"/g, replace: 'className="$1w-full sm:w-64$2"' },
  
  // Tables
  { find: /<CardContent>\s*<Table>/g, replace: '<CardContent className="overflow-x-auto">\n            <Table className="min-w-[600px]">' },
  { find: /<CardContent className="([^"]*?)">\s*<Table>/g, replace: '<CardContent className="$1 overflow-x-auto">\n            <Table className="min-w-[600px]">' },
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ find, replace }) => {
      const newContent = content.replace(find, replace);
      if (newContent !== content) {
        modified = true;
        content = newContent;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath, extensions = ['.tsx', '.ts']) {
  let filesProcessed = 0;
  let filesModified = 0;
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
          walkDir(filePath);
        }
      } else if (extensions.some(ext => file.endsWith(ext))) {
        filesProcessed++;
        if (processFile(filePath)) {
          filesModified++;
        }
      }
    });
  }
  
  walkDir(dirPath);
  return { filesProcessed, filesModified };
}

// Main execution
const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const componentsDir = path.join(__dirname, '..', 'src', 'components');

console.log('🚀 Starting mobile responsive conversion...\n');

console.log('📁 Processing pages directory...');
const pagesResult = processDirectory(pagesDir);

console.log('\n📁 Processing components directory...');
const componentsResult = processDirectory(componentsDir);

console.log('\n✅ Conversion complete!');
console.log(`📊 Pages: ${pagesResult.filesModified}/${pagesResult.filesProcessed} files modified`);
console.log(`📊 Components: ${componentsResult.filesModified}/${componentsResult.filesProcessed} files modified`);
console.log(`📊 Total: ${pagesResult.filesModified + componentsResult.filesModified}/${pagesResult.filesProcessed + componentsResult.filesProcessed} files modified`);
