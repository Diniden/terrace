import type { Fact } from '../types';

/**
 * Represents a stack of related Facts, with the top Fact being the primary one
 */
export interface FactStack {
  /** The Fact displayed on top of the stack */
  topFact: Fact;
  /** All Facts in the stack (includes topFact) */
  facts: Fact[];
  /** Number of Facts that support the topFact (via supportsFacts relationship) */
  supportCount: number;
}

/**
 * Computes FactStacks from a list of Facts based on supporting relationships.
 *
 * Algorithm:
 * - Start with the list of Facts
 * - Create a Set to track which Facts are already stacked
 * - For each unprocessed Fact:
 *   - Gather all supporting Facts to that Fact (supportsFacts relationship)
 *   - Do not include any Facts already in the Set
 *   - These gathered Facts form the Stack with the current Fact on top
 *   - Add all gathered Facts to the Set
 * - After creating all stacks, calculate supportCount for each:
 *   - Count how many facts in the entire list have the topFact.id in their supportsFacts array
 *   - This represents the actual number of supporting facts for the top fact
 *
 * @param facts - Array of Facts to organize into stacks
 * @returns Array of FactStacks
 */
export function computeFactStacks(facts: Fact[]): FactStack[] {
  const stacks: FactStack[] = [];
  const processedFactIds = new Set<string>();

  for (const fact of facts) {
    // Skip if this fact has already been added to a stack
    if (processedFactIds.has(fact.id)) {
      continue;
    }

    // Gather all supporting facts that haven't been processed yet
    const supportingFacts = (fact.supports || []).filter(
      (supportFact) => !processedFactIds.has(supportFact.id)
    );

    // Create a stack with this fact on top and all supporting facts
    const stackFacts = [fact, ...supportingFacts];

    // Mark all facts in this stack as processed
    stackFacts.forEach((f) => processedFactIds.add(f.id));

    // Count how many facts support this topFact
    // This is the number of facts that have this fact in their supportsFacts array
    const supportCount = fact.supportedBy?.length || 0;

    // Create the stack
    stacks.push({
      topFact: fact,
      facts: stackFacts,
      supportCount,
    });
  }

  return stacks;
}

/**
 * Determines if a FactStack has supporting facts (is actually a stack)
 */
export function isMultiFactStack(stack: FactStack): boolean {
  return stack.supportCount > 0;
}
