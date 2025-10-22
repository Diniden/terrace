"""
Test suite for RAG service.
"""

# Sample test data used across tests
SAMPLE_FACTS = [
    {
        "fact_id": "fact-uuid-001",
        "statement": "The Earth orbits the Sun in approximately 365.25 days.",
        "context_id": "context-astronomy"
    },
    {
        "fact_id": "fact-uuid-002",
        "statement": "Water boils at 100 degrees Celsius at sea level.",
        "context_id": "context-physics"
    },
    {
        "fact_id": "fact-uuid-003",
        "statement": "Python was created by Guido van Rossum in 1991.",
        "context_id": "context-programming"
    },
    {
        "fact_id": "fact-uuid-004",
        "statement": "The speed of light in vacuum is approximately 299,792,458 meters per second.",
        "context_id": "context-physics"
    },
    {
        "fact_id": "fact-uuid-005",
        "statement": "DNA is composed of four nucleotide bases: adenine, thymine, guanine, and cytosine.",
        "context_id": "context-biology"
    }
]
