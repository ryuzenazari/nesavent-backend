/**
 * Script untuk menghapus komentar kode yang dimulai dengan //
 * 
 * Cara penggunaan:
 * node scripts/removeComments.js [path] [extensions]
 * 
 * Contoh:
 * node scripts/removeComments.js src js,ts
 * 
 * Keterangan:
 * - path: Direktori yang akan diproses (default: src)
 * - extensions: Ekstensi file yang akan diproses, dipisahkan dengan koma (default: js)
 */

const fs = require('fs');
const path = require('path');

// Direktori dan ekstensi default
const defaultDir = 'src';
const defaultExtensions = ['js'];

// Ambil argumen dari command line
const args = process.argv.slice(2);
const targetDir = args[0] || defaultDir;
const extensions = args[1] ? args[1].split(',') : defaultExtensions;

console.log(`Memproses direktori: ${targetDir}`);
console.log(`Ekstensi file: ${extensions.join(', ')}`);

// Hitung statistik
let totalFiles = 0;
let totalCommentLines = 0;
let filesProcessed = 0;

// Fungsi untuk mengecek apakah file memiliki ekstensi yang diinginkan
function hasValidExtension(file) {
  const ext = path.extname(file).toLowerCase().substring(1);
  return extensions.includes(ext);
}

// Fungsi untuk menghapus komentar
function removeComments(content) {
  const lines = content.split('\n');
  const newLines = [];
  let commentLinesCount = 0;
  let inMultiLineComment = false;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip multi-line comments (/* */)
    if (inMultiLineComment) {
      if (line.includes('*/')) {
        inMultiLineComment = false;
        // Include the part after */
        const afterComment = line.substring(line.indexOf('*/') + 2);
        if (afterComment.trim() && !afterComment.trim().startsWith('//')) {
          newLines.push(afterComment);
        } else {
          commentLinesCount++;
        }
      } else {
        commentLinesCount++;
      }
      continue;
    }
    
    // Skip jika line dimulai dengan // (komentar satu baris)
    if (trimmedLine.startsWith('//')) {
      commentLinesCount++;
      continue;
    }
    
    // Cek apakah baris ini memulai multi-line comment
    if (trimmedLine.includes('/*') && !trimmedLine.includes('*/')) {
      inMultiLineComment = true;
      // Include the part before /*
      const beforeComment = line.substring(0, line.indexOf('/*'));
      if (beforeComment.trim()) {
        newLines.push(beforeComment);
      } else {
        commentLinesCount++;
      }
      continue;
    }
    
    // Cek apakah ada komentar // di tengah baris
    // Jangan hapus // yang ada dalam string
    let newLine = '';
    let j = 0;
    while (j < line.length) {
      if (inString) {
        // Keluar dari string jika ditemukan karakter penutup
        if (line[j] === stringChar && line[j-1] !== '\\') {
          inString = false;
        }
        newLine += line[j];
      } else if (line[j] === '"' || line[j] === "'" || line[j] === '`') {
        // Masuk ke dalam string
        inString = true;
        stringChar = line[j];
        newLine += line[j];
      } else if (j < line.length - 1 && line[j] === '/' && line[j+1] === '/') {
        // Ditemukan komentar //, potong sisa baris
        break;
      } else {
        newLine += line[j];
      }
      j++;
    }
    
    // Hanya tambahkan baris jika tidak kosong setelah komentar dihapus
    const cleanedLine = newLine.trim();
    if (cleanedLine || newLine.includes('\t') || newLine.includes(' ')) {
      newLines.push(newLine);
    } else {
      commentLinesCount++;
    }
  }
  
  return { content: newLines.join('\n'), commentLinesCount };
}

// Fungsi rekursif untuk memproses direktori
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Jangan proses node_modules, .git dan direktori hidden lainnya
      if (!file.startsWith('.') && file !== 'node_modules') {
        processDirectory(filePath);
      }
    } else if (stats.isFile() && hasValidExtension(file)) {
      totalFiles++;
      
      // Baca konten file
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Hapus komentar
      const { content: newContent, commentLinesCount } = removeComments(content);
      totalCommentLines += commentLinesCount;
      
      // Tulis balik ke file jika ada perubahan
      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        filesProcessed++;
        console.log(`✅ ${filePath} - Menghapus ${commentLinesCount} baris komentar`);
      } else {
        console.log(`ℹ️ ${filePath} - Tidak ada komentar yang dihapus`);
      }
    }
  });
}

// Mulai proses
const startTime = Date.now();
const fullPath = path.resolve(process.cwd(), targetDir);

try {
  processDirectory(fullPath);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n===== HASIL =====');
  console.log(`Total file diproses: ${totalFiles}`);
  console.log(`File diubah: ${filesProcessed}`);
  console.log(`Total baris komentar dihapus: ${totalCommentLines}`);
  console.log(`Waktu eksekusi: ${duration} detik`);
} catch (err) {
  console.error('Terjadi kesalahan:', err);
  process.exit(1);
} 