/**
 * Unit Testing Suite: College ERP
 * Tests core standalone service functions, validators, and utility modules.
 */
const assert = require('assert');
const { calculateGrade, calculatePercentage } = require('../../backend/src/services/gradeService');
const { ALLOWED_MIME_TYPES, validateMagicBytes, generateSafeFileName } = require('../../backend/src/middleware/uploadMiddleware');

console.log('=======================================================');
console.log('   COLLEGE ERP - UNIT TEST SUITE');
console.log('=======================================================\n');

let passed = 0;
let total = 0;

function test(description, fn) {
    total++;
    try {
        fn();
        console.log(`  [PASS] ${description}`);
        passed++;
    } catch (err) {
        console.error(`  [FAIL] ${description} -> ${err.message}`);
    }
}

// 1. Grade Service Unit Tests
test('Grade Calculator assigns A+ for >= 90%', () => {
    const grade = calculateGrade(95, 100);
    const pct = calculatePercentage(95, 100);
    assert.strictEqual(grade, 'A+');
    assert.strictEqual(pct, 95);
});

test('Grade Calculator assigns A for >= 80% and < 90%', () => {
    const grade = calculateGrade(85, 100);
    assert.strictEqual(grade, 'A');
});

test('Grade Calculator assigns F for < 40%', () => {
    const grade = calculateGrade(35, 100);
    assert.strictEqual(grade, 'F');
});

// 2. Upload Middleware Unit Tests
test('Allowed MIME Types whitelist contains safe formats', () => {
    assert.ok(ALLOWED_MIME_TYPES['image/png']);
    assert.ok(ALLOWED_MIME_TYPES['image/jpeg']);
    assert.ok(ALLOWED_MIME_TYPES['application/pdf']);
    assert.strictEqual(ALLOWED_MIME_TYPES['application/x-msdownload'], undefined);
});

test('Magic Byte Validator validates PNG signatures', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    assert.ok(validateMagicBytes(pngHeader, 'image/png'));
});

test('Magic Byte Validator rejects invalid signatures', () => {
    const fakeHeader = Buffer.from('FAKE_FILE_HEADER_TEXT');
    assert.strictEqual(validateMagicBytes(fakeHeader, 'image/png'), false);
});

test('Safe filename generator generates randomized names without directory traversal', () => {
    const filename = generateSafeFileName('image/png');
    assert.ok(!filename.includes('..'));
    assert.ok(!filename.includes('/'));
    assert.ok(!filename.includes('\\'));
    assert.ok(filename.endsWith('.png'));
});

console.log('\n=======================================================');
console.log(`Unit Tests Result: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
console.log('=======================================================\n');

if (passed !== total) {
    process.exit(1);
}
