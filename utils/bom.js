const { Readable } = require('stream');

const BOM = '\ufeff';

/* eslint no-underscore-dangle: ["error", { "allow": ["_read"] }] */
class ConcatStream extends Readable {
    constructor() {
        super();
        this.streams = [];
    }

    append(stream) {
        this.streams.push(stream);
        stream.on('end', this.onEnd.bind(this));
        stream.on('error', this.onError.bind(this));
    }

    _read(size) {
        const stream = this.streams[0];
        stream.on(
            'readable',
            () => {
                let content = stream.read(size);
                while (content != null) {
                    this.push(content);
                    content = stream.read(size);
                }
            }
        );
    }

    onEnd() {
        this.streams[0].removeAllListeners('end');
        this.streams.shift();
        if (this.streams.length === 0) {
            this.push(null);
        } else {
            this._read();
        }
    }

    onError(e) {
        this.emit('error', e);
        this.onEnd();
    }
}
/* eslint no-underscore-dangle: 0 */

exports.prependBOM = (stream) => {
    const concat = new ConcatStream();
    const readableBOM = Readable.from([BOM]);
    concat.append(readableBOM);
    concat.append(stream);
    return concat;
};

exports.BOM = BOM;
