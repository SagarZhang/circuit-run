
export class MultiCallError extends Error{
    constructor(...args){
        super(...args);
        this.name = MultiCallError.name;
    }
}