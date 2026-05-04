const fs = require('fs');

try {
  let content = fs.readFileSync('data.js', 'utf8');
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  
  if (start === -1 || end === -1) throw new Error('No JSON found');
  
  content = content.substring(start, end + 1);
  const data = JSON.parse(content);
  
  console.log('Top level keys:', Object.keys(data));
  
  function search(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      if (obj.length > 0 && (obj[0].video_id || obj[0].id || obj[0].title || obj[0].video_name)) {
        console.log(`FOUND potential list at: ${path} (length: ${obj.length})`);
        console.log('Sample:', JSON.stringify(obj[0]).substring(0, 200));
      }
    }
    
    for (const key in obj) {
      search(obj[key], `${path}.${key}`);
    }
  }
  
  search(data);
} catch (err) {
  console.error('Error parsing JSON:', err.message);
}
