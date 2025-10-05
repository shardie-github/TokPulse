import { Project, SyntaxKind } from 'ts-morph';
const project = new Project({ skipAddingFilesFromTsConfig: true });
const globs = process.argv.slice(2);
if (globs.length === 0) { console.error('Usage: node codemods/standardize-logging.mjs "src/**/*.ts"'); process.exit(1); }
for (const g of globs) project.addSourceFilesAtPaths(g);
for (const f of project.getSourceFiles()) {
  const hasLogger = f.getText().includes("from 'pino'");
  if (!hasLogger) {
    f.insertStatements(0, "import pino from 'pino';\nexport const log = pino({ level: process.env.LOG_LEVEL || 'info' });\n");
  }
  f.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
      const t = node.getText();
      if (/console\.(log|error|warn|info)/.test(t)) { node.replaceWithText(t.replace('console', 'log')); }
    }
  });
}
project.save().then(()=>console.log('✅ Logging standardized'));
