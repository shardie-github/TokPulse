#!/usr/bin/env node

/**
 * Dependency Graph Generator
 * 
 * Emit /.artifacts/deps-graph.svg via Graphviz (pure JS wrapper)
 * No circular deps allowed across packages
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const color = {
    info: colors.blue,
    success: colors.green,
    warn: colors.yellow,
    error: colors.red,
    debug: colors.magenta
  }[level] || colors.reset;
  
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}:${colors.reset} ${message}`, ...args);
}

class DependencyGraphGenerator {
  constructor() {
    this.packages = new Map();
    this.dependencies = new Map();
    this.circularDeps = [];
    this.artifactsDir = join(rootDir, '.artifacts');
  }

  async generate() {
    log('info', '📊 Generating dependency graph...');
    
    try {
      // Ensure artifacts directory exists
      await this.ensureArtifactsDir();
      
      // Parse package.json files
      await this.parsePackages();
      
      // Build dependency graph
      await this.buildDependencyGraph();
      
      // Check for circular dependencies
      await this.checkCircularDependencies();
      
      // Generate Graphviz DOT file
      await this.generateDotFile();
      
      // Convert to SVG
      await this.convertToSvg();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Dependency graph generation failed:', error.message);
      process.exit(1);
    }
  }

  async ensureArtifactsDir() {
    if (!existsSync(this.artifactsDir)) {
      await execAsync(`mkdir -p ${this.artifactsDir}`);
      log('success', '✓ Created .artifacts directory');
    }
  }

  async parsePackages() {
    log('info', '🔍 Parsing package.json files...');
    
    // Parse root package.json
    const rootPackage = await this.parsePackageJson(join(rootDir, 'package.json'));
    if (rootPackage) {
      this.packages.set('root', rootPackage);
    }
    
    // Parse packages/*/package.json
    const packagesDir = join(rootDir, 'packages');
    if (existsSync(packagesDir)) {
      const packageDirs = await this.getDirectories(packagesDir);
      for (const packageDir of packageDirs) {
        const packageJsonPath = join(packagesDir, packageDir, 'package.json');
        const packageJson = await this.parsePackageJson(packageJsonPath);
        if (packageJson) {
          this.packages.set(packageDir, packageJson);
        }
      }
    }
    
    // Parse apps/*/package.json
    const appsDir = join(rootDir, 'apps');
    if (existsSync(appsDir)) {
      const appDirs = await this.getDirectories(appsDir);
      for (const appDir of appDirs) {
        const packageJsonPath = join(appsDir, appDir, 'package.json');
        const packageJson = await this.parsePackageJson(packageJsonPath);
        if (packageJson) {
          this.packages.set(appDir, packageJson);
        }
      }
    }
    
    log('success', `✓ Parsed ${this.packages.size} package.json files`);
  }

  async parsePackageJson(filePath) {
    if (!existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const packageJson = JSON.parse(content);
      return {
        name: packageJson.name,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        peerDependencies: packageJson.peerDependencies || {}
      };
    } catch (error) {
      log('warn', `⚠️  Failed to parse ${filePath}: ${error.message}`);
      return null;
    }
  }

  async getDirectories(dirPath) {
    try {
      const { stdout } = await execAsync(`ls -d ${dirPath}/*/ | xargs -I {} basename {}`);
      return stdout.trim().split('\n').filter(dir => dir);
    } catch (error) {
      return [];
    }
  }

  async buildDependencyGraph() {
    log('info', '🔗 Building dependency graph...');
    
    for (const [packageName, packageJson] of this.packages) {
      const deps = new Set();
      
      // Add dependencies
      for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
        if (this.packages.has(depName)) {
          deps.add(depName);
        }
      }
      
      // Add devDependencies
      for (const [depName, depVersion] of Object.entries(packageJson.devDependencies)) {
        if (this.packages.has(depName)) {
          deps.add(depName);
        }
      }
      
      // Add peerDependencies
      for (const [depName, depVersion] of Object.entries(packageJson.peerDependencies)) {
        if (this.packages.has(depName)) {
          deps.add(depName);
        }
      }
      
      this.dependencies.set(packageName, Array.from(deps));
    }
    
    log('success', '✓ Dependency graph built');
  }

  async checkCircularDependencies() {
    log('info', '🔄 Checking for circular dependencies...');
    
    for (const [packageName] of this.packages) {
      const visited = new Set();
      const recursionStack = new Set();
      
      if (this.hasCircularDependency(packageName, visited, recursionStack, [])) {
        // Circular dependency found
      }
    }
    
    if (this.circularDeps.length > 0) {
      log('error', `❌ Found ${this.circularDeps.length} circular dependencies`);
    } else {
      log('success', '✓ No circular dependencies found');
    }
  }

  hasCircularDependency(packageName, visited, recursionStack, path) {
    if (recursionStack.has(packageName)) {
      const cycleStart = path.indexOf(packageName);
      const cycle = path.slice(cycleStart).concat(packageName);
      this.circularDeps.push(cycle);
      return true;
    }
    
    if (visited.has(packageName)) {
      return false;
    }
    
    visited.add(packageName);
    recursionStack.add(packageName);
    path.push(packageName);
    
    const deps = this.dependencies.get(packageName) || [];
    for (const dep of deps) {
      if (this.hasCircularDependency(dep, visited, recursionStack, [...path])) {
        return true;
      }
    }
    
    recursionStack.delete(packageName);
    return false;
  }

  async generateDotFile() {
    log('info', '📝 Generating Graphviz DOT file...');
    
    const dotContent = this.generateDotContent();
    const dotPath = join(this.artifactsDir, 'deps-graph.dot');
    writeFileSync(dotPath, dotContent);
    
    log('success', '✓ DOT file generated');
  }

  generateDotContent() {
    let dot = 'digraph Dependencies {\n';
    dot += '  rankdir=TB;\n';
    dot += '  node [shape=box, style=filled, fontname="Arial", fontsize=10];\n';
    dot += '  edge [fontname="Arial", fontsize=8];\n\n';
    
    // Define node colors
    const colors = {
      root: '#e1f5fe',
      app: '#f3e5f5',
      package: '#e8f5e8',
      circular: '#ffebee'
    };
    
    // Add nodes
    for (const [packageName, packageJson] of this.packages) {
      let color = colors.package;
      if (packageName === 'root') {
        color = colors.root;
      } else if (packageName.startsWith('app-') || packageName.includes('app')) {
        color = colors.app;
      }
      
      // Check if package is part of a circular dependency
      const isCircular = this.circularDeps.some(cycle => cycle.includes(packageName));
      if (isCircular) {
        color = colors.circular;
      }
      
      dot += `  "${packageName}" [fillcolor="${color}", label="${packageName}"];\n`;
    }
    
    dot += '\n';
    
    // Add edges
    for (const [packageName, deps] of this.dependencies) {
      for (const dep of deps) {
        const isCircular = this.circularDeps.some(cycle => 
          cycle.includes(packageName) && cycle.includes(dep)
        );
        
        if (isCircular) {
          dot += `  "${packageName}" -> "${dep}" [color=red, penwidth=2];\n`;
        } else {
          dot += `  "${packageName}" -> "${dep}" [color=gray];\n`;
        }
      }
    }
    
    dot += '}\n';
    return dot;
  }

  async convertToSvg() {
    log('info', '🎨 Converting to SVG...');
    
    try {
      // Check if graphviz is installed
      await execAsync('which dot');
      
      const dotPath = join(this.artifactsDir, 'deps-graph.dot');
      const svgPath = join(this.artifactsDir, 'deps-graph.svg');
      
      await execAsync(`dot -Tsvg ${dotPath} -o ${svgPath}`);
      
      log('success', '✓ SVG generated');
    } catch (error) {
      log('warn', '⚠️  Graphviz not found, skipping SVG generation');
      log('info', 'Install graphviz with: apt-get install graphviz (Ubuntu) or brew install graphviz (macOS)');
    }
  }

  generateReport() {
    log('info', '\n📊 Dependency Graph Report');
    log('info', '==========================');
    
    // Package count
    log('info', `📦 Packages: ${this.packages.size}`);
    
    // Dependency count
    const totalDeps = Array.from(this.dependencies.values()).reduce((sum, deps) => sum + deps.length, 0);
    log('info', `🔗 Dependencies: ${totalDeps}`);
    
    // Circular dependencies
    if (this.circularDeps.length > 0) {
      log('error', '\n🔄 Circular Dependencies:');
      this.circularDeps.forEach((cycle, index) => {
        log('error', `  ${index + 1}. ${cycle.join(' → ')}`);
      });
    } else {
      log('success', '\n✅ No circular dependencies');
    }
    
    // Top dependencies
    const depCounts = new Map();
    for (const deps of this.dependencies.values()) {
      for (const dep of deps) {
        depCounts.set(dep, (depCounts.get(dep) || 0) + 1);
      }
    }
    
    const topDeps = Array.from(depCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (topDeps.length > 0) {
      log('info', '\n📈 Most Dependend Upon:');
      topDeps.forEach(([dep, count]) => {
        log('info', `  • ${dep}: ${count} dependents`);
      });
    }
    
    // Summary
    if (this.circularDeps.length > 0) {
      log('error', '\n💥 Dependency graph has circular dependencies!');
      process.exit(1);
    } else {
      log('success', '\n🎉 Dependency graph is healthy!');
      process.exit(0);
    }
  }
}

// Start dependency graph generation
const generator = new DependencyGraphGenerator();
generator.generate().catch(error => {
  log('error', 'Fatal error during dependency graph generation:', error.message);
  process.exit(1);
});