export class UnknownTerminatedError extends Error{
    constructor(...args){
        super(...args);
        this.name = UnknownTerminatedError.name;
    }
}