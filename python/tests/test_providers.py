"""
Tests for embedding providers.

Tests each provider with mocks to avoid requiring API keys during testing.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from providers import (
    create_provider,
    ClaudeProvider,
    OpenAIProvider,
    OllamaProvider,
    LocalProvider,
)
from tests import SAMPLE_FACTS


class TestProviderFactory:
    """Tests for provider factory function."""

    def test_create_local_provider(self):
        """Test creating local provider."""
        with patch('providers.local.SentenceTransformer'):
            provider = create_provider("local", model_name="all-MiniLM-L6-v2")
            assert provider.get_provider_name() == "local"

    def test_create_unknown_provider(self):
        """Test creating unknown provider raises error."""
        with pytest.raises(ValueError, match="Unknown embedding provider"):
            create_provider("unknown")

    def test_create_claude_without_key(self):
        """Test creating Claude provider without API key raises error."""
        with pytest.raises(ValueError, match="API key is required"):
            create_provider("claude")

    def test_create_openai_without_key(self):
        """Test creating OpenAI provider without API key raises error."""
        with pytest.raises(ValueError, match="API key is required"):
            create_provider("openai")


class TestLocalProvider:
    """Tests for local sentence-transformers provider."""

    @patch('providers.local.SentenceTransformer')
    def test_initialization(self, mock_transformer):
        """Test local provider initialization."""
        mock_model = Mock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_transformer.return_value = mock_model

        provider = LocalProvider("all-MiniLM-L6-v2")

        assert provider.get_provider_name() == "local"
        assert provider.get_embedding_dimension() == 384
        mock_transformer.assert_called_once_with("all-MiniLM-L6-v2")

    @patch('providers.local.SentenceTransformer')
    def test_embed(self, mock_transformer):
        """Test embedding generation."""
        mock_model = Mock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_model.encode.return_value = Mock(tolist=lambda: [0.1] * 384)
        mock_transformer.return_value = mock_model

        provider = LocalProvider("all-MiniLM-L6-v2")
        embedding = provider.embed("test text")

        assert len(embedding) == 384
        assert all(isinstance(x, float) for x in embedding)
        mock_model.encode.assert_called_once()

    @patch('providers.local.SentenceTransformer')
    def test_embed_batch(self, mock_transformer):
        """Test batch embedding generation."""
        mock_model = Mock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_model.encode.return_value = [
            Mock(tolist=lambda: [0.1] * 384),
            Mock(tolist=lambda: [0.2] * 384)
        ]
        mock_transformer.return_value = mock_model

        provider = LocalProvider("all-MiniLM-L6-v2")
        embeddings = provider.embed_batch(["text1", "text2"])

        assert len(embeddings) == 2
        assert all(len(e) == 384 for e in embeddings)

    @patch('providers.local.SentenceTransformer')
    def test_health_check(self, mock_transformer):
        """Test health check."""
        mock_model = Mock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_model.encode.return_value = Mock(tolist=lambda: [0.1] * 384)
        mock_transformer.return_value = mock_model

        provider = LocalProvider("all-MiniLM-L6-v2")
        health = provider.health_check()

        assert health["status"] == "healthy"
        assert health["provider"] == "local"
        assert health["dimension"] == 384


class TestOpenAIProvider:
    """Tests for OpenAI provider."""

    @patch('providers.openai.OpenAI')
    def test_initialization(self, mock_client_class):
        """Test OpenAI provider initialization."""
        provider = OpenAIProvider(api_key="test-key")

        assert provider.get_provider_name() == "openai"
        assert provider.get_embedding_dimension() == 1536
        mock_client_class.assert_called_once_with(api_key="test-key")

    @patch('providers.openai.OpenAI')
    def test_embed(self, mock_client_class):
        """Test embedding generation."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = [Mock(embedding=[0.1] * 1536)]
        mock_client.embeddings.create.return_value = mock_response
        mock_client_class.return_value = mock_client

        provider = OpenAIProvider(api_key="test-key")
        embedding = provider.embed("test text")

        assert len(embedding) == 1536
        mock_client.embeddings.create.assert_called_once()

    @patch('providers.openai.OpenAI')
    def test_embed_batch(self, mock_client_class):
        """Test batch embedding generation."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=[0.1] * 1536, index=0),
            Mock(embedding=[0.2] * 1536, index=1)
        ]
        mock_client.embeddings.create.return_value = mock_response
        mock_client_class.return_value = mock_client

        provider = OpenAIProvider(api_key="test-key")
        embeddings = provider.embed_batch(["text1", "text2"])

        assert len(embeddings) == 2
        assert all(len(e) == 1536 for e in embeddings)


class TestOllamaProvider:
    """Tests for Ollama provider."""

    @patch('providers.ollama.requests.get')
    def test_initialization(self, mock_get):
        """Test Ollama provider initialization."""
        mock_get.return_value.status_code = 200

        provider = OllamaProvider(host="http://localhost:11434")

        assert provider.get_provider_name() == "ollama"
        assert provider.host == "http://localhost:11434"

    @patch('providers.ollama.requests.post')
    @patch('providers.ollama.requests.get')
    def test_embed(self, mock_get, mock_post):
        """Test embedding generation."""
        mock_get.return_value.status_code = 200
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "embedding": [0.1] * 768
        }

        provider = OllamaProvider(host="http://localhost:11434")
        embedding = provider.embed("test text")

        assert len(embedding) == 768
        assert provider.get_embedding_dimension() == 768

    @patch('providers.ollama.requests.post')
    @patch('providers.ollama.requests.get')
    def test_embed_connection_error(self, mock_get, mock_post):
        """Test handling of connection errors."""
        mock_get.return_value.status_code = 200
        mock_post.side_effect = Exception("Connection refused")

        provider = OllamaProvider(host="http://localhost:11434")

        with pytest.raises(ConnectionError, match="Failed to connect to Ollama"):
            provider.embed("test text")


class TestClaudeProvider:
    """Tests for Claude provider."""

    @patch('providers.claude.anthropic.Anthropic')
    def test_initialization(self, mock_client_class):
        """Test Claude provider initialization."""
        provider = ClaudeProvider(api_key="test-key")

        assert provider.get_provider_name() == "claude"
        assert provider.get_embedding_dimension() == 1024
        mock_client_class.assert_called_once_with(api_key="test-key")

    @patch('providers.claude.anthropic.Anthropic')
    def test_embed(self, mock_client_class):
        """Test embedding generation."""
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [
            Mock(text="0.5, 0.6, 0.7, 0.8, 0.9, 0.4, 0.3, 0.2, 0.1, 0.5")
        ]
        mock_client.messages.create.return_value = mock_response
        mock_client_class.return_value = mock_client

        provider = ClaudeProvider(api_key="test-key")
        embedding = provider.embed("test text")

        assert len(embedding) == 1024
        assert all(isinstance(x, float) for x in embedding)
        mock_client.messages.create.assert_called_once()


class TestProvidersWithSampleFacts:
    """Integration-style tests using sample facts."""

    @patch('providers.local.SentenceTransformer')
    def test_embed_sample_facts(self, mock_transformer):
        """Test embedding sample facts."""
        mock_model = Mock()
        mock_model.get_sentence_embedding_dimension.return_value = 384

        def mock_encode(text, **kwargs):
            # Return different embeddings for different texts
            return Mock(tolist=lambda: [hash(text) % 100 / 100.0] * 384)

        mock_model.encode.side_effect = mock_encode
        mock_transformer.return_value = mock_model

        provider = LocalProvider("all-MiniLM-L6-v2")

        for fact in SAMPLE_FACTS:
            embedding = provider.embed(fact["statement"])
            assert len(embedding) == 384
            assert all(isinstance(x, float) for x in embedding)
