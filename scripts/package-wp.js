import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pluginDir = path.join(rootDir, 'wordpress-plugin');
const stageDir = path.join(rootDir, '.temp_wp_pack');
const pluginStageDir = path.join(stageDir, 'organizer-pracy');
const zipOutPath = path.join(pluginDir, 'organizer-pracy.zip');

console.log('📦 Pakowanie wtyczki WordPress: Organizer Pracy...');

// 1. Sprawdź, czy zasoby zostały zbudowane
const jsAsset = path.join(pluginDir, 'assets', 'organizer-pracy.js');
const cssAsset = path.join(pluginDir, 'assets', 'organizer-pracy.css');

if (!fs.existsSync(jsAsset) || !fs.existsSync(cssAsset)) {
  console.error('❌ Błąd: Brak skompilowanych zasobów w wordpress-plugin/assets/. Najpierw uruchom: npm run build:wp');
  process.exit(1);
}

// 2. Przygotuj katalog tymczasowy
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(pluginStageDir, { recursive: true });

// 3. Kopiuj niezbędne pliki wtyczki do struktury docelowej
const filesToCopy = ['organizer-pracy.php', 'readme.txt', 'README.md'];
for (const file of filesToCopy) {
  const srcPath = path.join(pluginDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(pluginStageDir, file));
  }
}

// Kopiuj folder assets
const assetsSrcDir = path.join(pluginDir, 'assets');
const assetsDestDir = path.join(pluginStageDir, 'assets');
fs.cpSync(assetsSrcDir, assetsDestDir, { recursive: true });

// 4. Usuń stary plik ZIP, jeśli istnieje
if (fs.existsSync(zipOutPath)) {
  fs.unlinkSync(zipOutPath);
}

// 5. Utwórz archiwum ZIP z folderem głównym organizer-pracy
try {
  // Przejdź do stageDir i spakuj folder organizer-pracy
  if (process.platform === 'win32') {
    // Na Windows: bsdtar lub PowerShell Compress-Archive
    try {
      execSync(`tar -a -c -f "${zipOutPath}" organizer-pracy`, { cwd: stageDir, stdio: 'pipe' });
    } catch {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${pluginStageDir}' -DestinationPath '${zipOutPath}' -Force"`, { stdio: 'inherit' });
    }
  } else {
    // Na Linux/macOS
    try {
      execSync(`zip -r "${zipOutPath}" organizer-pracy`, { cwd: stageDir, stdio: 'pipe' });
    } catch {
      execSync(`tar -a -c -f "${zipOutPath}" organizer-pracy`, { cwd: stageDir, stdio: 'pipe' });
    }
  }

  const stats = fs.statSync(zipOutPath);
  const sizeKb = (stats.size / 1024).toFixed(2);
  console.log(`✅ Sukces! Utworzono paczkę wtyczki: ${zipOutPath} (${sizeKb} KB)`);
} catch (err) {
  console.error('❌ Błąd podczas tworzenia pliku ZIP:', err);
  process.exit(1);
} finally {
  // Posprzątaj katalog tymczasowy
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}
