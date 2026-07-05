// Test CommandParser logic for hidden files
console.log('Testing CommandParser path resolution for hidden files...\n');

// Simulate CommandParser._resolvePath method
function _resolvePath(target, p) {
    if (!target) return p ? p.cwd : '/';
    if (target.startsWith('/')) return target;
    if (target === '..') {
      const parts = (p ? p.cwd : '/').replace(/\/$/, '').split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    if (target === '.') return p ? p.cwd : '/';
    const cwd = p ? p.cwd : '/';
    return (cwd === '/' ? '' : cwd) + '/' + target;
}

// Test cases
const testCases = [
    { target: '.bloomd', cwd: '/usr/lib', expected: '/usr/lib/.bloomd' },
    { target: '.bloomd', cwd: '/usr/lib/', expected: '/usr/lib/.bloomd' },
    { target: './.bloomd', cwd: '/usr/lib', expected: '/usr/lib/.bloomd' },
    { target: '/usr/lib/.bloomd', cwd: '/tmp', expected: '/usr/lib/.bloomd' },
    { target: '.', cwd: '/usr/lib/.bloomd', expected: '/usr/lib/.bloomd' }, // This might be wrong
    { target: '..', cwd: '/usr/lib/.bloomd', expected: '/usr/lib' }, // This might be wrong
];

console.log('Path resolution tests:');
for (const test of testCases) {
    const p = { cwd: test.cwd };
    const result = _resolvePath(test.target, p);
    const status = result === test.expected ? '✓' : '✗';
    console.log(`${status} "${test.target}" from "${test.cwd}" -> "${result}" (expected: "${test.expected}")`);
}

console.log('\n\nTesting real-world scenarios:');
console.log('1. User is in /usr/lib, types "rm .bloomd":');
console.log('   _resolvePath(".bloomd", {cwd: "/usr/lib"}) ->', _resolvePath('.bloomd', {cwd: '/usr/lib'}));

console.log('\n2. User is in /usr/lib, types "rm ../lib/.bloomd":');
console.log('   _resolvePath("../lib/.bloomd", {cwd: "/usr/lib"}) ->', _resolvePath('../lib/.bloomd', {cwd: '/usr/lib'}));

console.log('\n3. User is in /, types "rm /usr/lib/.bloomd":');
console.log('   _resolvePath("/usr/lib/.bloomd", {cwd: "/"}) ->', _resolvePath('/usr/lib/.bloomd', {cwd: '/'}));

console.log('\n4. Issue scenario: User types "rm .bloomd" when .bloomd is not visible in ls (no -a flag)');
console.log('   The path resolution works, but the user might not see the file in ls output');

console.log('\n\nPotential issues found:');
console.log('1. The _resolvePath method handles paths with . and .. based on current directory.');
console.log('2. If cwd is "/usr/lib/.bloomd" (a file), then "." resolves to "/usr/lib/.bloomd" which is incorrect.');
console.log('3. If cwd is "/usr/lib/.bloomd", then ".." resolves to "/usr/lib" which is correct.');

// Test what happens when cwd is a file (shouldn't happen but let's check)
console.log('\n\nEdge case - cwd is a file:');
const p = { cwd: '/usr/lib/.bloomd' };
console.log('cwd: "/usr/lib/.bloomd" (a file, not a directory)');
console.log('_resolvePath(".", p) ->', _resolvePath('.', p));
console.log('_resolvePath("..", p) ->', _resolvePath('..', p));