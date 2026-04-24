export function getVsixFilename(version) {
    if (typeof version !== 'string' || version.trim() === '') {
        throw new Error('A package version is required to build the VSIX filename.');
    }

    return `SlashCoded-VSCode-Extension.${version}.vsix`;
}
