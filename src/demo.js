import {circuitRun, circuitRunT, circuitRunNT} from "./index.js";

/**
 * 中间件函数的this将与circuitRunNt保持一致
 * circuitRun的入参可以是Function、 GeneratorFunction、 AsyncGeneratorFunction 和 Object
 * circuitRun返回一个Function，其会返回一个Promise，resolve的值的tailRes字段即为洋葱心的返回。调用这个函数，入参将会是第一个middleware的入参
 */
 circuitRunNT.call({a:1},func1, {preprocessor:func4Pre, afterprocessor:func4After},func3)(1,2,3)
 .then(res=>{console.log("all done", res)});

 
/**
 * 中间件
 * @param {MiddlewareContext} ctx 储存了一些上下文信息，比如有没有中断，洋葱心的返回值等等
 * @param {GeneratorFunction} next 
 * @param {GeneratorFunction} terminate 中断函数
 * @param  {...any} args 入参，这个入参是上一层中间件调用next函数的入参
 */
async function* func1(ctx,next, terminate,...args){
    console.log("1 h",ctx, args ,this);
    // yield terminate();
    await new Promise(res=>{
        setTimeout(() => {
            res();
        }, 100);
    });
    yield next(...args);
    // yield terminate({et:true});
    await new Promise(res=>{
        setTimeout(() => {
            res();
        }, 100);
    });
    console.log("1 e", ctx.tailRes);
}
function* func2(ctx,next, terminate,...args){
    console.log("2 h",...args,this);
    // yield terminate();

    yield next(...args);
    // yield terminate();


    console.log("2 e", ctx.tailRes);
    return "done in func2";
}
async function* func3(_, next, terminate,...args){
    console.log("3",...args,this);
    // yield terminate();
    return new Promise(res=>{
        setTimeout(() => {
            res("==done==")
        }, 100);
    })
}
/**
 * 
 * 中间件
 * @param {MiddlewareContext} ctx 储存了一些上下文信息，比如有没有中断，洋葱心的返回值等等
 * @param {GeneratorFunction} next 
 * @param {GeneratorFunction} terminate 中断函数
 * @param  {...any} args 入参，这个入参是上一层中间件调用next函数的入参
 * @returns {any} 这里的返回将成为下一层middle的入参
 */
function func4Pre(ctx,next, terminate,...args){
    //  terminate();
    console.log("4 h",...args,this);
    return "ret in func4 pre";
}
function func4After(ctx,next, terminate,...args){
    // terminate();
    console.log("4 e",...args,this);
    return "ret in func4 after";
}

