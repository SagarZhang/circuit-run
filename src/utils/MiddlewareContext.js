export default class MiddlewareContext{
    _errorInfo = null;
    _payload = null;
    _tailRes = null;
    _earlyTerminatedInfo = null;
    constructor(payload, errorInfo=null){
        this._errorInfo = errorInfo;
        this._payload = payload;
    }
    get errorInfo(){
        return this._errorInfo;
    }
    get payload(){
        return this._payload;
    }
    get tailRes(){
        return this._tailRes;
    }
    get earlyTerminatedInfo(){
        return this._earlyTerminatedInfo;
    }
    set payload(v){
        this._payload = v;
    }
    set errorInfo(e){
        this._errorInfo = e;
    }
    set tailRes(v){
        this._tailRes = v;
    }
    set earlyTerminatedInfo(v){
        this._earlyTerminatedInfo = v;
    }
}