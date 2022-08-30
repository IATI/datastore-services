import { Readable } from 'stream';

const BOM = '\ufeff';

/* eslint no-underscore-dangle: ["error", { "allow": ["_read"] }] */
class ConcatStream extends Readable {
    constructor() {
        super();
        this.streams = [];
    }

    append(stream) {
        if (this.streams.length === 0) {
            this.stream = stream;
        }
        this.streams.push(stream);
        stream.on('end', this.onEnd.bind(this));
        stream.on('error', this.onError.bind(this));
    }

    _read(size) {
        const passRead = () => {
            let content = this.stream.read(size);
            while (content != null) {
                this.push(content);
                content = this.stream.read(size);
            }
            if (this.stream.listenerCount('readable') >= 2) {
                this.stream.removeListener('readable', passRead);
            }
        };
        this.stream.on('readable', passRead);
    }

    onEnd() {
        this.streams[0].removeAllListeners('end');
        this.streams.shift();
        if (this.streams.length === 0) {
            this.push(null);
        } else {
            [this.stream] = this.streams;
            this._read();
        }
    }

    onError(e) {
        this.emit('error', e);
        this.onEnd();
    }
}
/* eslint no-underscore-dangle: 0 */

const prependBOM = (stream) => {
    const concat = new ConcatStream();
    const readableBOM = Readable.from([BOM]);
    concat.append(readableBOM);
    concat.append(stream);
    return concat;
};

export { BOM, prependBOM };
