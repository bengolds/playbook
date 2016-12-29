SETS = {
  NATURAL: 1,
  INTEGER: 2,
  REAL: 3,
  COMPLEX: 4
};

class Variable {
  constructor(name, set) {
    this.name = name;
    this.set = set;
  }
}