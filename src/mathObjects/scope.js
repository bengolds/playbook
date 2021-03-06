  class Scope {
    constructor(variables = [], functions = []) {
      this.variables = variables;
      this.pinnedVariables = [];
      this.functions = functions;
    }

    get freeVariables() {
      return this.variables.filter( (variable) => {
        return this.isFree(variable.name);
      }).sort(Variable.compare);
    }

    getForMathJS() {
      let ret = {};
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