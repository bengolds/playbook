SETS = {
  NATURAL: 0,
  INTEGER: 1,
  REAL: 2,
  COMPLEX: 3
};

class Variable {
  constructor(name, set=SETS.REAL) {
    this.name = name;
    this.set = set;
  }
}