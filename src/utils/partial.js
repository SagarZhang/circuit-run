export default function partial(fn, ...args){
    return function(){
        const newArgs = args.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, newArgs);
    }
}
/**
 * 
 * @param {AsyncConstructorFunction} fn 需要偏函数处理的function
 * @param  {...any} args 偏函数需要固定的参量
 * @returns {AsyncConstructorFunction}
 */
export function partialDeAsyncGenerator(fn, ...args){
    return function(){
        const newArgs = args.concat(Array.prototype.slice.call(arguments));
        return fn.apply(this, newArgs).next().then(res=>res?.value);
    }
}