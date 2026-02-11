const fs = require('fs');
const code = fs.readFileSync('google_script_update.js', 'utf8');
let balance = 0;
let stack = [];
let lines = code.split('\n');
for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    let line = lines[lineNum];
    for (let char of line) {
        if (char === '{') {
            balance++;
            stack.push(lineNum + 1);
        } else if (char === '}') {
            balance--;
            if (stack.length > 0) stack.pop();
        }
    }
}
console.log('Balance:', balance);
console.log('Unclosed braces at start lines:', stack);
