const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('google_script_update.js', 'utf8');
try {
    new vm.Script(code);
    console.log('Syntax OK');
} catch (e) {
    console.error(e.message);
    console.error(e.stack);
    process.exit(1);
}
