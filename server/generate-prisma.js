const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('--- Iniciando generación de Prisma ---');

const searchPaths = [
  path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js'),
  path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js'),
  path.join(__dirname, '..', '..', 'node_modules', 'prisma', 'build', 'index.js')
];

const prismaPath = searchPaths.find(p => fs.existsSync(p));

if (prismaPath) {
  console.log(`Ejecutando Prisma desde: ${prismaPath}`);
  const result = spawnSync('node', [prismaPath, 'generate'], { 
    stdio: 'inherit',
    shell: true 
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
} else {
  console.error('ERROR: No se encontró el script de Prisma en node_modules.');
  console.log('Intentando npx como último recurso...');
  const result = spawnSync('npx', ['prisma', 'generate'], { 
    stdio: 'inherit',
    shell: true 
  });
  process.exit(result.status || 0);
}
