# Backend Konzept für nervbox-mixer

## Gesamtkonzept
**Hybrid-Ansatz**: Lokale Entwicklung ohne Backend, Production mit PHP-Backend für erweiterte Features (Sound-Upload, Cloud-Arrangements, dynamische Kategorien)

## 1. Technologie-Stack
- **Backend**: Plain PHP (managed hosting-tauglich, keine Frameworks)
- **Database**: MySQL 
- **Development**: Environment-basiertes Switching (lokal: static files, prod: API)
- **Deployment**: Integriert in Angular Build Process
- **Security**: Multi-layered validation ohne Login-System
- **Kategorien**: Dynamisch erweiterbar, hierarchisch

## 2. Ordnerstruktur
```
src/
├── app/...                    # Angular Code (bestehend)
├── api/                       # PHP Backend (neu)
│   ├── config.php            # Environment-Config Template
│   ├── sounds.php            # Sound CRUD API (GET/POST/DELETE)
│   ├── arrangements.php      # Arrangement CRUD API  
│   ├── categories.php        # Kategorie-Management API (neu)
│   ├── .htaccess            # Security Rules für uploads/
│   └── .env.example         # Config Template (echte .env nicht in Git)
├── sql/                      # Database Schema (neu)
│   ├── schema.sql           # MySQL Setup
│   └── seed-data.sql        # Initiale System-Kategorien
└── environments/             # Angular Environments (erweitern)
    ├── environment.ts        # useBackend: false
    └── environment.prod.ts   # useBackend: true, apiUrl: '/api'
```

## 3. MySQL Schema (mit dynamischen Kategorien)

### Kategorien-System
```sql
-- Hierarchische Kategorien-Tabelle
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    parent_id INT NULL,
    is_system BOOLEAN DEFAULT FALSE,    -- System vs User-created
    icon VARCHAR(50) NULL,              -- Optional: Icon name
    color VARCHAR(7) NULL,              -- Optional: Hex color
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_per_parent (name, parent_id),
    INDEX idx_parent (parent_id)
);

-- Sounds mit Kategorie-Referenz
CREATE TABLE sounds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,        -- z.B. 'user_kick_123.wav'
    display_name VARCHAR(255) NOT NULL,    -- z.B. 'My Custom Kick'
    category_id INT NOT NULL,              -- Referenz auf categories
    tags JSON,                             -- ['heavy', '808', 'trap']
    file_size INT,
    duration DECIMAL(8,3),                 -- Sekunden
    is_default BOOLEAN DEFAULT FALSE,       -- Default vs User-Upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_category (category_id),
    INDEX idx_is_default (is_default)
);

-- Arrangements unverändert
CREATE TABLE arrangements (
    id VARCHAR(36) PRIMARY KEY,            -- UUID
    name VARCHAR(255) NOT NULL,
    bpm INT DEFAULT 120,
    arrangement_data JSON NOT NULL,        -- Komplettes ArrangementDefinition
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Seed Data (System-Kategorien)
```sql
-- sql/seed-data.sql
-- Haupt-Kategorien (is_system = true)
INSERT INTO categories (name, parent_id, is_system, icon) VALUES 
('Drums', NULL, true, 'drum'),
('Bass', NULL, true, 'bass'),
('Melodic', NULL, true, 'piano'),
('Vocals', NULL, true, 'mic'),
('FX', NULL, true, 'fx');

-- Sub-Kategorien für Drums
INSERT INTO categories (name, parent_id, is_system) VALUES
('Kicks', (SELECT id FROM categories WHERE name = 'Drums'), true),
('Snares', (SELECT id FROM categories WHERE name = 'Drums'), true),
('Hi-Hats', (SELECT id FROM categories WHERE name = 'Drums'), true),
('Percussion', (SELECT id FROM categories WHERE name = 'Drums'), true),
('Cymbals', (SELECT id FROM categories WHERE name = 'Drums'), true);

-- Sub-Kategorien für Bass
INSERT INTO categories (name, parent_id, is_system) VALUES
('808s', (SELECT id FROM categories WHERE name = 'Bass'), true),
('Sub Bass', (SELECT id FROM categories WHERE name = 'Bass'), true),
('Bass Lines', (SELECT id FROM categories WHERE name = 'Bass'), true),
('Reese Bass', (SELECT id FROM categories WHERE name = 'Bass'), true);

-- Sub-Kategorien für Melodic
INSERT INTO categories (name, parent_id, is_system) VALUES
('Leads', (SELECT id FROM categories WHERE name = 'Melodic'), true),
('Pads', (SELECT id FROM categories WHERE name = 'Melodic'), true),
('Plucks', (SELECT id FROM categories WHERE name = 'Melodic'), true),
('Arpeggios', (SELECT id FROM categories WHERE name = 'Melodic'), true),
('Keys', (SELECT id FROM categories WHERE name = 'Melodic'), true);

-- Sub-Kategorien für Vocals  
INSERT INTO categories (name, parent_id, is_system) VALUES
('Vocal Chops', (SELECT id FROM categories WHERE name = 'Vocals'), true),
('One Shots', (SELECT id FROM categories WHERE name = 'Vocals'), true),
('Acapellas', (SELECT id FROM categories WHERE name = 'Vocals'), true);

-- Sub-Kategorien für FX
INSERT INTO categories (name, parent_id, is_system) VALUES
('Risers', (SELECT id FROM categories WHERE name = 'FX'), true),
('Impacts', (SELECT id FROM categories WHERE name = 'FX'), true),
('Atmospheres', (SELECT id FROM categories WHERE name = 'FX'), true),
('Transitions', (SELECT id FROM categories WHERE name = 'FX'), true),
('White Noise', (SELECT id FROM categories WHERE name = 'FX'), true);
```

## 4. PHP API Endpoints (Micro-Backend Ansatz)

### /api/sounds.php
```php
<?php
// GET → Liste aller Sounds (mit Kategorie-Info)
// Response: 
{
  "sounds": [
    {
      "id": 1,
      "filename": "kick_808.wav",
      "display_name": "808 Kick", 
      "category": {
        "id": 6,
        "name": "Kicks",
        "parent": {"id": 1, "name": "Drums"}
      },
      "tags": ["808", "heavy"],
      "duration": 1.2,
      "is_default": true
    }
  ]
}

// POST → Sound-File Upload mit Kategorie
// Request Body (FormData):
// - file: Audio file
// - display_name: string
// - category_id: int (existing) OR new_category: {name, parent_id}
// - tags: JSON array

// DELETE ?id=123 → Sound löschen (nur User-Uploads)
?>
```

### /api/categories.php (NEU)
```php
<?php
// GET → Kompletter Kategorie-Tree
// Response:
{
  "categories": [
    {
      "id": 1,
      "name": "Drums",
      "is_system": true,
      "children": [
        {"id": 6, "name": "Kicks", "parent_id": 1, "sound_count": 15},
        {"id": 7, "name": "Snares", "parent_id": 1, "sound_count": 12}
      ]
    }
  ]
}

// POST → Neue Kategorie anlegen
// Request: {"name": "My Custom Category", "parent_id": 1}
// Response: {"id": 25, "name": "My Custom Category", "parent_id": 1}

// DELETE ?id=123 → Kategorie löschen (nur User-created, nicht is_system)
?>
```

### /api/arrangements.php  
```php
<?php
// GET → Liste aller Arrangements
// POST → Arrangement speichern/aktualisieren
// GET ?id=uuid → Spezifisches Arrangement laden
// DELETE ?id=uuid → Arrangement löschen
?>
```

### /api/config.php
```php
<?php
// Template - keine echten Credentials in Git!
$config = [
    'db' => [
        'host' => $_ENV['DB_HOST'] ?? 'localhost',
        'name' => $_ENV['DB_NAME'] ?? 'nervbox',
        'user' => $_ENV['DB_USER'] ?? 'root', 
        'pass' => $_ENV['DB_PASS'] ?? ''
    ],
    'upload' => [
        'dir' => '/uploads/sounds/',          # Öffentlich zugänglich
        'max_size' => 10 * 1024 * 1024,      # 10MB
        'allowed_types' => ['wav', 'mp3', 'ogg', 'm4a', 'aac']
    ],
    'security' => [
        'total_storage_limit' => 100 * 1024 * 1024,  # 100MB Gesamt
        'rate_limit_uploads' => 10,                   # Max 10 uploads pro Stunde
        'max_category_depth' => 3                     # Max 3 Ebenen tief
    ],
    'categories' => [
        'auto_suggest' => true,               # Automatische Kategorie-Vorschläge
        'allow_user_categories' => true       # User kann neue Kategorien anlegen
    ]
];

// Automatische Kategorie-Erkennung
function suggestCategory($filename): array {
    $name = strtolower($filename);
    
    // Pattern-basierte Erkennung
    $patterns = [
        ['kick', 'Drums', 'Kicks'],
        ['snare', 'Drums', 'Snares'], 
        ['hihat', 'Drums', 'Hi-Hats'],
        ['808', 'Bass', '808s'],
        ['bass', 'Bass', 'Sub Bass'],
        ['lead', 'Melodic', 'Leads'],
        ['pad', 'Melodic', 'Pads'],
        ['vocal', 'Vocals', 'Vocal Chops'],
        ['riser', 'FX', 'Risers'],
        ['impact', 'FX', 'Impacts']
    ];
    
    foreach ($patterns as [$keyword, $main, $sub]) {
        if (strpos($name, $keyword) !== false) {
            return ['main' => $main, 'sub' => $sub];
        }
    }
    
    return ['main' => 'FX', 'sub' => null]; // Fallback
}
?>
```

## 5. Security Implementation (mehrschichtig)

### File Upload Protection
```php
<?php
class SecurityHelper {
    
    // 1. MIME-Type Validation
    static function validateMimeType($file): bool {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file);
        $allowed = ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4', 'audio/aac'];
        return in_array($mimeType, $allowed);
    }
    
    // 2. Magic Bytes Check (File Header)
    static function validateFileHeader($file): bool {
        $header = file_get_contents($file, false, null, 0, 8);
        
        // WAV: "RIFF....WAVE"
        if (substr($header, 0, 4) === 'RIFF' && substr($header, 8, 4) === 'WAVE') return true;
        
        // MP3: ID3 Tag oder Frame Header
        if (substr($header, 0, 3) === 'ID3') return true;
        if (($header[0] & 0xFF) === 0xFF && ($header[1] & 0xE0) === 0xE0) return true;
        
        // OGG: "OggS"
        if (substr($header, 0, 4) === 'OggS') return true;
        
        return false;
    }
    
    // 3. Filename Sanitization
    static function sanitizeFilename($filename): string {
        $filename = basename($filename); // Keine Pfade
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);
        return substr($filename, 0, 100); // Max 100 Zeichen
    }
    
    // 4. Storage Limit Check
    static function checkStorageLimit($uploadSize): bool {
        global $config;
        $currentSize = self::getDirSize($config['upload']['dir']);
        return ($currentSize + $uploadSize) <= $config['security']['total_storage_limit'];
    }
    
    // 5. Rate Limiting (simple file-based)
    static function checkRateLimit($ip): bool {
        $file = "/tmp/uploads_{$ip}.log";
        $hour = date('Y-m-d-H');
        
        if (!file_exists($file)) {
            file_put_contents($file, $hour . "\n1");
            return true;
        }
        
        $lines = file($file, FILE_IGNORE_NEW_LINES);
        $lastLine = end($lines);
        [$lastHour, $count] = explode("\n", $lastLine);
        
        if ($lastHour === $hour) {
            if ($count >= 10) return false; // Rate limit exceeded
            file_put_contents($file, $hour . "\n" . ($count + 1));
        } else {
            file_put_contents($file, $hour . "\n1");
        }
        
        return true;
    }
    
    private static function getDirSize($dir): int {
        $size = 0;
        foreach (glob($dir . '/*') as $file) {
            if (is_file($file)) $size += filesize($file);
        }
        return $size;
    }
}
?>
```

### .htaccess für uploads/
```apache
# /uploads/.htaccess - Nur Audio-Files zulassen
<FilesMatch "\.(wav|mp3|ogg|m4a|aac)$">
    Order allow,deny
    Allow from all
</FilesMatch>

# Alle anderen Files blocken  
<FilesMatch "\.">
    Order deny,allow  
    Deny from all
</FilesMatch>

# PHP-Execution verhindern
<FilesMatch "\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$">
    Order deny,allow
    Deny from all
</FilesMatch>

# Directory Listing deaktivieren
Options -Indexes

# File-Size Limit (falls Server das unterstützt)
LimitRequestBody 10485760
```

### SQL Injection Prevention
```php
<?php
// Ausschließlich PDO Prepared Statements verwenden
class Database {
    private $pdo;
    
    public function __construct($config) {
        $dsn = "mysql:host={$config['host']};dbname={$config['name']};charset=utf8mb4";
        $this->pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    }
    
    public function insertSound($filename, $displayName, $categoryId, $tags): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO sounds (filename, display_name, category_id, tags, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$filename, $displayName, $categoryId, json_encode($tags)]);
        return $this->pdo->lastInsertId();
    }
    
    public function createCategory($name, $parentId = null): int {
        $stmt = $this->pdo->prepare("
            INSERT INTO categories (name, parent_id, is_system, created_at) 
            VALUES (?, ?, FALSE, NOW())
        ");
        $stmt->execute([$name, $parentId]);
        return $this->pdo->lastInsertId();
    }
}
?>
```

## 6. Angular Integration

### Environment Configuration
```typescript
// src/environments/environment.ts (Development)
export const environment = {
  production: false,
  apiUrl: '',
  useBackend: false,  // Verwendet statische SOUND_LIBRARY
  features: {
    soundUpload: false,
    cloudArrangements: false,
    dynamicCategories: false
  }
};

// src/environments/environment.prod.ts (Production)
export const environment = {
  production: true,
  apiUrl: '/api',
  useBackend: true,   // Verwendet Backend APIs
  features: {
    soundUpload: true,
    cloudArrangements: true,
    dynamicCategories: true
  }
};
```

### Service Updates

#### CategoryService (NEU)
```typescript
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Category {
  id: number;
  name: string;
  parent_id?: number;
  is_system: boolean;
  children?: Category[];
  sound_count?: number;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  categories = signal<Category[]>([]);
  selectedCategory = signal<number | null>(null);
  
  async loadCategories(): Promise<void> {
    if (!environment.useBackend) {
      // Statische Kategorien für lokale Entwicklung
      this.categories.set(STATIC_CATEGORIES);
      return;
    }
    
    const response = await fetch(`${environment.apiUrl}/categories.php`);
    const data = await response.json();
    this.categories.set(data.categories);
  }
  
  async createCategory(name: string, parentId?: number): Promise<Category> {
    if (!environment.useBackend) {
      throw new Error('Category creation not available in development');
    }
    
    const response = await fetch(`${environment.apiUrl}/categories.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId })
    });
    
    const category = await response.json();
    
    // Update local state
    await this.loadCategories();
    
    return category;
  }
  
  async deleteCategory(id: number): Promise<void> {
    if (!environment.useBackend) return;
    
    await fetch(`${environment.apiUrl}/categories.php?id=${id}`, {
      method: 'DELETE'
    });
    
    await this.loadCategories();
  }
  
  getCategoryPath(categoryId: number): string {
    const category = this.findCategoryById(categoryId);
    if (!category) return 'Unknown';
    
    if (category.parent_id) {
      const parent = this.findCategoryById(category.parent_id);
      return `${parent?.name} > ${category.name}`;
    }
    
    return category.name;
  }
  
  private findCategoryById(id: number): Category | null {
    const findInTree = (categories: Category[]): Category | null => {
      for (const cat of categories) {
        if (cat.id === id) return cat;
        if (cat.children) {
          const found = findInTree(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInTree(this.categories());
  }
}

// Fallback für Development
const STATIC_CATEGORIES: Category[] = [
  {
    id: 1, name: 'Drums', is_system: true,
    children: [
      { id: 6, name: 'Kicks', parent_id: 1, is_system: true },
      { id: 7, name: 'Snares', parent_id: 1, is_system: true },
      { id: 8, name: 'Hi-Hats', parent_id: 1, is_system: true }
    ]
  },
  {
    id: 2, name: 'Bass', is_system: true,
    children: [
      { id: 9, name: '808s', parent_id: 2, is_system: true },
      { id: 10, name: 'Sub Bass', parent_id: 2, is_system: true }
    ]
  }
];
```

#### SoundLibraryService Erweitern
```typescript
import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { CategoryService, Category } from './category.service';

export interface SoundLibraryItem {
  id: string | number;
  name: string;
  category: Category;  // Vollständige Kategorie-Info statt string
  filename: string;
  duration?: number;
  tags?: string[];
  is_default?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SoundLibraryService {
  private categoryService = inject(CategoryService);
  
  sounds = signal<SoundLibraryItem[]>([]);
  filteredSounds = signal<SoundLibraryItem[]>([]);
  selectedCategoryId = signal<number | null>(null);
  searchTerm = signal<string>('');
  
  async loadSounds(): Promise<void> {
    if (!environment.useBackend) {
      // Bestehende statische SOUND_LIBRARY konvertieren
      const staticSounds = SOUND_LIBRARY.map(sound => ({
        ...sound,
        category: this.categoryService.findCategoryByName(sound.category)
      }));
      this.sounds.set(staticSounds);
    } else {
      const response = await fetch(`${environment.apiUrl}/sounds.php`);
      const data = await response.json();
      this.sounds.set(data.sounds);
    }
    
    this.updateFiltered();
  }
  
  async uploadSound(file: File, categoryId: number, displayName?: string): Promise<boolean> {
    if (!environment.useBackend || !environment.features.soundUpload) {
      return false;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category_id', categoryId.toString());
    formData.append('display_name', displayName || file.name);
    
    try {
      const response = await fetch(`${environment.apiUrl}/sounds.php`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        await this.loadSounds(); // Refresh list
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  }
  
  async deleteSound(id: number): Promise<boolean> {
    if (!environment.useBackend) return false;
    
    const response = await fetch(`${environment.apiUrl}/sounds.php?id=${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      await this.loadSounds();
      return true;
    }
    
    return false;
  }
  
  setCategory(categoryId: number | null): void {
    this.selectedCategoryId.set(categoryId);
    this.updateFiltered();
  }
  
  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
    this.updateFiltered();
  }
  
  private updateFiltered(): void {
    const categoryId = this.selectedCategoryId();
    const search = this.searchTerm().toLowerCase();
    const allSounds = this.sounds();
    
    const filtered = allSounds.filter(sound => {
      const matchesCategory = categoryId === null || 
        sound.category.id === categoryId ||
        sound.category.parent_id === categoryId; // Include sub-categories
        
      const matchesSearch = search === '' || 
        sound.name.toLowerCase().includes(search) ||
        sound.tags?.some(tag => tag.toLowerCase().includes(search)) ||
        sound.category.name.toLowerCase().includes(search);
      
      return matchesCategory && matchesSearch;
    });
    
    this.filteredSounds.set(filtered);
  }
}
```

#### ArrangementStorageService Erweitern
```typescript
export class ArrangementStorageService {
  // ... bestehender Code ...
  
  async saveArrangement(name: string, tracks: Track[], bpm = 120): Promise<string> {
    const arrangementDef = this.arrangementService.tracksToDefinition(tracks, name, bpm);
    
    if (environment.useBackend && environment.features.cloudArrangements) {
      // API Call zum Backend
      const response = await fetch(`${environment.apiUrl}/arrangements.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arrangementDef)
      });
      
      const result = await response.json();
      await this.loadArrangementsFromAPI(); // Refresh list
      return result.id;
    } else {
      // Bestehender localStorage Code
      return this.saveToLocalStorage(name, tracks, bpm);
    }
  }
  
  async loadArrangement(id: string): Promise<Track[] | null> {
    if (environment.useBackend && environment.features.cloudArrangements) {
      const response = await fetch(`${environment.apiUrl}/arrangements.php?id=${id}`);
      if (!response.ok) return null;
      
      const arrangement = await response.json();
      return await this.arrangementService.createFromDefinition(arrangement.arrangement_data);
    } else {
      // Bestehender localStorage Code
      return this.loadFromLocalStorage(id);
    }
  }
}
```

### UI Components

#### Sound Upload Component (NEU)
```typescript
@Component({
  selector: 'app-sound-upload',
  template: `
    <div class="upload-container">
      <input #fileInput type="file" accept="audio/*" (change)="onFileSelected($event)" hidden>
      
      <button mat-raised-button (click)="fileInput.click()">
        <mat-icon>cloud_upload</mat-icon>
        Upload Sound
      </button>
      
      @if (selectedFile) {
        <div class="upload-form">
          <mat-form-field>
            <mat-label>Display Name</mat-label>
            <input matInput [(ngModel)]="displayName" [placeholder]="selectedFile.name">
          </mat-form-field>
          
          <app-category-selector 
            [(selectedCategoryId)]="selectedCategoryId"
            [allowCreate]="true"
            (categoryCreated)="onCategoryCreated($event)">
          </app-category-selector>
          
          <div class="actions">
            <button mat-button (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" (click)="upload()" [disabled]="uploading">
              @if (uploading) {
                <mat-spinner diameter="20"></mat-spinner>
              }
              Upload
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class SoundUploadComponent {
  selectedFile: File | null = null;
  displayName = '';
  selectedCategoryId: number | null = null;
  uploading = false;
  
  constructor(
    private soundLibrary: SoundLibraryService,
    private snackBar: MatSnackBar
  ) {}
  
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.displayName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    }
  }
  
  async upload(): Promise<void> {
    if (!this.selectedFile || !this.selectedCategoryId) return;
    
    this.uploading = true;
    
    try {
      const success = await this.soundLibrary.uploadSound(
        this.selectedFile, 
        this.selectedCategoryId, 
        this.displayName
      );
      
      if (success) {
        this.snackBar.open('Sound uploaded successfully!', 'OK', { duration: 3000 });
        this.cancel();
      } else {
        this.snackBar.open('Upload failed. Please try again.', 'OK', { duration: 3000 });
      }
    } catch (error) {
      this.snackBar.open('Upload error occurred.', 'OK', { duration: 3000 });
    } finally {
      this.uploading = false;
    }
  }
  
  cancel(): void {
    this.selectedFile = null;
    this.displayName = '';
    this.selectedCategoryId = null;
  }
}
```

#### Category Selector Component (NEU)
```typescript
@Component({
  selector: 'app-category-selector',
  template: `
    <div class="category-selector">
      <mat-form-field>
        <mat-label>Category</mat-label>
        <mat-select [(value)]="selectedCategoryId" (selectionChange)="onSelectionChange($event)">
          @for (category of categoryService.categories(); track category.id) {
            <mat-optgroup [label]="category.name">
              @for (subcat of category.children || []; track subcat.id) {
                <mat-option [value]="subcat.id">
                  {{ subcat.name }} ({{ subcat.sound_count || 0 }})
                </mat-option>
              }
            </mat-optgroup>
          }
        </mat-select>
      </mat-form-field>
      
      @if (allowCreate) {
        <button mat-icon-button (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
        </button>
      }
    </div>
  `
})
export class CategorySelectorComponent {
  @Input() selectedCategoryId: number | null = null;
  @Input() allowCreate = false;
  @Output() selectedCategoryIdChange = new EventEmitter<number | null>();
  @Output() categoryCreated = new EventEmitter<Category>();
  
  constructor(
    public categoryService: CategoryService,
    private dialog: MatDialog
  ) {}
  
  onSelectionChange(event: any): void {
    this.selectedCategoryId = event.value;
    this.selectedCategoryIdChange.emit(this.selectedCategoryId);
  }
  
  openCreateDialog(): void {
    // Dialog für neue Kategorie...
  }
}
```

## 7. Build Integration

### Angular.json Erweitern
```json
{
  "build": {
    "configurations": {
      "production": {
        "fileReplacements": [
          {
            "replace": "src/environments/environment.ts",
            "with": "src/environments/environment.prod.ts"
          }
        ],
        "assets": [
          "src/favicon.ico",
          "src/assets",
          {
            "glob": "**/*",
            "input": "src/api",
            "output": "/api",
            "ignore": ["**/.env", "**/*.example"]
          },
          {
            "glob": "**/*", 
            "input": "src/sql",
            "output": "/sql"
          }
        ]
      },
      "development": {
        "assets": [
          "src/favicon.ico",
          "src/assets"
        ]
      }
    }
  }
}
```

### Build Output Structure
```
dist/nervbox-mixer/
├── index.html, *.js, *.css    # Angular Build
├── assets/
│   └── sounds/                # Default Audio Files (900+)
├── uploads/                   # Wird auf Server erstellt für User-Uploads
├── api/                       # PHP Backend (nur in Production Build)
│   ├── config.php
│   ├── sounds.php  
│   ├── arrangements.php
│   ├── categories.php
│   ├── .htaccess
│   └── .env.example
└── sql/                       # Database Setup (nur in Production Build)
    ├── schema.sql
    └── seed-data.sql
```

## 8. Migration Strategy

### Phase 1: Backend Development (2-3 Tage)
1. **Database Setup**
   - MySQL Schema erstellen
   - Seed-Data importieren  
   - Default-Sounds in categories/sounds Tabellen migrieren
   
2. **PHP APIs entwickeln**
   - config.php mit Environment-Handling
   - categories.php für dynamische Kategorien
   - sounds.php mit Upload-Funktionalität
   - arrangements.php für Cloud-Storage
   - Security-Layer implementieren

3. **Testing**
   - API-Endpoints mit Postman testen
   - File-Upload Sicherheit validieren
   - Rate-Limiting testen

### Phase 2: Angular Integration (1-2 Tage)
1. **Services erweitern**
   - Environment-basiertes Switching implementieren
   - CategoryService für dynamische Kategorien
   - SoundLibraryService API-Integration
   - ArrangementStorageService Cloud-Funktionalität

2. **UI Components**
   - Sound-Upload Dialog
   - Category-Selector mit Create-Option
   - Hierarchische Kategorie-Navigation
   - Upload-Progress Feedback

### Phase 3: Testing & Deployment (1 Tag)
1. **Development Testing**
   - Lokale Entwicklung ohne Backend testen
   - Production Build mit Backend testen
   - Cross-Browser Kompatibilität

2. **Production Deployment**
   - `npm run build:prod`
   - dist/ auf Webspace kopieren
   - `.env` mit echten Credentials erstellen
   - Database Schema & Seed-Data importieren
   - SSL/Security Headers konfigurieren

## 9. Development Workflow

### Lokale Entwicklung (unverändert)
```bash
npm start                    # Angular Dev Server - kein Backend nötig
npm run build               # Development Build - statische Files
npm run scan-sounds         # Generiert sound-library.ts (weiterhin nötig)
npm run lint                # Code Quality Check
```

### Production Build & Deploy
```bash
npm run build:prod          # Production Build mit Backend-Files
# dist/ Ordner komplett auf Webspace kopieren
# .env erstellen mit echten DB-Daten
# MySQL Schema importieren
# chmod 600 .env (Security)
```

### Database Updates
```bash
# Neue Kategorien hinzufügen
mysql -u user -p nervbox_prod < sql/new-categories.sql

# Default-Sounds migrieren  
mysql -u user -p nervbox_prod < sql/migrate-sounds.sql
```

## 10. Sicherheitsüberlegungen

### File Upload Sicherheit
- **Multi-Layer Validation**: MIME-Type + Magic Bytes + Extension
- **Storage Isolation**: Upload-Ordner außerhalb kritischer Bereiche  
- **Rate Limiting**: Max 10 Uploads pro Stunde pro IP
- **File Size Limits**: 10MB pro File, 100MB total pro "Session"
- **Execution Prevention**: .htaccess verhindert PHP-Execution in uploads/

### Database Sicherheit  
- **Prepared Statements**: Alle Queries über PDO prepared statements
- **Input Sanitization**: Filename/Category-Namen bereinigen
- **Privilege Separation**: DB-User nur mit nötigen Rechten
- **Connection Security**: SSL-Verbindung zur DB wenn möglich

### Environment Sicherheit
- **Credentials Isolation**: .env nie in Git, nur auf Server
- **File Permissions**: .env mit 600 (nur Owner read/write)
- **Error Handling**: Keine sensitiven Infos in Error Messages
- **CORS Configuration**: Nur für localhost in Development

### DoS Prevention
- **Upload Rate Limiting**: Verhindert Storage Bombing
- **Request Size Limits**: Apache/PHP max request size
- **Timeout Limits**: Verhindert hanging connections
- **Resource Monitoring**: File-Count/Size-Limits

## 11. Skalierungsmöglichkeiten

### Sofortige Erweiterungen (ohne große Änderungen)
- **User Sessions**: Simple PHP-Session ohne Login
- **Arrangement Sharing**: Public/Private Flag + Share-URLs
- **Advanced Search**: Fulltext-Search in tags/names
- **Category Analytics**: Beliebteste Kategorien/Sounds

### Mittelfristige Erweiterungen (Framework Migration)
- **User Accounts**: Laravel/Slim für Auth-System
- **Real-time Features**: Socket.io für Live-Collaboration
- **File Processing**: Background-Jobs für Waveform-Generation
- **CDN Integration**: CloudFlare/AWS für Audio-Delivery

### Langfristige Optionen (Architecture Change)
- **Microservices**: Separate Services für Auth, Files, Real-time
- **Modern Stack**: Supabase + Next.js/SvelteKit
- **Mobile Apps**: React Native/Flutter mit shared API
- **AI Features**: Auto-Tagging, Beat-Generation, Mastering

## 12. Hosting Requirements & Kosten

### Minimum LAMP Requirements
- **PHP**: 7.4+ mit PDO, fileinfo, json Extensions
- **MySQL**: 5.7+ oder MariaDB 10.2+  
- **Apache**: mod_rewrite für Clean URLs
- **Storage**: 500MB+ (Default-Sounds + User-Uploads)
- **Bandwidth**: 1GB/Monat (für kleine User-Base)

### Recommended Hosting Specs
- **PHP**: 8.0+ für bessere Performance
- **MySQL**: 8.0+ für JSON-Performance  
- **Storage**: 2GB+ für Skalierung
- **Memory**: 256MB+ PHP Memory Limit
- **SSL**: Let's Encrypt oder Hosting-SSL

### Kostenschätzung (Deutschland)
- **Shared LAMP Hosting**: 3-8€/Monat (Strato, 1&1, All-Inkl)
- **VPS mit LAMP**: 5-15€/Monat (Hetzner, Contabo)
- **Managed WordPress**: 8-20€/Monat (mit MySQL, oft überdimensioniert)

### Hosting-Empfehlungen
1. **All-Inkl Privat Plus**: 7.95€/Monat - 50GB, PHP 8+, MySQL
2. **Hetzner CX11**: 4.15€/Monat VPS - Volle Kontrolle 
3. **Strato PowerWeb Basic**: 4€/Monat - Einfach für MVP

## 13. Backup & Wartung

### Backup-Strategie
```bash
# Automatisches MySQL Backup (Cronjob)
0 2 * * * mysqldump -u backup_user -p nervbox_prod > /backup/nervbox_$(date +\%Y\%m\%d).sql

# File-Backup (rsync)
0 3 * * * rsync -av /var/www/html/uploads/ /backup/files/

# Retention (30 Tage)
0 4 * * * find /backup/ -name "*.sql" -mtime +30 -delete
```

### Monitoring & Wartung
- **Log Monitoring**: PHP Error Logs + Apache Access Logs
- **Storage Monitoring**: Disk-Space für uploads/ überwachen
- **Performance**: MySQL Slow Query Log aktivieren
- **Security Updates**: PHP/MySQL regelmäßig updaten

### Disaster Recovery
- **Database Restore**: MySQL Dump zurückspielen
- **File Restore**: uploads/ Ordner wiederherstellen  
- **Code Deploy**: dist/ aus Git-Backup
- **DNS**: Backup-Domain für Ausfälle

## 14. Testing Strategy

### Backend Testing
```php
// Simple PHP Tests (ohne Framework)
class APITest {
    public function testSoundUpload() {
        $response = $this->uploadTestFile('test.wav', 1);
        assert($response['success'] === true);
    }
    
    public function testCategoryCreation() {
        $response = $this->createCategory('Test Category', 1);
        assert(isset($response['id']));
    }
}
```

### Frontend Testing
```typescript
// Angular Unit Tests erweitern
describe('SoundLibraryService', () => {
  it('should switch between static and API mode', () => {
    // Test Environment-Switching Logic
  });
  
  it('should upload sound file', async () => {
    // Test Upload-Funktionalität
  });
});

// E2E Tests
describe('Sound Upload Flow', () => {
  it('should upload and categorize sound', () => {
    // Kompletter Upload-Workflow
  });
});
```

### Performance Testing
- **File Upload**: Verschiedene Dateigrößen testen
- **Category Loading**: Performance bei vielen Kategorien
- **Search Performance**: Fulltext-Search mit großer Sound-Library
- **Concurrent Users**: Mehrere simultane Uploads

## 15. Dokumentation & Onboarding

### API Dokumentation
```markdown
# nervbox-mixer API Documentation

## Authentication
No authentication required in MVP version.

## Endpoints

### GET /api/sounds.php
Returns list of all sounds with category information.

**Response:**
```json
{
  "sounds": [
    {
      "id": 1,
      "filename": "kick_808.wav",
      "display_name": "808 Kick",
      "category": {
        "id": 6,
        "name": "Kicks", 
        "parent": {"id": 1, "name": "Drums"}
      },
      "tags": ["808", "heavy"],
      "duration": 1.2,
      "is_default": true
    }
  ]
}
```

### POST /api/sounds.php
Upload new sound file.

**Request:** multipart/form-data
- `file`: Audio file (max 10MB)
- `display_name`: Display name for sound
- `category_id`: Existing category ID
- `tags`: JSON array of tags (optional)

**Response:**
```json
{
  "success": true,
  "sound_id": 123
}
```
```

### Setup Guide für Entwickler
```markdown
# nervbox-mixer Backend Setup

## Development (Local)
1. `npm install`
2. `npm start` - No backend needed
3. Develop normally with static sound library

## Production Deployment  
1. `npm run build:prod`
2. Upload `dist/` to webspace
3. Create `/api/.env` with DB credentials
4. Import SQL schema: `mysql < sql/schema.sql`
5. Import seed data: `mysql < sql/seed-data.sql`
6. Set permissions: `chmod 600 .env`

## Database Configuration
```
DB_HOST=localhost
DB_NAME=nervbox_prod  
DB_USER=nervbox_user
DB_PASS=your_secure_password
```
```

---

## Fazit

Dieses Backend-Konzept bietet:

**✅ Sofortige Vorteile:**
- Sound-Upload für User
- Cloud-basierte Arrangements
- Dynamisch erweiterbare Kategorien  
- Kein Breaking Changes für lokale Entwicklung

**✅ Technische Exzellenz:**
- Sicherheit auf Production-Level
- Skalierbare Architektur
- Environment-basiertes Development
- Clean Migration Path

**✅ Business Value:**
- User-Generated Content  
- Community Features möglich
- Analytics & Insights
- Monetarisierung vorbereitet

**Aufwand:** ~1 Woche Implementation
**Hosting:** Ab 4€/Monat LAMP-Hosting
**Maintenance:** Minimal durch bewusst einfache Architektur

Das Konzept ist **MVP-ready** aber **enterprise-scalable** - perfekt für organisches Wachstum von Solo-Entwickler zu größerem Projekt.