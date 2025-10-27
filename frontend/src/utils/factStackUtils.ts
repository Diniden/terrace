import type { Fact } from '../types';

/**
 * Represents a stack of related Facts, with the top Fact being the primary one
 */
export interface FactStack {
  /** The Fact displayed on top of the stack */
  topFact: Fact;
  /** All Facts in the stack (includes topFact) */
  facts: Fact[];
  /** Number of Facts that support the topFact (bidirectional: supportedBy + supports) */
  supportCount: number;
}

/**
 * Computes FactStacks from a list of Facts based on supporting relationships.
 *
 * Algorithm:
 * - Start with the list of Facts
 * - Create a Set to track which Facts are already stacked
 * - For each unprocessed Fact:
 *   - Gather all supporting Facts using BIDIRECTIONAL relationships:
 *     * Facts that support this fact (supportedBy relationship)
 *     * Facts that this fact supports (supports relationship)
 *   - Filter by same context and exclude already processed facts
 *   - Do not include any Facts already in the Set
 *   - These gathered Facts form the Stack with the current Fact on top
 *   - Add all gathered Facts to the Set
 * - The supportCount equals the number of bidirectional supporting facts
 * - This matches FactView's logic for displaying supporting facts
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
    // Use bidirectional approach: combine both supportedBy and supports arrays
    // This matches FactView's logic (lines 227-245)
    const supportingFactsSet = new Set<string>();
    const supportingFacts: Fact[] = [];

    // Add facts that support this fact (supportedBy relationship)
    (fact.supportedBy || []).forEach((supportFact) => {
      if (supportFact.context === fact.context &&
          !processedFactIds.has(supportFact.id) &&
          !supportingFactsSet.has(supportFact.id)) {
        supportingFactsSet.add(supportFact.id);
        supportingFacts.push(supportFact);
      }
    });

    // Add facts that this fact supports (bidirectional relationship)
    (fact.supports || []).forEach((supportFact) => {
      if (supportFact.context === fact.context &&
          !processedFactIds.has(supportFact.id) &&
          !supportingFactsSet.has(supportFact.id)) {
        supportingFactsSet.add(supportFact.id);
        supportingFacts.push(supportFact);
      }
    });

    // Create a stack with this fact on top and all supporting facts
    const stackFacts = [fact, ...supportingFacts];

    // Mark all facts in this stack as processed
    stackFacts.forEach((f) => processedFactIds.add(f.id));

    // Count the bidirectional supporting facts (matches supportingFacts.length)
    const supportCount = supportingFacts.length;

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
