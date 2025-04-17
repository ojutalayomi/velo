// Regex for matching URLs
// Matches strings that start with "http://" or "https://", followed by any non-whitespace characters.
// - `https?`: Matches "http" optionally followed by "s" (to match both "http" and "https").
// - `:\/\/`: Matches "://" literally.
// - `[^\s]+`: Matches one or more characters that are not whitespace.
// - `g`: Global flag to match all occurrences in the input string.
export const urlRegex = /(https?:\/\/[^\s]+)/g;

// Regex for matching hashtags
// Matches strings that start with "#" followed by alphanumeric characters or underscores.
// - `#`: Matches the "#" character literally.
// - `[a-zA-Z0-9_]`: Matches any letter (uppercase or lowercase), digit, or underscore.
// - `+`: Matches one or more of the preceding character set.
// - `g`: Global flag to match all occurrences in the input string.
export const hashTagRegex = /#[a-zA-Z0-9_]+/g;

// Regex for matching emojis
// Matches strings that are enclosed in colons (e.g., ":smile:").
// - `:`: Matches the colon character literally.
// - `[a-zA-Z0-9_]`: Matches any letter (uppercase or lowercase), digit, or underscore.
// - `+`: Matches one or more of the preceding character set.
// - `:`: Matches the closing colon character literally.
// - `g`: Global flag to match all occurrences in the input string.
export const emojiRegex = /:[a-zA-Z0-9_]+:/g;

// Regex for matching emojis with custom names
// This is identical to `emojiRegex` and matches the same pattern as above.
export const customEmojiRegex = /:[a-zA-Z0-9_]+:/g;

// Regex for matching custom emojis
// Matches Discord-style custom emoji syntax (e.g., `<:emoji_name:123456789>` or `<a:emoji_name:123456789>`).
// - `<a?`: Matches "<" followed optionally by "a" (to account for animated emojis).
// - `:(\w+)`: Matches ":" followed by one or more word characters (letters, digits, or underscores) and captures it as group 1 (emoji name).
// - `:(\d+)>`: Matches ":" followed by one or more digits (emoji ID) and captures it as group 2.
// - `g`: Global flag to match all occurrences in the input string.
export const customEmojiRegex2 = /<a?:(\w+):(\d+)>/g;

// Regex for matching custom emojis with IDs
// This is identical to `customEmojiRegex2` and matches the same pattern as above.
export const customEmojiRegex3 = /<a?:(\w+):(\d+)>/g;

// Regex for matching mentions
// Matches strings that start with "@" followed by alphanumeric characters or underscores.
// - `\B`: Asserts that the "@" is not preceded by a word boundary (e.g., not part of an email address).
// - `@`: Matches the "@" character literally.
// - `[a-zA-Z0-9_]`: Matches any letter (uppercase or lowercase), digit, or underscore.
// - `+`: Matches one or more of the preceding character set.
// - `\b`: Asserts a word boundary at the end of the mention.
// - `g`: Global flag to match all occurrences in the input string.
export const mentionRegex = /\B@[a-zA-Z0-9_]+\b/g;