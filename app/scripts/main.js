/* eslint-env browser */
/* eslint no-labels: 0, no-loop-func: 0, no-constant-condition: 0, no-unused-vars: 0, no-alert: 0, no-console: 0, no-case-declarations: 0 */
(function() {
  'use strict';
  let board;
  let turn;

  const State = {
    INVALID: 0,
    EMPTY: 1,
    RED: 2,
    GREEN: 3,
    BLUE: 4
  };
  const Direction = {
    UPPER_LEFT: 0,
    LOWER_RIGHT: 1,
    LEFT: 2,
    RIGHT: 3,
    LOWER_LEFT: 4,
    UPPER_RIGHT: 5
  };
  const INITIAL_STATE = [
    [null, null, null, State.GREEN, State.BLUE, State.EMPTY, State.BLUE, State.RED],
    [null, State.GREEN, State.EMPTY, State.EMPTY, State.EMPTY, State.EMPTY, State.EMPTY, State.RED],
    [State.RED, State.EMPTY, State.EMPTY, State.EMPTY, State.EMPTY, State.EMPTY, State.GREEN, null],
    [State.RED, State.BLUE, State.EMPTY, State.BLUE, State.GREEN, null, null, null]
  ];

  class Board {
    constructor(size) {
      const svg = document.getElementById('board-shape');
      svg.innerHTML = '';
      document.getElementById('board').setAttribute('viewBox', '0 ' + size + ' ' + (2 * size * Math.sqrt(3)) + ' ' + (4 * size));
      this.size = size;
      this.data = new Array(size * 2);
      for (let y = 0; y < this.data.length; y++) {
        this.data[y] = new Array(size * 4);
        for (let x = 0; x < this.data[y].length; x++) {
          const d = 2 * y + x;
          if (2 * size - 1 > d || d > 6 * size - 2) {
            this.data[y][x] = State.INVALID;
            continue;
          }
          this.data[y][x] = State.EMPTY;

          // board generation
          const yBase = 2 * y + Math.floor(x / 2);
          const xBase1 = Math.floor(x / 2) * Math.sqrt(3);
          const xBase2 = Math.floor(x / 2 + 1) * Math.sqrt(3);
          svg.insertAdjacentHTML('beforeend',
            '<polygon id="' + y + '-' + x + '" points="' +
            xBase2 + ',' + (yBase + 1) + ' ' +
            xBase1 + ',' + (yBase + 2) + ' ' +
            (x % 2 === 0 ?
              xBase1 + ' ' + yBase :
              xBase2 + ' ' + (yBase + 3)) +
            '" stroke-width=".025"></polygon>'
          );
          cell(x, y).addEventListener('mouseenter', () => {
            let cc;
            switch (player()) {
              case State.RED:
                cc = '#ff8494';
                break;
              case State.GREEN:
                cc = '#68e4bb';
                break;
              case State.BLUE:
                cc = '#6e92dd';
                break;
              default:
                throw new Error();
            }
            const targets = this.getReplacables(x, y, player());
            for (let p of targets) {
              fill(...p, cc);
            }
          }, false);
          cell(x, y).addEventListener('mouseleave', () => {
            flush();
          }, false);
        }
      }
      for (let y = 0; y < INITIAL_STATE.length; y++) {
        for (let x = 0; x < INITIAL_STATE[y].length; x++) {
          if (INITIAL_STATE[y][x]) {
            this.putForcibly(x + 2 * (size - 2), y + (size - 2), INITIAL_STATE[y][x]);
          }
        }
      }
    }

    getReplacables(x, y, color) {
      if (this.at(x, y) === State.EMPTY) {
        const ds = this.getAvailableDirections(x, y, color);
        if (ds.length === 0) {
          return [];
        }
        const placed = [[x, y]];
        outer: for (let d of ds) {
          let c = [x, y];
          while (true) {
            c = Board.next(c[0], c[1], d);
            if (this.at(c[0], c[1]) === color) {
              continue outer;
            }
            placed.push([c[0], c[1]]);
          }
        }
        return placed;
      }
      return [];
    }

    put(x, y, color) {
      const p = this.getReplacables(x, y, color);
      if (p.length === 0) {
        return false;
      }
      for (let c of p) {
        this.putForcibly(...c, color);
      }
      return true;
    }

    putForcibly(x, y, color) {
      this.data[y][x] = color;
    }

    at(x, y) {
      if (x < 0 || y < 0 || x >= this.size * 4 || y >= this.size * 2) {
        return State.INVALID;
      }
      return this.data[y][x];
    }

    getAvailableDirections(x, y, color) {
      if (this.at(x, y) !== State.EMPTY) {
        return [];
      }
      let result = [];
      outer: for (let d of Object.values(Direction)) {
        let c = [x, y];
        let valid = false;
        while (true) {
          c = Board.next(c[0], c[1], d);
          const s = this.at(...c);
          if (s === color) {
            if (valid) {
              result.push(d);
            }
            continue outer;
          } else if (s === State.EMPTY || s === State.INVALID) {
            continue outer;
          } else {
            valid = true;
          }
        }
      }
      return result;
    }

    isAvailable(x, y, color) {
      return this.getAvailableDirections(x, y, color).length > 0;
    }

    getAvailables(color) {
      const result = [];
      for (let y = 0; y < this.data.length; y++) {
        for (let x = 0; x < this.data[y].length; x++) {
          if (this.isAvailable(x, y, color)) {
            result.push([x, y]);
          }
        }
      }
      return result;
    }

    count(color) {
      let c = 0;
      for (let y = 0; y < this.data.length; y++) {
        for (let x = 0; x < this.data[y].length; x++) {
          if (this.at(x, y) === color) {
            c++;
          }
        }
      }
      return c;
    }

    getWhoWon() {
      const r = this.count(State.RED);
      const g = this.count(State.GREEN);
      const b = this.count(State.BLUE);
      if (r >= g && r >= b) {
        return State.RED;
      }
      return g >= b ? State.GREEN : State.BLUE;
    }

    static next(x, y, direction) {
      switch (direction) {
        case Direction.UPPER_LEFT:
          return [x + (x % 2 === 0 ? 1 : -1), y - (x % 2 === 0 ? 1 : 0)];
        case Direction.LOWER_RIGHT:
          return [x + (x % 2 === 0 ? 1 : -1), y + (x % 2 === 0 ? 0 : 1)];
        case Direction.LEFT:
          return [x - 1, y];
        case Direction.RIGHT:
          return [x + 1, y];
        case Direction.LOWER_LEFT:
          return [x - 1, y + (x % 2 === 0 ? 0 : 1)];
        case Direction.UPPER_RIGHT:
          return [x + 1, y - (x % 2 === 0 ? 1 : 0)];
        default:
          throw new Error();
      }
    }
  }

  function cell(x, y) {
    const cell = document.getElementById(y + '-' + x);
    if (cell === null) {
      console.log(x + ',' + y);
    }
    return cell;
  }

  function scoreboard(color) {
    switch (color) {
      case State.RED:
        return document.getElementById('red');
      case State.GREEN:
        return document.getElementById('green');
      case State.BLUE:
        return document.getElementById('blue');
      default:
        throw new Error();
    }
  }

  function fill(x, y, color) {
    cell(x, y).setAttribute('fill', color);
  }

  function player() {
    switch (turn % 3) {
      case 0:
        return State.RED;
      case 1:
        return State.GREEN;
      case 2:
        return State.BLUE;
      default:
        throw new Error();
    }
  }

  function flush() {
    let possible = false;
    for (let y = 0; y < board.size * 2; y++) {
      for (let x = 0; x < board.size * 4; x++) {
        switch (board.at(x, y)) {
          case State.INVALID:
            continue;
          case State.EMPTY:
            const p = board.getReplacables(x, y, player());
            if (p.length === 0) {
              fill(x, y, '#adadad');
            } else {
              fill(x, y, '#f8fbf8');
              possible = true;
            }
            break;
          case State.RED:
            fill(x, y, '#e95464');
            break;
          case State.GREEN:
            fill(x, y, '#38b48b');
            break;
          case State.BLUE:
            fill(x, y, '#3e62ad');
            break;
          default:
            throw new Error();
        }
      }
    }
    for (let color of [State.RED, State.GREEN, State.BLUE]) {
      scoreboard(color).innerText = board.count(color);
      if (player() === color) {
        scoreboard(color).classList.add('player');
      } else {
        scoreboard(color).classList.remove('player');
      }
    }
    return possible;
  }

  function put(x, y) {
    if (board.put(x, y, player())) {
      next(0);
    }
  }

  function next(stack) {
    if (stack >= 3) {
      flush();
      if (confirm('試合が終了しました。次の試合を開始します。')) {
        init();
      }
    } else {
      turn++;
      if (!flush()) {
        next(stack + 1);
      }
    }
  }

  function init() {
    const size = Math.max(2, parseInt(location.hash.substr(1), 10)) || 4;
    board = new Board(size);
    turn = 0;
    for (let y = 0; y < board.size * 2; y++) {
      for (let x = 0; x < board.size * 4; x++) {
        if (board.at(x, y) !== State.INVALID) {
          cell(x, y).onclick = () => put(x, y);
        }
      }
    }
    flush();
  }
  init();
})();
