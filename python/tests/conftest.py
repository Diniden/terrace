"""
Pytest configuration and shared fixtures.
"""

import pytest
import os
from unittest.mock import Mock, patch


@pytest.fixture
def mock_env_local():
    """Mock environment variables for local provider."""
    env_vars = {
        "EMBEDDING_PROVIDER": "local",
        "LOCAL_MODEL_NAME": "all-MiniLM-L6-v2",
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
        "SERVICE_HOST": "0.0.0.0",
        "SERVICE_PORT": "8080",
        "LOG_LEVEL": "INFO",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def mock_env_openai():
    """Mock environment variables for OpenAI provider."""
    env_vars = {
        "EMBEDDING_PROVIDER": "openai",
        "OPENAI_API_KEY": "test-key-openai",
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def mock_env_claude():
    """Mock environment variables for Claude provider."""
    env_vars = {
        "EMBEDDING_PROVIDER": "claude",
        "ANTHROPIC_API_KEY": "test-key-claude",
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def mock_env_ollama():
    """Mock environment variables for Ollama provider."""
    env_vars = {
        "EMBEDDING_PROVIDER": "ollama",
        "OLLAMA_HOST": "http://localhost:11434",
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8000",
    }
    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def sample_embedding_384():
    """Sample embedding vector with 384 dimensions."""
    return [0.1] * 384


@pytest.fixture
def sample_embedding_768():
    """Sample embedding vector with 768 dimensions."""
    return [0.1] * 768


@pytest.fixture
def sample_embedding_1536():
    """Sample embedding vector with 1536 dimensions."""
    return [0.1] * 1536


@pytest.fixture
def mock_chroma_collection():
    """Mock ChromaDB collection."""
    collection = Mock()
    collection.add = Mock()
    collection.query = Mock(return_value={
        "ids": [[]],
        "distances": [[]],
        "documents": [[]],
        "metadatas": [[]]
    })
    return collection


@pytest.fixture
def mock_chroma_client(mock_chroma_collection):
    """Mock ChromaDB client."""
    client = Mock()
    client.get_or_create_collection.return_value = mock_chroma_collection
    client.heartbeat.return_value = True
    return client


# Pytest configuration hooks
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "requires_api: Tests requiring API keys")
    config.addinivalue_line("markers", "requires_chromadb: Tests requiring ChromaDB")
