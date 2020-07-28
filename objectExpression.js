"use strict";

function Const(value) {
    this.value = value;
}
Const.ZERO = new Const(0);
Const.ONE = new Const(1);
Const.TWO = new Const(2);
Const.E = new Const(Math.E);
Const.prototype.evaluate = function () {
    return this.value;
};
Const.prototype.diff = function () {
    return Const.ZERO;
};
Const.prototype.toString = Const.prototype.prefix = function () {
    return this.value.toString();
};
Const.prototype.toString = Const.prototype.postfix = function () {
    return this.value.toString();
};
Const.prototype.simplify = function () {
    return this;
};

const INDEX_VARIABLES = {
    'x': 0,
    'y': 1,
    'z': 2
};

function Variable(letter) {
    this.letter = letter;
    this.index = INDEX_VARIABLES[letter];
}

Variable.prototype.evaluate = function(...args) {
    return args[this.index];
};

let isEqualsConst = (a, value) => (a instanceof Const) & a.value === value;
let isZero = (a) => isEqualsConst(a, 0);

Variable.prototype.diff = function(letter) {
    return this.letter === letter ? Const.ONE : Const.ZERO;
};


Variable.prototype.toString = Variable.prototype.prefix = Variable.prototype.postfix = function () {
    return this.letter;
};
Variable.prototype.toString = Variable.prototype.postfix = function () {
    return this.letter;
};

Variable.prototype.simplify = function () {
    return this;
};

let AbstractOperation = function () {};

AbstractOperation.prototype.evaluate = function(...args) {
    return this.comp(...this.elems.map(arg => arg.evaluate(...args)));
};

AbstractOperation.prototype.diff = function(name) {
    return this.dif(name, ...this.elems);
};

AbstractOperation.prototype.toString = function() {
    return this.elems.join(" ") + " " + this.name;
};
AbstractOperation.prototype.prefix = function() {
    return "(" + this.name + " " + this.elems.map(arg => arg.prefix()).join(" ") + ")";
};
AbstractOperation.prototype.postfix = function() {
    return "(" + this.elems.map(arg => arg.postfix()).join(" ") + " " + this.name + ")";
};

AbstractOperation.prototype.simplify = function() {
    let args = this.elems.map(arg => arg.simplify());
    if (args.reduce((res, arg) => (arg instanceof Const) ? res: res + 1, 0) === 0) {
        return new Const(this.comp(...args.map(arg => arg.evaluate())));
    } else {
        return this.simpl(...args);
    }
};

let isOne = (a) => isEqualsConst(a, 1);
function createOperation(comp, name, dif, simpl) {
    let result = function (...args) {
        this.elems = args;
    };
    result.prototype = Object.create(AbstractOperation.prototype);
    result.prototype.constructor = AbstractOperation;
    result.prototype.name = name;
    result.prototype.dif = dif;
    result.prototype.simpl = simpl;
    result.prototype.comp = comp;
    result.arity = comp.length;
    return result;
}

let Add = createOperation((a, b) => a + b, "+", (name, x, y) => new Add(x.diff(name), y.diff(name)),
    function (a, b) {
        if (isZero(a)) {
            return b;
        }
        if (isZero(b)) {
            return a;
        }
        this.elems = [a, b];
        return this;
    });

let Subtract = createOperation((a, b) => a - b, "-",
    (name, x, y) => new Subtract(x.diff(name), y.diff(name)),
    function (a, b) {
        if (isZero(a)) {
            return new Negate(b);
        }
        if (isZero(b)) {
            return a;
        }
        this.elems = [a, b];
        return this;
    });

let Multiply = createOperation((a, b) => a * b, "*",
    (name, x, y) => new Add(new Multiply(x.diff(name), y), new Multiply(x, y.diff(name))),
    function (a, b) {
        if (isZero(a) || isZero(b)) {
            return Const.ZERO;
        }
        if (isOne(a)) {
            return b;
        }
        if (isOne(b)) {
            return a;
        }
        this.elems = [a, b];
        return this;
    });

let Divide = createOperation((a, b) => a / b, "/",
    (name, x, y) => new Divide(new Subtract(new Multiply(x.diff(name), y),
        new Multiply(x, y.diff(name))), new Multiply(y, y)),
    function (a, b) {
        if (isZero(a)) {
            return Const.ZERO;
        }
        if (isOne(b)) {
            return a;
        }
        this.elems = [a, b];
        return this;
    });

let Negate = createOperation(a => -a, "negate", (name, x) => new Negate(x.diff(name)),
    function (a) {
        if (isZero(a)) {
            return Const.ZERO;
        }
        this.elems = [a];
        return this;
    });

let Sinh = createOperation(Math.sinh, "sinh", (name, x) => new Multiply(new Cosh(x), x.diff(name)),
    function (a) {
        if (isZero(a)) {
            return Const.ZERO;
        }
        this.elems = [a];
        return this;
    });

let Cosh = createOperation(Math.cosh, "cosh", (name, x) => new Multiply(new Sinh(x), x.diff(name)),
    function (a) {
        if (isZero(a)) {
            return Const.ZERO;
        }
        this.elems = [a];
        return this;
    });

let Power = createOperation((a, b) => Math.pow(a, b), "pow",
    function(name, x, y) { return new Add(new Multiply(new Multiply(new Power(x,
        new Subtract(y, Const.ONE)), y), x.diff(name)),
        new Multiply(new Multiply(this, y.diff(name)), new Log(Const.E, x)))},
    function (a, b) {
        if (isZero(a)) {
            return Const.ZERO;
        }
        if (isOne(a)) {
            return Const.ONE;
        }
        if (isZero(b)) {
            return Const.ONE;
        }
        this.elems = [a, b];
        return this;
    });

let Log = createOperation((a, b) => Math.log(Math.abs(b)) / Math.log(Math.abs(a)), "log",
    (name, x, y) => new Divide(new Ln(y), new Ln(x)).diff(name),
    function (a, b) {
        if (isOne(b)) {
            return Const.ONE;
        }
        this.elems = [a, b];
        return this;
    });

function sumexpDer(name, ...args) {
    return args.reduce((acc, val) => new Add(acc, new Multiply(new Sumexp(val), val.diff(name))), Const.ZERO);
}
let Ln = createOperation((a) => Math.log(Math.abs(a)), "",
    (name, x) => new Divide(x.diff(name), x),
    function (a) {
        this.elems = [a];
        return this;
});

const Sumexp = createOperation((...args) => args.reduce((a, b) => (a + Math.exp(b)), 0), "sumexp",
    sumexpDer);

const Softmax = createOperation(function (...args) {
    return Math.exp(args[0]) / args.reduce((a, b) => (a + Math.exp(b)), 0);}, "softmax",
    function (name, ...args) {
        let first = new Sumexp(args[0]);
        let sumExp = new Sumexp(...args);
        // second = new Sumexp(args[0]) / sumexp;
        return new Divide(new Subtract(
            new Multiply(sumExp, new Multiply(first, args[0].diff(name))),
            new Multiply(first, sumexpDer(name, ...args))), new Multiply(sumExp, sumExp));
    });

const x = new Variable('x');
const y = new Variable('y');
const z = new Variable('z');

const VARIABLES = {
    'x': x,
    'y': y,
    'z': z
};
const OPERATIONS = {
    '+' : Add,
    '-' : Subtract,
    '*' : Multiply,
    '/' : Divide,
    'negate': Negate,
    'sumexp' : Sumexp,
    'softmax' : Softmax,
    'pow' : Power,
    'log' : Log,
    'ln' : Ln,
    'sinh' : Sinh,
    'cosh' : Cosh
};
function parse(expression) {
    let expressions = expression.split(' ').filter(word => word.length > 0);
    let stack = [];
    expressions.map(cur => {
        if (cur in OPERATIONS) {
            const Operation= OPERATIONS[cur];
            stack.push(new Operation(...stack.splice(-OPERATIONS[cur].arity)));
        } else if (cur in VARIABLES){
            stack.push(VARIABLES[cur]);
        } else {
            stack.push(new Const(Number(cur)));
        }
    });
    return stack.pop();
}

let xpr = new Add(new Variable('x'), new Const(2));
console.log(xpr.postfix());

ParsingException.prototype = Error.prototype;

function ParsingException(message) {
    this.message = message;
    this.name = "ParsingException";
}

const parser = (isPrefix) => {
    let source, cur_position;
    function skipWhiteSpace() {
        while (cur_position < source.length && /\s/.test(getChar())) {
            cur_position++;
        }
    }
    
    function isEnd() {
        return cur_position === source.length;
    }
    function test(c) {
        return source.charAt(cur_position) === c;
    }
    function testSkip(c) {
        let res = test(c);
        if (res) {
            newChar();
        }
        skipWhiteSpace();
        return res;
    }
    function isDigit(ch) {
        return /\d/.test(ch);
    }

    function getChar() {
        return source.charAt(cur_position);
    }
    function newChar() {
        cur_position++;
    }
    
    function testString(s) {
        if (source.length < cur_position + s.length) {
            return false;
        }
        let end = cur_position + s.length;
        return source.substr(cur_position, s.length) === s && (source.length === end || !isDigit(source[end]) && !isAlpha(source[end]));
    }
    function MyError(expected) {
        throw new ParsingException("On position " + cur_position + ": expected " + expected + ", found \""
        + (!isEnd() ? getChar() : "")+ "\"\n" + printSource());
    }

    function printSource() {
        return source + ' <----- Input\n' + "_".repeat(cur_position) + "^error" + '\n';
    }

    function isAlpha(c) {
        return /[A-Za-z]/.test(c);
    }

    function skip(cnt) {
        cur_position += cnt;
        skipWhiteSpace();
    }
    function parseArgs(cntArgs) {
        let args = [];
        for (let i = 0; i < cntArgs || cntArgs === 0; i++) {
            if (test(")")) {
                break;
            }
            let flag = getOperation(false);
            if (!isPrefix && flag) {
                break;
            }
            if (flag) {
                MyError("argument");
            }
            args.push(parseStore());
            skipWhiteSpace();
        }
        return args;
    }

    function parseStore() {
        skipWhiteSpace();
        return test("(") ? parseExpression() : parseArg();
    }

    function parseExpression() {
        skipWhiteSpace();
        if (!testSkip("(")) {
            MyError("opening brackets");
        }
        let oper, cntArgs, args;
        if (isPrefix) {
            oper = getOperation(true);
            args = parseArgs(OPERATIONS[oper].arity);
        } else {
            args = parseArgs();
            oper = getOperation(true);
        }
        cntArgs = OPERATIONS[oper].arity;
        if (args.length !== cntArgs && cntArgs > 0) {
            throw new ParsingException("On cur_position " + cur_position
            + ": Illegal number of arguments for operation(" + oper + "): "
            + args.length + " " + '\n' + printSource());
        }
        if (!testSkip(")")) {
            MyError("closing brackets");
        }
        return new OPERATIONS[oper](...args);
    }

    function getOperation(needOper) {
        skipWhiteSpace();
        let result;
        let flag = false;
        for (const oper in OPERATIONS) {
            if (testString(oper)) {
                result = oper;
                flag = true;
                break;
            }
        }
        if (needOper) {
            !flag ? MyError("operator") : skip(result.length);
            return result;
        } else {
            return flag;
        }
    }

    function parseVariable() {
        skipWhiteSpace();
        for (const ch in VARIABLES) {
            if (testString(ch)) {
                skip(ch.length);
                return ch;
            }
        }
        MyError("variable");
    }
    function parseArg() {
        if (test("-") || isDigit(getChar())) {
            return parseNumber();
        } else {
            return new Variable(parseVariable());
        }
    }

    function parseNumber() {
        let minus = testSkip("-");
        let number = "";
        while (isDigit(getChar())) {
            number += getChar();
            newChar();
        }
        skipWhiteSpace();
        if (number.length === 0) {
            MyError("number");
        }
        return new Const(Number.parseFloat((minus ? "-" : "")  + number));
    }

    function parse(expression) {
        source = expression;
        cur_position = 0;
        skipWhiteSpace();
        if (source.length === 0) {
            throw new ParsingException("empty source");
        }
        let result = parseStore();
        if (!isEnd()) {
            MyError("end of expression");
        }
        return result;
    }
    return parse;
};
const parsePrefix = parser(true);
const parsePostfix = parser(false);

console.log(parsePrefix(('(sumexp x)')));