const { EOL } = require('os');
const rdl = require('readline');
const stdout = process.stdout;
const stdin = process.stdin;

/**
 * @typedef {Object} SelectOptions
 * @property {string} text
 * @property {string[] | Record<string, any>} options
 * @property {string} [pointer=">"]
 * @property {string} [color="blue"]
 */

/**
 * @param {SelectOptions} options
 */
function select(options) {
  const instance = new Select(options);

  return instance.execute();
}

/**
 * @property {string} text
 * @property {Record<string, any>} options
 * @property {string[]} optionsText
 * @property {string} pointer
 * @property {string} color
 * @property {number} input
 * @property {Object} listener
 * @property {Function} listener.resolve
 */
class Select {
  static colors = {
    yellow: [ 33, 89 ],
    blue: [ 34, 89 ],
    green: [ 32, 89 ],
    cyan: [ 35, 89 ],
    red: [ 31, 89 ],
    magenta: [ 36, 89 ],
  };

  /** @param {SelectOptions} init */
  constructor(init) {
    this.parseInit(init);

    this.selected = 0;
    this.listener = {
      resolve: undefined,
    };

    this.handleInput = this.handleInput.bind(this);
  }

  /** @param {SelectOptions} init */
  parseInit(init) {
    if (!init.text)
      throw new Error('"text" property should be specified');

    this.text = init.text;

    if (!init.options)
      throw new Error('"options" property should be specified');

    this.pointer = init.pointer?.trim() ?? '>';
    this.color = init.color ?? 'blue';

    if (Array.isArray(init.options)) {
      this.optionsText = init.options;
      this.options = {};

      for (let i = 0; i < init.options.length; i++) {
        this.options[init.options[i]] = i;
      }
    } else {
      this.options = init.options;
      this.optionsText = Object.keys(this.options);
    }
  }

  /** @return {Promise<string | null>} */
  execute() {
    this.print();
    this.setSelected(0);

    stdin.setEncoding('utf-8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', this.handleInput);

    this.hideCursor();

    const listener = this.listener;

    return new Promise((resolve) => listener.resolve = resolve);
  }

  handleInput(value) {
    switch (value) {
      case '\u0004': // Ctrl-d
      case '\r':
      case '\n':
      case EOL:
        return this.select();
      case '\u0003': // Ctrl-c
        return this.quit();
      case '\u001b[A':
        return this.goUp();
      case '\u001b[B':
        return this.goDown();
    }
  }

  select() {
    this.respond(this.options[this.optionsText[this.selected]]);
  }

  quit() {
    this.respond(null);
  }

  goUp() {
    if (this.selected === 0) {
      this.setSelected(this.optionsText.length - 1);
    } else {
      this.setSelected(this.selected - 1);
    }
  }

  goDown() {
    if (this.selected === this.optionsText.length - 1) {
      this.setSelected(0);
    } else {
      this.setSelected(this.selected + 1);
    }
  }

  print() {
    this.write(this.text + EOL);

    for (const option of this.optionsText) {
      this.writeOption(option + EOL);
    }

    this.moveCursor(-this.optionsText.length);
  }

  respond(value) {
    stdin.removeListener('data', this.handleInput);
    stdin.setRawMode(false);
    stdin.pause();

    this.moveCursor(this.optionsText.length - this.selected);
    this.showCursor();

    this.listener.resolve(value);
    this.listener.resolve = undefined;
  }


  setSelected(value) {
    const prev = this.selected;
    const cur = value;

    this.writeOption(this.optionsText[prev]);

    this.moveCursor(cur - prev);
    this.writeOption(this.optionsText[cur], true);

    this.selected = cur;
  }

  writeOption(option, isSelected = false) {
    const pointer = this.pointer ? this.pointer + ' ' : '';
    this.write(pointer + option, isSelected);
  }

  write(buffer, isSelected = false) {
    rdl.clearLine(stdout, 0);
    stdout.write(isSelected ? this.wrapColor(buffer) : buffer);
    this.returnCursor();
  }

  wrapColor(str) {
    const color = Select.colors[this.color];
    const start = '\x1b[' + color[0] + 'm';
    const stop = '\x1b[' + color[1] + 'm\x1b[0m';
    return start + str + stop;
  }

  returnCursor() {
    rdl.cursorTo(stdout, 0);
  }

  moveCursor(value) {
    rdl.moveCursor(stdout, 0, value);
  }

  hideCursor() {
    stdout.write('\x1B[?25l');
  }

  showCursor() {
    stdout.write('\x1B[?25h');
  }
}

module.exports = { select, Select };
