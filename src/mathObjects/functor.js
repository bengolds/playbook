class Functor {
  constructor(name, scope) {
    this.name = name;
    this.scope = scope;
  } 

  get definition() {
    return this._definition;
  }
  set definition(val) {
    this._definition = val;
    //TODO: LOAD DEFINITION INTO SCOPE UNLESS THAT'S TOO UNWATCHABLE
  }

}