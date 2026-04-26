const test = require('node:test');
const assert = require('node:assert/strict');

const {
    languageFromFile,
    normalizeLanguageName
} = require('../lib/localReport/languageExtensions');

test('languageFromFile maps common source files to display languages', () => {
    assert.equal(languageFromFile('src/app.py'), 'Python');
    assert.equal(languageFromFile('src/main.go'), 'Go');
    assert.equal(languageFromFile('src/lib.rs'), 'Rust');
    assert.equal(languageFromFile('src/App.vue'), 'Vue');
    assert.equal(languageFromFile('src/App.svelte'), 'Svelte');
    assert.equal(languageFromFile('src/app.tsx'), 'TypeScript React');
    assert.equal(languageFromFile('src/project.csproj'), 'C# Project');
});

test('languageFromFile maps special extensionless filenames', () => {
    assert.equal(languageFromFile('Dockerfile'), 'Docker');
    assert.equal(languageFromFile('/repo/Makefile'), 'Makefile');
    assert.equal(languageFromFile('/repo/Jenkinsfile'), 'Jenkins');
});

test('languageFromFile excludes noisy non-language files', () => {
    assert.equal(languageFromFile('session.chat'), '');
    assert.equal(languageFromFile('debug.log'), '');
    assert.equal(languageFromFile('package-lock.json'), '');
    assert.equal(languageFromFile('README'), '');
    assert.equal(languageFromFile(''), '');
});

test('normalizeLanguageName maps VS Code language ids to display labels', () => {
    assert.equal(normalizeLanguageName('typescriptreact'), 'TypeScript React');
    assert.equal(normalizeLanguageName('csharp'), 'C#');
    assert.equal(normalizeLanguageName('dockerfile'), 'Docker');
    assert.equal(normalizeLanguageName('powershell'), 'PowerShell');
    assert.equal(normalizeLanguageName('plaintext'), '');
});
