#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = path.join(__dirname, '..', 'src', 'assets', 'sounds');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'app', 'audio', 'utils', 'sound-library.ts');

// Category mapping based on folder structure first, then filename patterns
const getCategoryFromPath = (filepath, filename) => {
  const pathParts = filepath.split(path.sep);
  
  // Check if file is in a subfolder
  if (pathParts.length > 1) {
    const folderName = pathParts[pathParts.length - 2].toLowerCase();
    
    // Map folder names to categories
    if (folderName.includes('drum') || folderName.includes('kick') || 
        folderName.includes('snare') || folderName.includes('hat') || 
        folderName.includes('perc')) return 'Drums';
    if (folderName.includes('bass')) return 'Bass';
    if (folderName.includes('synth') || folderName.includes('lead') || 
        folderName.includes('pad') || folderName.includes('accent')) return 'Synth';
    if (folderName.includes('fx') || folderName.includes('effect')) return 'FX';
  }
  
  // Fallback to filename-based detection
  const name = filename.toLowerCase();
  
  if (name.includes('kick') || name.includes('snare') || name.includes('hihat') || 
      name.includes('hat ') || name.includes('crash') || name.includes('drum') || 
      name.includes('perc') || name.includes('bongo') || name.includes('conga') || 
      name.includes('tamb') || name.includes('tom') || name.includes('shaker')) return 'Drums';
  if (name.includes('bass') || name.includes('moog')) return 'Bass';
  if (name.includes('synth') || name.includes('lead') || name.includes('pad') || 
      name.includes('pluck') || name.includes('beep') || name.includes('vox')) return 'Synth';
  if (name.includes('noise') || name.includes('scratch') || name.includes('siren') || 
      name.includes('vinyl') || name.includes('static')) return 'FX';
  
  return 'FX'; // Default category for existing sounds
};

// Generate tags from filename
const getTagsFromFilename = (filename, category) => {
  const name = filename.toLowerCase().replace(/[-_]/g, ' ');
  const tags = [];
  
  // Add category as tag
  tags.push(category.toLowerCase());
  
  // Common audio terms
  const audioTerms = [
    'kick', 'snare', 'hihat', 'crash', 'drum', 'percussion',
    'bass', 'sub', 'low', 'deep',
    'synth', 'lead', 'pad', 'pluck', 'saw', 'square',
    'vocal', 'voice', 'chop', 'acapella',
    'fx', 'riser', 'drop', 'sweep', 'impact', 'whoosh',
    'ambient', 'atmosphere', 'texture', 'noise', 'background'
  ];
  
  audioTerms.forEach(term => {
    if (name.includes(term) && !tags.includes(term)) {
      tags.push(term);
    }
  });
  
  return tags;
};

// Clean up filename for display name
const getDisplayName = (filename) => {
  return filename
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
    .join(' ');
};

// Generate unique ID from filename
const generateId = (filename) => {
  return filename
    .replace(/\.[^.]+$/, '') // Remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with dashes
    .replace(/--+/g, '-') // Remove multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
};

// Recursively scan directory for audio files
function scanDirectory(dir, baseDir = '') {
  const items = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        items.push(...scanDirectory(fullPath, relativePath));
      } else if (entry.isFile()) {
        // Check if it's an audio file
        const ext = path.extname(entry.name).toLowerCase();
        if (['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
          items.push({
            filename: entry.name,
            relativePath: relativePath,
            fullPath: fullPath
          });
        }
      }
    }
  } catch (err) {
    console.error(`Error scanning directory ${dir}:`, err.message);
  }
  
  return items;
}

async function scanSounds() {
  console.log('🎵 Scanning sounds directory...');
  
  if (!fs.existsSync(SOUNDS_DIR)) {
    console.error(`❌ Sounds directory not found: ${SOUNDS_DIR}`);
    process.exit(1);
  }
  
  // Scan all audio files recursively
  const audioFiles = scanDirectory(SOUNDS_DIR);
  
  if (audioFiles.length === 0) {
    console.log('⚠️  No audio files found in sounds directory');
    return;
  }
  
  console.log(`📁 Found ${audioFiles.length} audio files:`);
  audioFiles.forEach(file => console.log(`   • ${file.relativePath}`));
  
  // Generate sound library items
  const soundItems = audioFiles.map(fileInfo => {
    const category = getCategoryFromPath(fileInfo.relativePath, fileInfo.filename);
    const tags = getTagsFromFilename(fileInfo.filename, category);
    const id = generateId(fileInfo.filename);
    const name = getDisplayName(fileInfo.filename);
    
    return {
      id,
      name,
      category,
      filename: fileInfo.relativePath.replace(/\\/g, '/'), // Use forward slashes for web
      tags
    };
  });
  
  // Group by categories for output
  const categories = [...new Set(soundItems.map(item => item.category))].sort();
  
  console.log(`\n🏷️  Categories found: ${categories.join(', ')}`);
  
  // Generate TypeScript file content
  const tsContent = `export interface SoundLibraryItem {
  id: string;
  name: string;
  category: string;
  filename: string;
  duration?: number; // Will be filled after loading
  tags?: string[];
}

export const SOUND_LIBRARY: SoundLibraryItem[] = [
${soundItems.map(item => {
  const tagsStr = item.tags.length > 0 
    ? `, tags: [${item.tags.map(tag => `'${tag}'`).join(', ')}]` 
    : '';
  return `  { id: '${item.id}', name: '${item.name}', category: '${item.category}', filename: '${item.filename}'${tagsStr} },`;
}).join('\n')}
];

export const SOUND_CATEGORIES = [
  'All',
  ${categories.map(cat => `'${cat}'`).join(',\n  ')}
] as const;

export type SoundCategory = typeof SOUND_CATEGORIES[number];

// Auto-generated by scan-sounds.js - Do not edit manually!
// Run 'npm run scan-sounds' to regenerate this file.
`;
  
  // Write the file
  fs.writeFileSync(OUTPUT_FILE, tsContent);
  
  console.log(`\n✅ Generated sound library: ${OUTPUT_FILE}`);
  console.log(`   • ${soundItems.length} sounds`);
  console.log(`   • ${categories.length} categories`);
  console.log('\n🎯 Next steps:');
  console.log('   1. Add your MP3/WAV files to src/assets/sounds/');
  console.log('   2. Run "npm run scan-sounds" to update the library');
  console.log('   3. Restart your dev server to see changes');
}

scanSounds().catch(console.error);