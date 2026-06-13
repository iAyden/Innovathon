const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('schema.json', 'utf8'));
  const definitions = data.definitions;
  
  if (!definitions) {
    console.log('No definitions found. Full response:', data);
    process.exit(1);
  }

  console.log('--- DATABASE TABLES ---');
  for (const [tableName, schema] of Object.entries(definitions)) {
    console.log(`\nTable: ${tableName}`);
    if (schema.properties) {
      for (const [colName, colSchema] of Object.entries(schema.properties)) {
        console.log(`  - ${colName}: ${colSchema.type || colSchema.format} ${colSchema.description || ''}`);
      }
    }
  }
} catch (e) {
  console.error('Error parsing schema:', e);
}
