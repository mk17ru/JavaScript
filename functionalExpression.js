"use strict";

const INDEX_VARIABLES = {
    'x': 0,
    'y': 1,
    'z': 2
};
const variable = letter => {
    const ind = INDEX_VARIABLES[letter];
    return (...vars) => vars[ind];
};

const cnst = c => () => (c);

function abstract(oper) {
    return (...objs) => (...vs) =>
        oper(...objs.map(obj => obj(...vs)));
}

let add = abstract((f, s) => f + s);
let subtract = abstract((f, s) => f - s);
let sin = abstract(Math.sin);
let cos = abstract(Math.cos);
let cube = abstract((f) => Math.pow(f, 3));
let cuberoot = abstract((f) => Math.cbrt(f));
let multiply = abstract((f, s) => f * s);
let divide = abstract((f, s) => f / s);
let negate = abstract((f) => -f);
const abstrFun = (fun) => (...args) => args.reduce(fun);
let sum = abstrFun((accum, x) => accum + x);
let min = abstrFun((accum, x) => Math.min(accum, x));
let max = abstrFun((accum, x) => Math.max(accum, x));
let avg5 = abstract((...args) => args.reduce((x, y) => (x + y)) / args.length);
let med3 = abstract((...args) => args.sort((x, y) => (x - y))[Math.floor(args.length / 2)]);
/*let avg5 = abstract((...args) => sum(...args) / args.length;
let med3 = abstract((...args) => sum(...args) - min(...args) - max(...args);
*/

const pi = cnst(Math.PI);
const e = cnst(Math.E);

const x = variable('x');
const y = variable('y');
const z = variable('z');

const VARIABLES = {
    'x': x,
    'y': y,
    'z': z
};



const CONST = {
    'pi': pi,
    'e': e
};

const OPERATIONS = {
    '+' : {func: add, args: 2}, '-' : {func: subtract, args: 2},
    'cube' : {func: cube, args: 1}, 'cuberoot' : {func: cuberoot, args : 1}
    '*' : {func: multiply, args: 2}, '/' : {func: divide, args: 2},
    'max' : {func: max, args: Infinity},
    'negate': {func: negate, args: 1}, 'avg5' : {func: avg5, args: 5},
    'med3' : {func: med3, args: 3}, 'min' : {func: min, args: Infinity},
    'sin': {func: sin, args: 1}, 'cos': {func: cos, args: 1},

};

function parse(expression) {
    let expressions = expression.split(' ').filter(word => word.length > 0);
    let stack = [];
    expressions.map(cur => {
        if (cur in OPERATIONS) {
            const {func: operation, args: amount} = OPERATIONS[cur];
            stack.push(operation(...stack.splice(-amount)));
        } else if (cur in VARIABLES){
            stack.push(VARIABLES[cur]);
        } else if (cur in CONST) {
            stack.push(CONST[cur]);
        } else {
            stack.push(cnst(Number(cur)));
        }
    });
    return stack.pop();
}

for (let i = 0; i < 10; ++i) {
    console.log(parse("x x 2 - * x * 1 +")(i));
}
