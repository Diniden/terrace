"""
Embedding provider factory and exports.

This module provides a factory function to create the appropriate embedding
provider based on configuration.
"""

import logging
from typing import Optional
from .base import EmbeddingProvider
from .claude import ClaudeProvider
from .openai import OpenAIProvider
from .ollama import OllamaProvider
from .local import LocalProvider

logger = logging.getLogger(__name__)

__all__ = [
    "EmbeddingProvider",
    "ClaudeProvider",
    "OpenAIProvider",
    "OllamaProvider",
    "LocalProvider",
    "create_provider",
]


def create_provider(
    provider_type: str,
    api_key: Optional[str] = None,
    host: Optional[str] = None,
    model_name: Optional[str] = None,
) -> EmbeddingProvider:
    """
    Factory function to create embedding providers.

    Args:
        provider_type: Type of provider (claude, openai, ollama, local)
        api_key: API key for cloud providers (Claude, OpenAI)
        host: Host URL for Ollama
        model_name: Model name for local/ollama providers

    Returns:
        Initialized embedding provider

    Raises:
        ValueError: If provider_type is unknown or configuration is invalid
    """
    provider_type = provider_type.lower().strip()

    logger.info(f"Creating embedding provider: {provider_type}")

    if provider_type == "claude":
        if not api_key:
            raise ValueError(
                "API key is required for Claude provider. "
                "Set ANTHROPIC_API_KEY in environment or .env file."
            )
        return ClaudeProvider(api_key=api_key)

    elif provider_type == "openai":
        if not api_key:
            raise ValueError(
                "API key is required for OpenAI provider. "
                "Set OPENAI_API_KEY in environment or .env file."
            )
        model = model_name or "text-embedding-3-small"
        return OpenAIProvider(api_key=api_key, model=model)

    elif provider_type == "ollama":
        host = host or "http://localhost:11434"
        model = model_name or "nomic-embed-text"
        return OllamaProvider(host=host, model=model)

    elif provider_type == "local":
        model = model_name or "all-MiniLM-L6-v2"
        return LocalProvider(model_name=model)

    else:
        raise ValueError(
            f"Unknown embedding provider: {provider_type}. "
            f"Valid options: claude, openai, ollama, local"
        )


def create_provider_from_config(config) -> EmbeddingProvider:
    """
    Create provider from configuration object.

    Args:
        config: Configuration object with provider settings

    Returns:
        Initialized embedding provider
    """
    provider_type = config.EMBEDDING_PROVIDER

    # Prepare kwargs based on provider type
    kwargs = {}

    if provider_type == "claude":
        kwargs["api_key"] = config.ANTHROPIC_API_KEY
    elif provider_type == "openai":
        kwargs["api_key"] = config.OPENAI_API_KEY
    elif provider_type == "ollama":
        kwargs["host"] = config.OLLAMA_HOST
        kwargs["model_name"] = config.OLLAMA_MODEL
    elif provider_type == "local":
        kwargs["model_name"] = config.LOCAL_MODEL_NAME

    return create_provider(provider_type, **kwargs)
