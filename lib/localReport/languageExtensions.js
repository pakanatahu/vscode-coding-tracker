//@ts-check

const path = require('path');

const LANGUAGE_BY_EXTENSION = Object.freeze({
    '.astro': 'Astro',
    '.bat': 'Batch',
    '.blade.php': 'Blade',
    '.c': 'C',
    '.cc': 'C++',
    '.clj': 'Clojure',
    '.cljs': 'ClojureScript',
    '.cmake': 'CMake',
    '.coffee': 'CoffeeScript',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.cshtml': 'Razor',
    '.csproj': 'C# Project',
    '.css': 'CSS',
    '.csv': 'CSV',
    '.cxx': 'C++',
    '.dart': 'Dart',
    '.dockerfile': 'Docker',
    '.ejs': 'EJS',
    '.elm': 'Elm',
    '.erl': 'Erlang',
    '.ex': 'Elixir',
    '.exs': 'Elixir',
    '.fs': 'F#',
    '.fsi': 'F#',
    '.fsx': 'F#',
    '.go': 'Go',
    '.graphql': 'GraphQL',
    '.groovy': 'Groovy',
    '.h': 'C/C++ Header',
    '.handlebars': 'Handlebars',
    '.hbs': 'Handlebars',
    '.hpp': 'C++ Header',
    '.hrl': 'Erlang',
    '.html': 'HTML',
    '.ini': 'INI',
    '.java': 'Java',
    '.jl': 'Julia',
    '.js': 'JavaScript',
    '.json': 'JSON',
    '.jsonc': 'JSONC',
    '.jsx': 'JavaScript React',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin',
    '.less': 'Less',
    '.lua': 'Lua',
    '.m': 'Objective-C',
    '.md': 'Markdown',
    '.mdx': 'MDX',
    '.mm': 'Objective-C++',
    '.php': 'PHP',
    '.pl': 'Perl',
    '.prisma': 'Prisma',
    '.ps1': 'PowerShell',
    '.psd1': 'PowerShell',
    '.psm1': 'PowerShell',
    '.py': 'Python',
    '.r': 'R',
    '.razor': 'Razor',
    '.rb': 'Ruby',
    '.rs': 'Rust',
    '.sass': 'Sass',
    '.scala': 'Scala',
    '.scss': 'SCSS',
    '.sh': 'Shell',
    '.sln': 'Visual Studio Solution',
    '.sql': 'SQL',
    '.svelte': 'Svelte',
    '.swift': 'Swift',
    '.tf': 'Terraform',
    '.tfvars': 'Terraform',
    '.toml': 'TOML',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.twig': 'Twig',
    '.vb': 'Visual Basic',
    '.vue': 'Vue',
    '.xml': 'XML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.zig': 'Zig'
});

const LANGUAGE_BY_FILENAME = Object.freeze({
    '.env': 'Environment',
    'cmakelists.txt': 'CMake',
    'dockerfile': 'Docker',
    'jenkinsfile': 'Jenkins',
    'makefile': 'Makefile'
});

const LANGUAGE_NAME_ALIASES = Object.freeze({
    astro: 'Astro',
    bat: 'Batch',
    batch: 'Batch',
    c: 'C',
    clojure: 'Clojure',
    cmake: 'CMake',
    coffee: 'CoffeeScript',
    coffeescript: 'CoffeeScript',
    cpp: 'C++',
    csharp: 'C#',
    'c#': 'C#',
    css: 'CSS',
    csv: 'CSV',
    dart: 'Dart',
    docker: 'Docker',
    dockerfile: 'Docker',
    elixir: 'Elixir',
    elm: 'Elm',
    erl: 'Erlang',
    erlang: 'Erlang',
    fsharp: 'F#',
    'f#': 'F#',
    go: 'Go',
    graphql: 'GraphQL',
    groovy: 'Groovy',
    handlebars: 'Handlebars',
    html: 'HTML',
    ini: 'INI',
    java: 'Java',
    javascript: 'JavaScript',
    javascriptreact: 'JavaScript React',
    js: 'JavaScript',
    json: 'JSON',
    jsonc: 'JSONC',
    jsx: 'JavaScript React',
    julia: 'Julia',
    kotlin: 'Kotlin',
    less: 'Less',
    lua: 'Lua',
    makefile: 'Makefile',
    markdown: 'Markdown',
    mdx: 'MDX',
    objectivec: 'Objective-C',
    objectivecpp: 'Objective-C++',
    perl: 'Perl',
    php: 'PHP',
    plaintext: '',
    powershell: 'PowerShell',
    prisma: 'Prisma',
    python: 'Python',
    r: 'R',
    razor: 'Razor',
    ruby: 'Ruby',
    rust: 'Rust',
    sass: 'Sass',
    scala: 'Scala',
    scss: 'SCSS',
    shellscript: 'Shell',
    sql: 'SQL',
    svelte: 'Svelte',
    swift: 'Swift',
    terraform: 'Terraform',
    toml: 'TOML',
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    twig: 'Twig',
    typescript: 'TypeScript',
    typescriptreact: 'TypeScript React',
    vb: 'Visual Basic',
    vue: 'Vue',
    xml: 'XML',
    yaml: 'YAML',
    yml: 'YAML',
    zig: 'Zig'
});

const EXCLUDED_FILENAMES = new Set([
    'package-lock.json',
    'npm-shrinkwrap.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'gemfile.lock',
    'cargo.lock',
    'poetry.lock',
    'pipfile.lock'
]);

const EXCLUDED_EXTENSIONS = new Set([
    '.chat',
    '.lock',
    '.log',
    '.map'
]);

function normalizeLanguageName(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return '';
    const normalized = text.toLowerCase().replace(/[\s_-]+/g, '');
    if (Object.prototype.hasOwnProperty.call(LANGUAGE_NAME_ALIASES, normalized)) {
        return LANGUAGE_NAME_ALIASES[normalized];
    }
    return text;
}

function languageFromFile(file) {
    const text = typeof file === 'string' ? file.trim() : '';
    if (!text) return '';
    const basename = path.basename(text).toLowerCase();
    if (!basename || EXCLUDED_FILENAMES.has(basename)) return '';
    if (LANGUAGE_BY_FILENAME[basename]) return LANGUAGE_BY_FILENAME[basename];

    const multiPartExtension = findMultiPartExtension(basename);
    if (multiPartExtension) return LANGUAGE_BY_EXTENSION[multiPartExtension];

    const ext = path.extname(basename).toLowerCase();
    if (!ext || EXCLUDED_EXTENSIONS.has(ext)) return '';
    return LANGUAGE_BY_EXTENSION[ext] || '';
}

function findMultiPartExtension(basename) {
    const matches = Object.keys(LANGUAGE_BY_EXTENSION)
        .filter(ext => ext.includes('.', 1) && basename.endsWith(ext))
        .sort((left, right) => right.length - left.length);
    return matches[0] || '';
}

module.exports = {
    LANGUAGE_BY_EXTENSION,
    LANGUAGE_NAME_ALIASES,
    languageFromFile,
    normalizeLanguageName
};
