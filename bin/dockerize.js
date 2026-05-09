#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { detectProject } = require('../src/detector');
const { generateFiles } = require('../src/generator');

const args = process.argv.slice(2);
const command = args[0];
const projectPath = args[1]
  ? path.resolve(args[1])
  : process.cwd();

console.log('\n🐳 Auto-Dockerize by @mohameden19961\n');

// Commande: remove
if (command === 'remove') {
  const filesToRemove = ['Dockerfile', 'docker-compose.yml', '.dockerignore'];
  let removed = 0;

  filesToRemove.forEach(file => {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Supprimé : ${file}`);
      removed++;
    } else {
      console.log(`⚠️  Non trouvé : ${file}`);
    }
  });

  if (removed > 0) {
    console.log(`\n✅ Docker retiré du projet avec succès !\n`);
  } else {
    console.log(`\n❌ Aucun fichier Docker trouvé dans ce projet.\n`);
  }
  process.exit(0);
}

// Commande: help
if (command === 'help' || command === '--help') {
  console.log('Usage:');
  console.log('  npx @mohameden19961/auto-dockerize          → Dockerize le projet courant');
  console.log('  npx @mohameden19961/auto-dockerize remove   → Supprime Docker du projet');
  console.log('  npx @mohameden19961/auto-dockerize help     → Affiche cette aide\n');
  process.exit(0);
}

// Commande: default (générer)
console.log(`📁 Projet détecté : ${projectPath}`);

const projectInfo = detectProject(projectPath);
console.log(`🔍 Type détecté   : ${projectInfo.type}`);
if (projectInfo.port) {
  console.log(`🌐 Port           : ${projectInfo.port}`);
}

generateFiles(projectInfo, projectPath);

console.log('\n✅ Fichiers générés avec succès :');
console.log('   → Dockerfile');
console.log('   → docker-compose.yml');
console.log('   → .dockerignore');
console.log('\n🚀 Pour lancer :');
console.log('   docker compose up --build');
console.log('\n🗑️  Pour retirer Docker :');
console.log('   npx @mohameden19961/auto-dockerize remove\n');
