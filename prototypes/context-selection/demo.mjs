import { syntheticIntegration } from './integration.mjs';
const args = process.argv.slice(2);
if (args.length > 2 || (args[0] && !['lexical', 'graph', 'combined'].includes(args[0]))) {
  console.error('Usage: node prototypes/context-selection/demo.mjs [lexical|graph|combined] [unknown|failure|invented-quote|outside-context|omitted]');
  process.exitCode = 2;
} else {
  try { console.log(JSON.stringify(syntheticIntegration({ mode: args[0] ?? 'combined', responseCase: args[1] ?? 'unknown' }), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
