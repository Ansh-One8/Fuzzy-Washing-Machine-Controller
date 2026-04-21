export interface MembershipFunction {
  name: string;
  points: [number, number, number] | [number, number, number, number]; // [a, b, c] for triangular, [a, b, c, d] for trapezoidal
  type: 'triangular' | 'trapezoidal';
}

export interface FuzzyVariable {
  name: string;
  unit: string;
  range: [number, number];
  membershipFunctions: MembershipFunction[];
}

export interface Rule {
  id: string;
  if: {
    variable: string;
    is: string;
  }[];
  operator: 'AND' | 'OR';
  then: {
    variable: string;
    is: string;
  };
}

export interface RuleActivation {
  ruleId: string;
  activation: number;
}
