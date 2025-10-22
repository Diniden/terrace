"""
Tests for RAG service endpoints.

Tests the LitServe API endpoints for embedding, search, and health checks.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from tests import SAMPLE_FACTS


class TestRAGServiceEndpoints:
    """Tests for RAG service API endpoints."""

    @pytest.fixture
    def mock_rag_service(self):
        """Create a mock RAG service."""
        with patch('rag_service.create_provider_from_config') as mock_provider_factory, \
             patch('rag_service.chromadb.HttpClient') as mock_chroma_class:

            # Mock embedding provider
            mock_provider = Mock()
            mock_provider.get_provider_name.return_value = "local"
            mock_provider.get_embedding_dimension.return_value = 384
            mock_provider.embed.return_value = [0.1] * 384
            mock_provider_factory.return_value = mock_provider

            # Mock ChromaDB client and collection
            mock_client = Mock()
            mock_collection = Mock()
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client.heartbeat.return_value = True
            mock_chroma_class.return_value = mock_client

            yield {
                "provider": mock_provider,
                "client": mock_client,
                "collection": mock_collection
            }

    def test_embed_endpoint(self, mock_rag_service):
        """Test /embed endpoint."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        # Test successful embedding
        request = {
            "_endpoint": "/embed",
            "fact_id": "fact-uuid-001",
            "statement": "The Earth orbits the Sun in approximately 365.25 days.",
            "context_id": "context-astronomy"
        }

        response = api.predict(request)

        assert response["success"] is True
        assert response["fact_id"] == "fact-uuid-001"
        assert "successfully" in response["message"].lower()

        # Verify ChromaDB add was called
        mock_rag_service["collection"].add.assert_called_once()

    def test_embed_endpoint_without_context(self, mock_rag_service):
        """Test /embed endpoint without context_id."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/embed",
            "fact_id": "fact-uuid-002",
            "statement": "Water boils at 100 degrees Celsius at sea level."
        }

        response = api.predict(request)

        assert response["success"] is True
        assert response["fact_id"] == "fact-uuid-002"

    def test_embed_endpoint_empty_statement(self, mock_rag_service):
        """Test /embed endpoint with empty statement."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/embed",
            "fact_id": "fact-uuid-003",
            "statement": ""
        }

        response = api.predict(request)

        assert response["success"] is False
        assert "error" in response["message"].lower()

    def test_search_endpoint(self, mock_rag_service):
        """Test /search endpoint."""
        from rag_service import RAGServiceAPI

        # Configure mock to return search results
        mock_rag_service["collection"].query.return_value = {
            "ids": [["fact-uuid-001", "fact-uuid-002"]],
            "distances": [[0.1, 0.3]],
            "documents": [[
                SAMPLE_FACTS[0]["statement"],
                SAMPLE_FACTS[1]["statement"]
            ]],
            "metadatas": [[
                {"context_id": "context-astronomy"},
                {"context_id": "context-physics"}
            ]]
        }

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/search",
            "query": "How long does Earth take to orbit?",
            "limit": 10
        }

        response = api.predict(request)

        assert "results" in response
        assert len(response["results"]) == 2
        assert response["results"][0]["fact_id"] == "fact-uuid-001"
        assert response["results"][0]["score"] > 0
        assert "statement" in response["results"][0]

        # Verify higher score for closer match
        assert response["results"][0]["score"] > response["results"][1]["score"]

    def test_search_endpoint_with_context_filter(self, mock_rag_service):
        """Test /search endpoint with context_ids filter."""
        from rag_service import RAGServiceAPI

        # Configure mock to return filtered results
        mock_rag_service["collection"].query.return_value = {
            "ids": [["fact-uuid-002", "fact-uuid-004"]],
            "distances": [[0.15, 0.25]],
            "documents": [[
                SAMPLE_FACTS[1]["statement"],
                SAMPLE_FACTS[3]["statement"]
            ]],
            "metadatas": [[
                {"context_id": "context-physics"},
                {"context_id": "context-physics"}
            ]]
        }

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/search",
            "query": "physical properties",
            "limit": 10,
            "context_ids": ["context-physics"]
        }

        response = api.predict(request)

        assert "results" in response
        assert len(response["results"]) == 2

        # Verify where filter was passed to query
        mock_rag_service["collection"].query.assert_called_once()
        call_kwargs = mock_rag_service["collection"].query.call_args.kwargs
        assert "where" in call_kwargs
        assert call_kwargs["where"] == {"context_id": {"$in": ["context-physics"]}}

    def test_search_endpoint_empty_results(self, mock_rag_service):
        """Test /search endpoint with no results."""
        from rag_service import RAGServiceAPI

        # Configure mock to return no results
        mock_rag_service["collection"].query.return_value = {
            "ids": [[]],
            "distances": [[]],
            "documents": [[]],
            "metadatas": [[]]
        }

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/search",
            "query": "completely unrelated query xyz123",
            "limit": 10
        }

        response = api.predict(request)

        assert "results" in response
        assert len(response["results"]) == 0

    def test_search_endpoint_empty_query(self, mock_rag_service):
        """Test /search endpoint with empty query."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/search",
            "query": "",
            "limit": 10
        }

        response = api.predict(request)

        # Should return error or empty results
        assert "results" in response or "error" in response

    def test_health_endpoint(self, mock_rag_service):
        """Test /health endpoint."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/health"
        }

        response = api.predict(request)

        assert response["status"] == "healthy"
        assert response["provider"] == "local"
        assert response["chromadb"] == "connected"
        assert response["embedding_dimension"] == 384

    def test_health_endpoint_chromadb_disconnected(self, mock_rag_service):
        """Test /health endpoint when ChromaDB is disconnected."""
        from rag_service import RAGServiceAPI

        # Make heartbeat fail
        mock_rag_service["client"].heartbeat.side_effect = Exception("Connection lost")

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/health"
        }

        response = api.predict(request)

        assert response["status"] == "degraded"
        assert "disconnected" in response["chromadb"].lower()

    def test_unknown_endpoint(self, mock_rag_service):
        """Test unknown endpoint returns 404."""
        from rag_service import RAGServiceAPI

        api = RAGServiceAPI()
        api.setup("cpu")

        request = {
            "_endpoint": "/unknown"
        }

        response = api.predict(request)

        assert "error" in response
        assert response["status_code"] == 404


class TestEndToEndWorkflow:
    """End-to-end workflow tests."""

    @pytest.fixture
    def mock_rag_service_e2e(self):
        """Create a mock RAG service for end-to-end testing."""
        with patch('rag_service.create_provider_from_config') as mock_provider_factory, \
             patch('rag_service.chromadb.HttpClient') as mock_chroma_class:

            # Mock embedding provider
            mock_provider = Mock()
            mock_provider.get_provider_name.return_value = "local"
            mock_provider.get_embedding_dimension.return_value = 384

            # Return different embeddings for different texts
            def mock_embed(text):
                return [hash(text) % 100 / 100.0] * 384

            mock_provider.embed.side_effect = mock_embed
            mock_provider_factory.return_value = mock_provider

            # Mock ChromaDB with in-memory storage
            mock_client = Mock()
            mock_collection = Mock()

            # Simulate storage
            storage = {
                "ids": [],
                "embeddings": [],
                "documents": [],
                "metadatas": []
            }

            def mock_add(ids, embeddings, documents, metadatas=None):
                storage["ids"].extend(ids)
                storage["embeddings"].extend(embeddings)
                storage["documents"].extend(documents)
                if metadatas:
                    storage["metadatas"].extend(metadatas)

            def mock_query(query_embeddings, n_results, where=None):
                # Simple similarity based on first element
                query_vec = query_embeddings[0]
                results = []

                for i, emb in enumerate(storage["embeddings"]):
                    # Filter by context if specified
                    if where and storage["metadatas"]:
                        context_filter = where.get("context_id", {}).get("$in", [])
                        if context_filter:
                            metadata = storage["metadatas"][i] if i < len(storage["metadatas"]) else {}
                            if metadata.get("context_id") not in context_filter:
                                continue

                    # Calculate simple distance
                    distance = abs(query_vec[0] - emb[0])
                    results.append((i, distance))

                # Sort by distance and take top n
                results.sort(key=lambda x: x[1])
                results = results[:n_results]

                return {
                    "ids": [[storage["ids"][i] for i, _ in results]],
                    "distances": [[dist for _, dist in results]],
                    "documents": [[storage["documents"][i] for i, _ in results]],
                    "metadatas": [[storage["metadatas"][i] if i < len(storage["metadatas"]) else {} for i, _ in results]]
                }

            mock_collection.add.side_effect = mock_add
            mock_collection.query.side_effect = mock_query

            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client.heartbeat.return_value = True
            mock_chroma_class.return_value = mock_client

            yield mock_provider, mock_collection, storage

    def test_embed_and_search_workflow(self, mock_rag_service_e2e):
        """Test complete workflow: embed facts then search."""
        from rag_service import RAGServiceAPI

        mock_provider, mock_collection, storage = mock_rag_service_e2e

        api = RAGServiceAPI()
        api.setup("cpu")

        # Step 1: Embed sample facts
        for fact in SAMPLE_FACTS[:3]:
            request = {
                "_endpoint": "/embed",
                "fact_id": fact["fact_id"],
                "statement": fact["statement"],
                "context_id": fact["context_id"]
            }
            response = api.predict(request)
            assert response["success"] is True

        # Verify facts were stored
        assert len(storage["ids"]) == 3

        # Step 2: Search for related facts
        search_request = {
            "_endpoint": "/search",
            "query": "Earth orbit Sun",
            "limit": 5
        }
        search_response = api.predict(search_request)

        assert "results" in search_response
        assert len(search_response["results"]) > 0

    def test_context_filtered_search(self, mock_rag_service_e2e):
        """Test embedding and searching with context filtering."""
        from rag_service import RAGServiceAPI

        mock_provider, mock_collection, storage = mock_rag_service_e2e

        api = RAGServiceAPI()
        api.setup("cpu")

        # Embed facts from different contexts
        for fact in SAMPLE_FACTS:
            request = {
                "_endpoint": "/embed",
                "fact_id": fact["fact_id"],
                "statement": fact["statement"],
                "context_id": fact["context_id"]
            }
            response = api.predict(request)
            assert response["success"] is True

        # Search only in physics context
        search_request = {
            "_endpoint": "/search",
            "query": "temperature",
            "limit": 10,
            "context_ids": ["context-physics"]
        }
        search_response = api.predict(search_request)

        assert "results" in search_response
        # Results should be filtered (though exact count depends on similarity)
        assert len(search_response["results"]) <= len([f for f in SAMPLE_FACTS if f["context_id"] == "context-physics"])
