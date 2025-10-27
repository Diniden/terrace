@plans/base-feature-plan.md

New Feature: Filter

DB:
- We will need a new model called FactFilter.
- FactFilter will store a JSON that defines a filter for Facts.
- The intent is for the filter to be used on any retrieval of Facts from the
database.
- The filter should have: user, project, corpus, fact_context, then a JSON that
defines the filter.

Backend:
- FactFilter should have CRUD operations created for easy REST management.
- The structure of a FactFilter JSON object will be:
    ```typescript
    type NaturalLanguageQuery = {
      /** The natural language statement to match against the Fact's statement. */
      statement: string;
      /**
       * The correlation score of the statement to the Fact's statement.
       * 0 is no correlation, 1 is perfect * correlation.
       */
      correlation: number;
      /** Items in the list are AND'd together and AND'd with the statement. */
      and: NaturalLanguageQuery[];
      /** Items in the list are OR'd together and OR'd with the statement. */
      or: NaturalLanguageQuery[];
    };

    /**
     * Each property of the filter is AND'd together. So all filter properties
     * must be satisfied for the fact * to be a match.
     */
    type FactFilterProperties = {
      /** Facts will have the specified supporting fact count amounts */
      supportingFactCount: {
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
        value: number;
      }[];
      /**
       * Natural language query for supporting facts. The supporting fact's must
       * match the natural language query specified here for the
       * fact to be considered a match.
       */
      supportingFactNL: {
        /** Items in the list are AND'd together. */
        and: NaturalLanguageQuery[];
        /** Items in the list are OR'd together. */
        or: NaturalLanguageQuery[];
      };
      /** The fact basis requirement. */
      hasBasis: "required" | "optional" | "none";
      /** The natural language query for the basis fact. The basis fact's
       * statement must match the natural language query specified here for the
       * fact to be considered a match.
       */
      basisFactNL: {
        /** Items in the list are AND'd together. */
        and: NaturalLanguageQuery[];
        /** Items in the list are OR'd together. */
        or: NaturalLanguageQuery[];
      };
    }

    type CorpusFilterProperties = {

    }

    /**
     * This is the top filter structure which establishes and'ing and or'ing of
     * the filters we wish to apply.
     */
    type FactFilterJson = {
      and: FactFilterProperties[];
      or: FactFilterProperties[];
    }
    ```
- For any operation where Facts are retrievable, we should add a parameter that
can be passed for a filterId.
- The filterId that is passed will be the id of the FactFilter that should be
applied to the retrieval of Facts.
