//@ts-check

const isDebugMode = process.env.SLASHCODED_DEBUG === '1';

module.exports = {
	isDebugMode,

	prefix: 'slashcoded',
	outputChannelName: 'SlashCoded',
};

