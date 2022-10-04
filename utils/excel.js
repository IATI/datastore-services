import { Transform } from 'stream';
import { detect } from 'chardet';

const findEncoding = (chunk) => {
    const mapping = {
        'UTF-8': 'utf8',
        'UTF-16BE': 'unsupported_by_buffers',
        'UTF-16LE': 'utf16le',
        'UTF-32BE': 'unsupported_by_buffers',
        'UTF-32LE': 'unsupported_by_buffers',
        Shift_JIS: 'unsupported_by_buffers',
        'ISO-2022-JP': 'unsupported_by_buffers',
        'ISO-2022-CN': 'unsupported_by_buffers',
        'ISO-2022-KR': 'unsupported_by_buffers',
        GB18030: 'unsupported_by_buffers',
        Big5: 'unsupported_by_buffers',
        'EUC-JP': 'unsupported_by_buffers',
        'EUC-KR': 'unsupported_by_buffers',
        'ISO-8859-1': 'latin1',
        'ISO-8859-2': 'latin1', // Technically unsupported, but next best alternative
        'ISO-8859-5': 'latin1', // Technically unsupported, but next best alternative
        'ISO-8859-6': 'latin1', // Technically unsupported, but next best alternative
        'ISO-8859-7': 'latin1', // Technically unsupported, but next best alternative
        'ISO-8859-8': 'latin1', // Technically unsupported, but next best alternative
        'ISO-8859-9': 'latin1', // Technically unsupported, but next best alternative
        'windows-1250': 'latin1', // Technically unsupported, but next best alternative
        'windows-1251': 'latin1', // Technically unsupported, but next best alternative
        'windows-1252': 'latin1',
        'windows-1253': 'latin1', // Technically unsupported, but next best alternative
        'windows-1254': 'latin1', // Technically unsupported, but next best alternative
        'windows-1255': 'latin1', // Technically unsupported, but next best alternative
        'windows-1256': 'latin1', // Technically unsupported, but next best alternative
        'KOI8-R': 'unsupported_by_buffers',
        IBM420: 'unsupported_by_buffers',
        IBM424: 'unsupported_by_buffers',
    };
    const encodingGuess = detect(chunk);
    const encodingMapping = mapping[encodingGuess];
    if (encodingMapping === 'unsupported_by_buffers') {
        return 'utf8'; // To avoid breakages
    }
    return encodingMapping;
};

/* eslint no-underscore-dangle: ["error", { "allow": ["_transform"] }] */
class ExcelSafeStreamTransform extends Transform {
    constructor() {
        super();
        this.sep = ',';
        this.newLine = '\n';
        this.escapeChar = '\\';
        this.encapsulator = '"';
        this.encapsulated = false;
        this.escaped = false;
        this.currentCellLen = 0;
        this.truncLength = 32700;
        this.defaultEncoding = 'utf-8';
    }

    _transform(chunk, encoding, callback) {
        let chunkStr = '';
        let chunkEncoding = this.defaultEncoding;
        if (encoding === 'buffer') {
            chunkStr = chunk.toString(chunkEncoding);
            if (chunkStr.includes('�')) {
                chunkEncoding = findEncoding(chunk);
                chunkStr = chunk.toString(chunkEncoding);
            }
        } else {
            chunkEncoding = encoding;
            chunkStr = chunk;
        }
        let pushStr = '';
        for (let i = 0; i < chunkStr.length; i += 1) {
            const currentChar = chunkStr.charAt(i);

            // If the current cell is a normal length
            if (this.currentCellLen < this.truncLength) {
                // Add the current character to the return string
                pushStr += currentChar;
                // Increment measured cell length by one
                this.currentCellLen += 1;
            } else {
                // If the currently detected cell is too long, ignore the subsequent characters
                // unless unencapsulated/unescaped sep, unencapsulated/unescaped newLine, or unescaped closing encapsulator
                if (!this.encapsulated && !this.escaped) {
                    if ([this.sep, this.newLine].includes(currentChar)) {
                        pushStr += currentChar;
                    }
                }
                if (this.encapsulated && !this.escaped) {
                    if (currentChar === this.encapsulator) {
                        pushStr += currentChar;
                    }
                }
            }
            // Logic to detected encapsulated and escaped states:

            // If the current state is not encapsulated
            // and the last character was not an escape
            // and the current character is an encapsulator, mark encapsulated
            // If the current state is encapsulated
            // and the last character was not an escape
            // and the last character is an encapsulator, mark unencapsulated
            if (currentChar === this.encapsulator) {
                if (!this.escaped) {
                    if (!this.encapsulated) {
                        this.encapsulated = true;
                    } else {
                        this.encapsulated = false;
                    }
                }
                // Logic to reset currentCellLen
            } else if ([this.sep, this.newLine].includes(currentChar)) {
                if (!this.encapsulated && !this.escaped) {
                    this.currentCellLen = 0;
                }
                // If current character is escape, and current status is unescaped, mark read as escaped
            } else if (currentChar === this.escapeChar) {
                if (!this.escaped) {
                    this.escaped = true;
                } else {
                    this.escaped = false;
                }
            }
            // Reset escaped status after every non-escape char or escaped escape
            if (currentChar !== this.escapeChar) {
                this.escaped = false;
            }
        }
        this.push(pushStr, chunkEncoding);
        callback();
    }
}
/* eslint no-underscore-dangle: 0 */

function excelSafeStringTransform(chunkStr, truncLength = 32700) {
    const sep = ',';
    const newLine = '\n';
    const escapeChar = '\\';
    const encapsulator = '"';
    let encapsulated = false;
    let escaped = false;
    let currentCellLen = 0;

    let pushStr = '';

    for (let i = 0; i < chunkStr.length; i += 1) {
        const currentChar = chunkStr.charAt(i);

        // If the current cell is a normal length
        if (currentCellLen < truncLength) {
            // Add the current character to the return string
            pushStr += currentChar;
            // Increment measured cell length by one
            currentCellLen += 1;
        } else {
            // If the currently detected cell is too long, ignore the subsequent characters
            // unless unencapsulated/unescaped sep, unencapsulated/unescaped newLine, or unescaped closing encapsulator
            if (!encapsulated && !escaped) {
                if ([sep, newLine].includes(currentChar)) {
                    pushStr += currentChar;
                }
            }
            if (encapsulated && !escaped) {
                if (currentChar === encapsulator) {
                    pushStr += currentChar;
                }
            }
        }
        // Logic to detected encapsulated and escaped states:

        // If the current state is not encapsulated
        // and the last character was not an escape
        // and the current character is an encapsulator, mark encapsulated
        // If the current state is encapsulated
        // and the last character was not an escape
        // and the last character is an encapsulator, mark unencapsulated
        if (currentChar === encapsulator) {
            if (!escaped) {
                if (!encapsulated) {
                    encapsulated = true;
                } else {
                    encapsulated = false;
                }
            }
            // Logic to reset currentCellLen
        } else if ([sep, newLine].includes(currentChar)) {
            if (!encapsulated && !escaped) {
                currentCellLen = 0;
            }
            // If current character is escape, and current status is unescaped, mark read as escaped
        } else if (currentChar === escapeChar) {
            if (!escaped) {
                escaped = true;
            } else {
                escaped = false;
            }
        }
        // Reset escaped status after every non-escape char or escaped escape
        if (currentChar !== escapeChar) {
            escaped = false;
        }
    }
    return pushStr;
}

export { excelSafeStringTransform, ExcelSafeStreamTransform };
