  class Scope {
    constructor(variables = [], functions = []) {
      this.variables = variables;
      this.pinnedVariables = [];
      //TODO: Rename this to Functors
      this.functions = functions;
      this._loadedFunctions = {};
    }

    get freeVariables() {
      return this.variables.filter( (variable) => {
        return this.isFree(variable.name);
      }).sort(Variable.compare);
    }

    get allFunctionNames() {
      return this.functions.map((functor) => {
        return functor.name;
      });
    }

    getForMathJS() {
      let ret = Object.assign({}, this._loadedFunctions);
      for (let pinned of this.pinnedVariables) {
        ret[pinned.variable.name] = pinned.value; 
      }
      return ret;
    }

    hasVariable(name) {
      return this.variables.some( (variable) => {
        return variable.name === name;
      });
    }

    indexOfVar(name) {
      return this.variables.findIndex( (variable) => {
        return variable.name === name;
      });
    }

    indexOfFreeVar(name) {
      return this.freeVariables.findIndex( (free) => {
        return free.name === name;
      });
    }

    indexOfPinnedVar(name) {
      return this.pinnedVariables.findIndex( (pinned) => {
        return pinned.variable.name === name;
      });
    }

    indexOfFunction(name) {
      return this.functions.findIndex( (f) => {
        return f.name === name;
      });
    }

    isPinned(name) {
      return this.indexOfPinnedVar(name) != -1;
    }

    isFree(name) {
      return !this.isPinned(name);
    }

    isFunction(name) {
      return this.indexOfFunction(name) != -1;
    }

    getVariable(name) {
      return this.variables.find( (variable) => {
        return name === variable.name;
      });
    }

    clone() {
      //TODO: Make sure functions are loaded into new scope
      let newScope = new Scope();
      //Variables themselves are copied by reference
      newScope.variables = this.variables.slice();
      for (let pinned of this.pinnedVariables) {
        let copyPinned = {};
        copyPinned.variable = pinned.variable;
        copyPinned.range = Object.assign({}, pinned.range);
        copyPinned.value = pinned.value;
        newScope.pinnedVariables.push(copyPinned);
      }
      for(let func of this.functions) {
        newScope.functions.push(Object.assign({}, func));
      }
      return newScope;
    }

}