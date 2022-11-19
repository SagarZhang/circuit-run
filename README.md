# circuit-run

#### 介绍
`circuit-run`是一个和`co`库或者`koa`的洋葱模型有着类似功能的开源代码，和他们不同的是，`circuit-run`提供了中断功能。也就是说，当某一个中间件出现问题想要终止整个流程的时候，可以使用`circuit-run`的`terminate`函数来终止洋葱模型的进行。当然，`circuit-run`是可以在浏览器运行的，其并不依赖于`node.js`环境。

此外，在细节方面，`circuit-run`还可以按照洋葱模型的执行顺序传递数据，这在某些场景下也是非常有用的。

#### 示例

```javascript
import {circuitRun, circuitRunT, circuitRunNT} from "circuit-run";

/**
 * 中间件函数的this将与circuitRunNt保持一致
 * circuitRun的入参可以是Function、 GeneratorFunction、 AsyncGeneratorFunction 和 Object
 * circuitRun返回一个Function，其会返回一个Promise，resolve的值的tailRes字段即为洋葱心的返回。调用这个函数，入参将会是第一个middleware的入参
 */
 circuitRunNT.call({a:1},func1, {preprocessor:func2Pre, afterprocessor:func2After},func3)(1,2,3)
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
    //可以在执行中中断整个流程进行
    // yield terminate();
    await new Promise(res=>{
        setTimeout(() => {
            res();
        }, 100);
    });
    yield next(...args);
    //在next后也可以中断
    // yield terminate({et:true});
    await new Promise(res=>{
        setTimeout(() => {
            res();
        }, 100);
    });
    console.log("1 e", ctx.tailRes);
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
function func2Pre(ctx,next, terminate,...args){
    //对于非generator函数，直接terminate也可中断流程
    //  terminate();
    console.log("2 h",...args,this);
    return "ret in func4 pre";
}
function func2After(ctx,next, terminate,...args){
    // terminate();
    console.log("2 e",...args,this);
    return "ret in func4 after";
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


```