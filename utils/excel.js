const { Transform } = require('stream');

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
    }

    _transform(chunk, encoding, callback) {
        const chunkStr = chunk.toString();
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
        this.push(pushStr);
        callback();
    }
}
/* eslint no-underscore-dangle: 0 */

exports.excelSafeStringTransform = (chunkStr, truncLength = 32700) => {
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
};
// excelSafeStringTransform('1,2,3,4,"555555555555",6,7,8,9', 5)
// excelSafeStringTransform('1,2,3,4,"5\\"55555555",6,7,8,9', 5)
exports.ExcelSafeStreamTransform = ExcelSafeStreamTransform;
