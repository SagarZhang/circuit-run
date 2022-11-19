
export class EarlyTerminateError extends Error{
    constructor(...args){
        super(...args);
        this.name = EarlyTerminateError.name;
    }
}