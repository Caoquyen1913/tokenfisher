// Prints a long jest-like log with one failure, for end-to-end checks of the hook.
for (let i = 0; i < 300; i++) console.log(`  ✓ renders item ${i} (${i % 7} ms)`);
console.log('  ● Cart › applies discount\n\n    Expected: 90\n    Received: 100\n\n      at Object.<anonymous> (src/cart.test.js:42:23)');
for (let i = 0; i < 200; i++) console.log(`  ✓ another passing test ${i}`);
console.log('Tests:       1 failed, 500 passed, 501 total');
