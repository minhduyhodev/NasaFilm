import fs from 'fs';
import path from 'path';

const pagesDir = path.join('src/features/home/pages');
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;

  content = content.replace(/^import Navbar from ['"]\.\.\/components\/Navbar['"];\r?\n/gm, '');
  content = content.replace(/^import Footer from ['"]\.\.\/components\/Footer['"];\r?\n/gm, '');
  content = content.replace(/\r?\n\s*<Navbar\s*\/>/g, '');
  content = content.replace(/\r?\n\s*<Footer\s*\/>/g, '');
  content = content.replace(/\r?\n\s*\{!isCustomCinema && <Navbar\s*\/>\}/g, '');
  content = content.replace(/\r?\n\s*\{!isCustomCinema && <Footer\s*\/>\}/g, '');

  if (content !== orig) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', file);
  }
}
