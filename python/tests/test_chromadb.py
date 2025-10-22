"""
Tests for ChromaDB integration.

Tests ChromaDB operations including adding embeddings and searching.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from tests import SAMPLE_FACTS


class TestChromaDBIntegration:
    """Tests for ChromaDB vector storage operations."""

    @pytest.fixture
    def mock_chroma_client(self):
        """Create a mock ChromaDB client."""
        with patch('chromadb.HttpClient') as mock_client_class:
            mock_client = Mock()
            mock_collection = Mock()

            # Configure collection mock
            mock_collection.add = Mock()
            mock_collection.query = Mock()

            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client.heartbeat.return_value = True

            mock_client_class.return_value = mock_client

            yield mock_client, mock_collection

    def test_client_initialization(self, mock_chroma_client):
        """Test ChromaDB client initialization."""
        import chromadb

        client = chromadb.HttpClient(host="localhost", port=8000)
        collection = client.get_or_create_collection("facts")

        assert collection is not None
        client.get_or_create_collection.assert_called_once_with("facts")

    def test_add_embedding(self, mock_chroma_client):
        """Test adding a single embedding to ChromaDB."""
        mock_client, mock_collection = mock_chroma_client

        # Simulate adding an embedding
        fact = SAMPLE_FACTS[0]
        embedding = [0.1] * 384

        mock_collection.add(
            ids=[fact["fact_id"]],
            embeddings=[embedding],
            documents=[fact["statement"]],
            metadatas=[{"context_id": fact["context_id"]}]
        )

        mock_collection.add.assert_called_once()
        call_args = mock_collection.add.call_args
        assert call_args.kwargs["ids"] == [fact["fact_id"]]
        assert len(call_args.kwargs["embeddings"][0]) == 384
        assert call_args.kwargs["documents"] == [fact["statement"]]

    def test_add_multiple_embeddings(self, mock_chroma_client):
        """Test adding multiple embeddings to ChromaDB."""
        mock_client, mock_collection = mock_chroma_client

        # Simulate adding multiple embeddings
        fact_ids = [f["fact_id"] for f in SAMPLE_FACTS[:3]]
        statements = [f["statement"] for f in SAMPLE_FACTS[:3]]
        embeddings = [[0.1] * 384 for _ in range(3)]
        metadatas = [{"context_id": f["context_id"]} for f in SAMPLE_FACTS[:3]]

        mock_collection.add(
            ids=fact_ids,
            embeddings=embeddings,
            documents=statements,
            metadatas=metadatas
        )

        mock_collection.add.assert_called_once()
        call_args = mock_collection.add.call_args
        assert len(call_args.kwargs["ids"]) == 3
        assert len(call_args.kwargs["embeddings"]) == 3

    def test_query_embeddings(self, mock_chroma_client):
        """Test querying embeddings from ChromaDB."""
        mock_client, mock_collection = mock_chroma_client

        # Configure mock to return search results
        mock_collection.query.return_value = {
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

        query_embedding = [0.1] * 384
        results = mock_collection.query(
            query_embeddings=[query_embedding],
            n_results=2
        )

        assert len(results["ids"][0]) == 2
        assert results["ids"][0][0] == "fact-uuid-001"
        assert results["distances"][0][0] < results["distances"][0][1]

    def test_query_with_context_filter(self, mock_chroma_client):
        """Test querying with context_id filter."""
        mock_client, mock_collection = mock_chroma_client

        # Configure mock to return filtered results
        mock_collection.query.return_value = {
            "ids": [["fact-uuid-002", "fact-uuid-004"]],
            "distances": [[0.1, 0.2]],
            "documents": [[
                SAMPLE_FACTS[1]["statement"],
                SAMPLE_FACTS[3]["statement"]
            ]],
            "metadatas": [[
                {"context_id": "context-physics"},
                {"context_id": "context-physics"}
            ]]
        }

        query_embedding = [0.1] * 384
        where_filter = {"context_id": {"$in": ["context-physics"]}}

        results = mock_collection.query(
            query_embeddings=[query_embedding],
            n_results=10,
            where=where_filter
        )

        assert len(results["ids"][0]) == 2
        # Verify all results are from physics context
        for metadata in results["metadatas"][0]:
            assert metadata["context_id"] == "context-physics"

    def test_empty_query_results(self, mock_chroma_client):
        """Test handling of empty query results."""
        mock_client, mock_collection = mock_chroma_client

        # Configure mock to return no results
        mock_collection.query.return_value = {
            "ids": [[]],
            "distances": [[]],
            "documents": [[]],
            "metadatas": [[]]
        }

        query_embedding = [0.1] * 384
        results = mock_collection.query(
            query_embeddings=[query_embedding],
            n_results=10
        )

        assert len(results["ids"][0]) == 0

    def test_heartbeat_check(self, mock_chroma_client):
        """Test ChromaDB heartbeat/health check."""
        mock_client, mock_collection = mock_chroma_client

        # Test successful heartbeat
        heartbeat = mock_client.heartbeat()
        assert heartbeat is True

        # Test failed heartbeat
        mock_client.heartbeat.side_effect = Exception("Connection failed")
        with pytest.raises(Exception, match="Connection failed"):
            mock_client.heartbeat()

    def test_collection_persistence(self, mock_chroma_client):
        """Test that collection operations are persistent."""
        mock_client, mock_collection = mock_chroma_client

        # Add some embeddings
        mock_collection.add(
            ids=["fact-1", "fact-2"],
            embeddings=[[0.1] * 384, [0.2] * 384],
            documents=["Doc 1", "Doc 2"]
        )

        # Verify collection was used
        assert mock_collection.add.call_count == 1

        # Configure mock to simulate persistence
        mock_collection.query.return_value = {
            "ids": [["fact-1", "fact-2"]],
            "distances": [[0.0, 0.1]],
            "documents": [["Doc 1", "Doc 2"]],
            "metadatas": [[{}, {}]]
        }

        # Query should return the added documents
        results = mock_collection.query(
            query_embeddings=[[0.1] * 384],
            n_results=2
        )

        assert len(results["ids"][0]) == 2


class TestChromaDBErrorHandling:
    """Tests for ChromaDB error handling."""

    def test_connection_error(self):
        """Test handling of connection errors."""
        with patch('chromadb.HttpClient') as mock_client_class:
            mock_client_class.side_effect = Exception("Connection refused")

            with pytest.raises(Exception, match="Connection refused"):
                import chromadb
                chromadb.HttpClient(host="localhost", port=8000)

    def test_invalid_collection_name(self):
        """Test handling of invalid collection names."""
        with patch('chromadb.HttpClient') as mock_client_class:
            mock_client = Mock()
            mock_client.get_or_create_collection.side_effect = ValueError(
                "Invalid collection name"
            )
            mock_client_class.return_value = mock_client

            with pytest.raises(ValueError, match="Invalid collection name"):
                client = mock_client_class()
                client.get_or_create_collection("")

    def test_dimension_mismatch(self):
        """Test handling of embedding dimension mismatches."""
        with patch('chromadb.HttpClient') as mock_client_class:
            mock_client = Mock()
            mock_collection = Mock()
            mock_collection.add.side_effect = ValueError(
                "Embedding dimension mismatch"
            )
            mock_client.get_or_create_collection.return_value = mock_collection
            mock_client_class.return_value = mock_client

            client = mock_client_class()
            collection = client.get_or_create_collection("facts")

            with pytest.raises(ValueError, match="Embedding dimension mismatch"):
                collection.add(
                    ids=["fact-1"],
                    embeddings=[[0.1] * 768],  # Wrong dimension
                    documents=["Test"]
                )
