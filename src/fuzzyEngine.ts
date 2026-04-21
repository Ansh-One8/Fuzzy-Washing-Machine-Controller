import { FuzzyVariable, MembershipFunction, Rule, RuleActivation } from './types';

export function getMembership(value: number, mf: MembershipFunction): number {
  const { points, type } = mf;
  
  if (type === 'triangular') {
    const [a, b, c] = points;
    if (value <= a || value >= c) return 0;
    if (value === b) return 1;
    if (value < b) return (value - a) / (b - a);
    return (c - value) / (c - b);
  } else {
    const [a, b, c, d] = points;
    if (value <= a || value >= d) return 0;
    if (value >= b && value <= c) return 1;
    if (value < b) return (value - a) / (b - a);
    return (d - value) / (d - c);
  }
}

export class FuzzyEngine {
  private variables: FuzzyVariable[];
  private rules: Rule[];

  constructor(variables: FuzzyVariable[], rules: Rule[]) {
    this.variables = variables;
    this.rules = rules;
  }

  // Evaluate a rule based on input membership values
  private evaluateRule(rule: Rule, inputs: Record<string, number>): number {
    const activations = rule.if.map(condition => {
      const variable = this.variables.find(v => v.name === condition.variable);
      if (!variable) return 0;
      const mf = variable.membershipFunctions.find(m => m.name === condition.is);
      if (!mf) return 0;
      return getMembership(inputs[variable.name], mf);
    });

    if (rule.operator === 'AND') {
      return Math.min(...activations);
    } else {
      return Math.max(...activations);
    }
  }

  // Defuzzification using Centroid Method
  public compute(inputs: Record<string, number>, outputVariableName: string): { 
    value: number, 
    ruleActivations: RuleActivation[],
    outputMfActivations: Record<string, number>
  } {
    const outputVar = this.variables.find(v => v.name === outputVariableName);
    if (!outputVar) throw new Error(`Output variable ${outputVariableName} not found`);

    const ruleActivations: RuleActivation[] = this.rules.map(rule => ({
      ruleId: rule.id,
      activation: this.evaluateRule(rule, inputs)
    }));

    // For Mamdani, we take the max activation for each output MF
    const outputMfActivations: Record<string, number> = {};
    outputVar.membershipFunctions.forEach(mf => {
      const relevantRules = this.rules.filter(r => r.then.is === mf.name);
      const activations = relevantRules.map(r => {
        const found = ruleActivations.find(ra => ra.ruleId === r.id);
        return found ? found.activation : 0;
      });
      outputMfActivations[mf.name] = Math.max(0, ...activations);
    });

    // Centroid calculation
    let totalArea = 0;
    let weightedSum = 0;
    const steps = 100;
    const [min, max] = outputVar.range;
    const stepSize = (max - min) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = min + i * stepSize;
      
      // Calculate aggregated membership at point x
      let aggregatedY = 0;
      outputVar.membershipFunctions.forEach(mf => {
        const y = getMembership(x, mf);
        const activation = outputMfActivations[mf.name];
        // Mamdani clipping (min of MF and rule activation)
        aggregatedY = Math.max(aggregatedY, Math.min(y, activation));
      });

      weightedSum += x * aggregatedY;
      totalArea += aggregatedY;
    }

    const value = totalArea === 0 ? (min + max) / 2 : weightedSum / totalArea;

    return { value, ruleActivations, outputMfActivations };
  }
}
