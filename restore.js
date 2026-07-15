const fs = require('fs');
const path = require('path');

try {
  const jsonPath = path.join('E:', 'code-project', 'vote', 'scratch_restore.json');
  let raw = fs.readFileSync(jsonPath, 'utf8');
  
  // BOM 제거
  raw = raw.trim().replace(/^\uFEFF/, '');
  
  const data = JSON.parse(raw);
  const content = data.content || '';
  
  const outPath = path.join('E:', 'code-project', 'vote', 'public', 'index_original.html');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log("복구 성공! 크기:", content.length);
} catch (e) {
  console.error("오류 발생:", e);
}