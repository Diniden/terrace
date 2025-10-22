"""
Example usage of the RAG service.

This script demonstrates how to interact with the RAG service API.
"""

import requests
import json
import time
from typing import List, Dict


class RAGServiceClient:
    """Client for interacting with the RAG service."""

    def __init__(self, base_url: str = "http://localhost:8080"):
        """
        Initialize RAG service client.

        Args:
            base_url: Base URL of the RAG service
        """
        self.base_url = base_url.rstrip("/")

    def health_check(self) -> Dict:
        """Check service health."""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def embed_fact(self, fact_id: str, statement: str, context_id: str = None) -> Dict:
        """
        Embed a fact into the vector database.

        Args:
            fact_id: Unique identifier for the fact
            statement: The fact statement to embed
            context_id: Optional context identifier

        Returns:
            Response dictionary
        """
        payload = {
            "fact_id": fact_id,
            "statement": statement
        }
        if context_id:
            payload["context_id"] = context_id

        response = requests.post(f"{self.base_url}/embed", json=payload)
        response.raise_for_status()
        return response.json()

    def search(
        self,
        query: str,
        limit: int = 10,
        context_ids: List[str] = None
    ) -> Dict:
        """
        Search for facts using natural language query.

        Args:
            query: Natural language search query
            limit: Maximum number of results
            context_ids: Optional list of context IDs to filter by

        Returns:
            Search results
        """
        payload = {
            "query": query,
            "limit": limit
        }
        if context_ids:
            payload["context_ids"] = context_ids

        response = requests.post(f"{self.base_url}/search", json=payload)
        response.raise_for_status()
        return response.json()


def main():
    """Demonstrate RAG service usage."""
    print("=" * 80)
    print("RAG Service Example Usage")
    print("=" * 80)

    # Initialize client
    client = RAGServiceClient()

    # Check service health
    print("\n1. Checking service health...")
    try:
        health = client.health_check()
        print(f"   Status: {health['status']}")
        print(f"   Provider: {health['provider']}")
        print(f"   ChromaDB: {health['chromadb']}")
        print(f"   Embedding Dimension: {health.get('embedding_dimension', 'N/A')}")
    except Exception as e:
        print(f"   Error: {e}")
        print("\n   Make sure the service is running:")
        print("   python3 rag_service.py")
        return

    # Sample facts to embed
    facts = [
        {
            "fact_id": "fact-earth-orbit",
            "statement": "The Earth orbits the Sun in approximately 365.25 days.",
            "context_id": "context-astronomy"
        },
        {
            "fact_id": "fact-water-boiling",
            "statement": "Water boils at 100 degrees Celsius at sea level.",
            "context_id": "context-physics"
        },
        {
            "fact_id": "fact-python-creator",
            "statement": "Python was created by Guido van Rossum in 1991.",
            "context_id": "context-programming"
        },
        {
            "fact_id": "fact-speed-of-light",
            "statement": "The speed of light in vacuum is approximately 299,792,458 meters per second.",
            "context_id": "context-physics"
        },
        {
            "fact_id": "fact-dna-bases",
            "statement": "DNA is composed of four nucleotide bases: adenine, thymine, guanine, and cytosine.",
            "context_id": "context-biology"
        }
    ]

    # Embed facts
    print("\n2. Embedding sample facts...")
    for fact in facts:
        try:
            result = client.embed_fact(
                fact_id=fact["fact_id"],
                statement=fact["statement"],
                context_id=fact["context_id"]
            )
            print(f"   ✓ {fact['fact_id']}: {result['message']}")
            time.sleep(0.1)  # Small delay to avoid overwhelming the service
        except Exception as e:
            print(f"   ✗ {fact['fact_id']}: {e}")

    # Give the system a moment to process
    print("\n   Waiting for embeddings to be processed...")
    time.sleep(1)

    # Perform searches
    print("\n3. Performing semantic searches...")

    searches = [
        {
            "query": "How long does Earth take to orbit the Sun?",
            "limit": 3,
            "description": "Astronomy query"
        },
        {
            "query": "What is the boiling point of water?",
            "limit": 3,
            "description": "Physics query"
        },
        {
            "query": "Who created Python programming language?",
            "limit": 3,
            "description": "Programming query"
        },
        {
            "query": "Tell me about molecular biology",
            "limit": 3,
            "context_ids": ["context-biology"],
            "description": "Biology query with context filter"
        }
    ]

    for search_params in searches:
        description = search_params.pop("description")
        print(f"\n   Query: {search_params['query']}")
        print(f"   ({description})")

        try:
            results = client.search(**search_params)

            if results["results"]:
                print(f"   Found {len(results['results'])} results:")
                for i, result in enumerate(results["results"], 1):
                    print(f"\n      {i}. Score: {result['score']:.4f}")
                    print(f"         Fact ID: {result['fact_id']}")
                    print(f"         Statement: {result['statement'][:80]}...")
            else:
                print("   No results found.")

        except Exception as e:
            print(f"   Error: {e}")

        time.sleep(0.5)

    print("\n" + "=" * 80)
    print("Example completed!")
    print("=" * 80)


if __name__ == "__main__":
    main()
