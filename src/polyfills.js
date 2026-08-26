// Polyfills para compatibilidade do Node 18 com discord.js, discord.js-selfbot-v13 e undici

// 1. File API
if (typeof globalThis.File === 'undefined') {
    try {
        globalThis.File = require('node:buffer').File;
    } catch (_) {}
}

// 2. String.prototype.toWellFormed
if (typeof String.prototype.toWellFormed !== 'function') {
    String.prototype.toWellFormed = function () {
        return this.replace(
            /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
            '\uFFFD'
        );
    };
}

// 3. String.prototype.isWellFormed
if (typeof String.prototype.isWellFormed !== 'function') {
    String.prototype.isWellFormed = function () {
        return !/([\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(this);
    };
}

// 4. Array immutable methods (ES2023)
if (typeof Array.prototype.toReversed !== 'function') {
    Array.prototype.toReversed = function () {
        return [...this].reverse();
    };
}

if (typeof Array.prototype.toSorted !== 'function') {
    Array.prototype.toSorted = function (compareFn) {
        return [...this].sort(compareFn);
    };
}

if (typeof Array.prototype.toSpliced !== 'function') {
    Array.prototype.toSpliced = function (start, deleteCount, ...items) {
        const copy = [...this];
        copy.splice(start, deleteCount, ...items);
        return copy;
    };
}

if (typeof Array.prototype.with !== 'function') {
    Array.prototype.with = function (index, value) {
        const copy = [...this];
        const actualIndex = index < 0 ? copy.length + index : index;
        copy[actualIndex] = value;
        return copy;
    };
}

// 5. Object.groupBy
if (typeof Object.groupBy !== 'function') {
    Object.groupBy = function (items, callbackFn) {
        const result = {};
        let i = 0;
        for (const item of items) {
            const key = callbackFn(item, i++);
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(item);
        }
        return result;
    };
}
