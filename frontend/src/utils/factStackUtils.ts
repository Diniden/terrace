import type { Fact } from "../types";

/**
 * Represents a stack of related Facts, with the top Fact being the primary one
 */
export interface FactStack {
  /** The Fact displayed on top of the stack */
  topFact: Fact;
  /** All Facts in the stack (includes topFact) */
  facts: Fact[];
  /** Number of Facts linked to the topFact (bidirectional support relationship) */
  linkedCount: number;
}

/**
 * Computes FactStacks from a list of Facts based on linked relationships.
 *
 * Algorithm:
 * - Start with the list of Facts
 * - Create a Set to track which Facts are already stacked
 * - For each unprocessed Fact:
 *   - Gather all linked Facts from the linkedFacts array
 *   - Filter by same context and exclude already processed facts
 *   - Do not include any Facts already in the Set
 *   - These gathered Facts form the Stack with the current Fact on top
 *   - Add all gathered Facts to the Set
 * - The linkedCount equals the number of linked facts
 * - This matches FactView's logic for displaying linked facts
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

    // Gather all linked facts that haven't been processed yet
    const linkedFactsSet = new Set<string>();
    const linkedFacts: Fact[] = [];

    // Add linked facts (bidirectional support relationship)
    for (let i = 0, iMax = (fact.linkedFacts || []).length; i < iMax; i++) {
      const linkedFact = (fact.linkedFacts || [])[i];
      if (
        linkedFact.context === fact.context &&
        !processedFactIds.has(linkedFact.id) &&
        !linkedFactsSet.has(linkedFact.id)
      ) {
        linkedFactsSet.add(linkedFact.id);
        linkedFacts.push(linkedFact);
      }
    }

    // Create a stack with this fact on top and all linked facts
    const stackFacts = [fact, ...linkedFacts];

    // Mark all facts in this stack as processed
    stackFacts.forEach((f) => processedFactIds.add(f.id));

    // Count the linked facts
    const linkedCount = linkedFacts.length;

    // Create the stack
    stacks.push({
      topFact: fact,
      facts: stackFacts,
      linkedCount,
    });
  }

  return stacks;
}

/**
 * Determines if a FactStack has linked facts (is actually a stack)
 */
export function isMultiFactStack(stack: FactStack): boolean {
  return stack.linkedCount > 0;
}
