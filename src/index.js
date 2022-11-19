import MiddlewareContext from "./utils/MiddlewareContext.js";
import {
    MultiCallError,
    UnknownTerminatedError
}from "./throws/index.js";
import partial from "./utils/partial.js";
import {partialDeAsyncGenerator} from "./utils/partial.js";

export class TraceInfo{
    isTerminated=false;
    pos="init";
    idx=null;
    payload=null;
    isYield
    constructor(pti){
        this.idx = pti.idx;
        this.pos = pti.pos;
        this.payload = pti.payload;
        this.isTerminated = pti.isTerminated;
        this.isYield = pti.isYield;
    }
}

class PrivateTraceInfo extends TraceInfo{
    
    constructor(idx=null, pos="init", isYield=false, payload={}, isTerminated=true){
        super({
            idx,
            pos,
            isYield,
            payload,
            isTerminated
        })
    }
    
}
/**
 * 洋葱模型主函数
 * @param {Array<GeneratorFunction>} middleware 中间件
 * @returns {(Context, Function)*<T>=>T}
 * @throws {MultiCallError} 当重复执行的时候会抛出这个异常
 * @throws {UnknownTerminatedError} 出现未知中断的时候，会抛出这个异常（未知异常的意思是、、、按理说这个地方不会出现中断信号，但是中断了，就、、、咱也不知道咋回事，总是就先抛个异常吧）
 */
function compose(middleware){
    return function(ctx, isTerminateImmediate=false, ...initialArgs){
        let index = -1, isTerminated = false;
        let trace = new PrivateTraceInfo();
        let traces = [];
        let status = [], pc={idx:-1, pos:""};
        return dispatch.call(this,0, ...initialArgs);
        async function* dispatch(idx, ...args){
            //重复执行，抛出异常
            if(idx <= index) throw new MultiCallError;
            index = idx;
            let fn = middleware[idx];
            if(typeof fn !== "function" || idx === middleware.length){
                return fn;
            }
            if(isTerminated){
                throw new UnknownTerminatedError;
            }
            //生成generator
            let ret = fn.call(this, ctx, dispatch.bind(this, idx+1), terminate, ...args);
            //运行preprocessor
            let preprocesorRes = await invokeProc(ret, "preprocess", idx);
            if(
                preprocesorRes?.done //洋葱模型最中心，且这个中心没有yield
                || status[idx]?.isTerminated //本次中断
                || (isTerminated && isTerminateImmediate) //立即中断发生
            ){
                return ctx;
            }

            if(preprocesorRes.value?.next){

                //执行next(即 dispatch)的generator
                // let chainRes = await preprocesorRes.value.next();
                // if(chainRes instanceof Promise) chainRes = await chainRes;
                // let chainValue = await chainRes?.value;
                // if(chainValue instanceof Promise) chainValue = await chainValue;
                let chainRes = await invokeProc(preprocesorRes.value, "process", idx);
                if(
                    status[idx]?.isTerminated //本次中断
                    || (isTerminated && isTerminateImmediate) //立即中断发生
                ){
                    return ctx;
                }
                
            }else{
                throw `yield not existed! idx:${idx}`;
            }
            
            //执行afterprocess
            let afterprocessorRes = await invokeProc(ret, "afterprocess", idx);
            if(
                status[idx]?.isTerminated //本次中断
                || (isTerminated && isTerminateImmediate) //立即中断发生
            ){//terminated
                return ctx;
            }

            return ctx;
        }
        /**
         * 中间件调用这个函数会中断执行
         * @param {any} payload 在调用terminated的时候，可以传入一些信息，这些信息会储存在TraceInfo的payload字段中
         * @returns {TraceInfo}
         */
        function terminate(payload){
            // if(isTerminated){
            //     throw "function terminate can only be invoked once";
            // }
            status[pc.idx].isTerminated = true;
            isTerminated = true;
            trace.payload = payload;
            trace.isTerminated = true;
            let tmpTrace = new TraceInfo(trace);
            traces.push(tmpTrace);
            status[pc.idx].trace = tmpTrace;
            trace = new PrivateTraceInfo();
            return tmpTrace;
        }
        /**
         * 正常执行的情况将返回generator函数的返回；terminate返回{@link trace}
         * @param {GeneratorFunction | AsyncGeneratorFunction} generator 
         * @param {'afterprocess'|'process'|'preprocess'} pos 
         * @param {number} idx 
         * @returns 
         */
        async function invokeProc(generator, pos, idx){
            //已经终止了，那么就不运行了
            if(isTerminated && isTerminateImmediate){
                generator.return();
                return traces[traces.length-1];
            }
            if(status[idx]?.isTerminated){
                generator.return();
                return status[idx].trace;
            }
            trace.pos = pos;
            trace.idx = idx;
            pc.pos = pos;
            pc.idx = idx;
            status[idx] = {
                idx,//middleware序号
                isTerminated:false,//本次是否中断了
                trace:null//trace 信息（isTerminated时才有）
            };
            let res = await generator.next();
            if(middleware.length-1 === idx //middleware最中间
                && (pos==="afterprocess" || res.done)//preprocessor已执行完或者此次是afterprocessor
                && !(res.value instanceof TraceInfo)//正常返回或未使用yield调用terminate
                // && !isTerminated//未中断
            ){//洋葱心
                ctx.tailRes = await res?.value;
                generator.return();
            }else if(pos==="preprocess" && res.done){//另一种形式的洋葱心
                ctx.tailRes = await res?.value;
            }
            if(isTerminated){//中断了，可能是本次发生的；当本函数执行的是next函数时，terminate可能是由其他中间件发起
                //当设置了isTerminateImmediate，无论如何都无需继续下去了
                if(isTerminateImmediate || status[idx]?.isTerminated){
                    // return 本次generator
                    // 判断是不是由yield引起【仅当terminate发生在本次才执行】;如果不是yield引起的，假如value为generator，需要手动释放内存
                    // 设置context中的terminate信息
                    generator.return();
                    status[idx]?.isTerminated && !(status[idx].trace.isYield = res.value instanceof TraceInfo) && res?.value?.return?.();
                    // res?.value?.return && res.value.return();
                    ctx.earlyTerminatedInfo = traces;
                    return status[idx]?.trace || traces[trace.length-1];
                }

            }
            return res;
        }
    }
}

function isGenerator(f){
    return f?.constructor?.name?.includes?.("GeneratorFunction");
}


function checkGenerator(arr){
    for(let i = 0; i < arr.length; i++){
        if(!isGenerator(arr[i])){
            if(typeof arr[i] === "function"){
                arr[i] = func2Generator(arr[i]);
            }else if(typeof arr[i] === "object"){
                arr[i] = obj2Generator(arr[i]);
            }else{
                throw `unsupported middileware function type! [${typeof arr[i]}]`;
            }
        }
    }
    return arr;
}
/**
 * 将obj转换为AsyncGeneratorFunction
 * @param {{preprocessor?:Function, afterprocessor?:Function}} obj 
 * @returns {AsyncGeneratorFunction}
 */
function obj2Generator(obj){
    return async function*(ctx, next, terminate, ...args){
        let preprocessorRes = await obj.preprocessor?.apply?.(this, [...arguments]);
        if(preprocessorRes instanceof PrivateTraceInfo){//return terminate
            yield preprocessorRes
        }else if(preprocessorRes){
            yield next(preprocessorRes);
        }else{
            yield next(...args);
        }
        return obj.afterprocessor?.apply?.(this, [...arguments]);
    }
}
/**
 * 将function转换为GeneratorFunction
 * @param {Function} fn 
 * @returns {GeneratorFunction}
 */
function func2Generator(fn){
    return function*(){
        return fn.apply(this,[...arguments]);
    }
}

/**
 * 
 * @param {Boolean} isTerminateImmediate 洋葱模型是否直接中断而不执行已执行的后处理部分
 * @param  {...any} args 中间件函数们
 * @returns {Promise}
 */
export function circuitRun(isTerminateImmediate, ...args){
    args = checkGenerator(args);
    let ctx = new MiddlewareContext();
    let res = partialDeAsyncGenerator(compose([...args]), ctx, isTerminateImmediate);
    return res.bind(this);
}
/**
 * 当terminated的时候直接中断而不继续执行
 * @param  {...any} args 中间件函数们
 * @returns {Promise}
 */
export const circuitRunT = partial(circuitRun,true);
/**
 * 当terminated的时候继续执行剩下的后处理器，而未执行预处理器的generator function则不再继续执行
 * @param  {...any} args 中间件函数们
 * @returns {Promise}
 */
export const circuitRunNT = partial(circuitRun,false);

