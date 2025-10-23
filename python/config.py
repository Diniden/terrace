"""
Configuration management for RAG service.
Loads settings from environment variables with sensible defaults.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()


class Config:
    """Configuration container for RAG service settings."""

    # Embedding provider configuration
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local")

    # Provider-specific API keys and settings
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "nomic-embed-text")
    LOCAL_MODEL_NAME: str = os.getenv("LOCAL_MODEL_NAME", "all-MiniLM-L6-v2")

    # ChromaDB configuration
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8000"))
    CHROMA_COLLECTION_NAME: str = "facts"
    CHROMA_PERSIST_DIRECTORY: str = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

    # Service configuration
    SERVICE_HOST: str = os.getenv("SERVICE_HOST", "0.0.0.0")
    SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", "8080"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))

    @classmethod
    def validate(cls) -> None:
        """
        Validate configuration based on selected provider.
        Raises ValueError if required settings are missing.
        """
        provider = cls.EMBEDDING_PROVIDER.lower()

        if provider == "claude":
            if not cls.ANTHROPIC_API_KEY:
                raise ValueError(
                    "ANTHROPIC_API_KEY is required when using Claude provider. "
                    "Set it in environment variables or .env file."
                )
        elif provider == "openai":
            if not cls.OPENAI_API_KEY:
                raise ValueError(
                    "OPENAI_API_KEY is required when using OpenAI provider. "
                    "Set it in environment variables or .env file."
                )
        elif provider == "ollama":
            if not cls.OLLAMA_HOST:
                raise ValueError(
                    "OLLAMA_HOST is required when using Ollama provider. "
                    "Set it in environment variables or .env file."
                )
        elif provider == "local":
            # Local provider doesn't require API keys
            pass
        else:
            raise ValueError(
                f"Unknown embedding provider: {provider}. "
                f"Valid options: claude, openai, ollama, local"
            )

    @classmethod
    def get_provider_info(cls) -> dict:
        """Return information about the configured provider."""
        return {
            "provider": cls.EMBEDDING_PROVIDER,
            "model": cls._get_model_name(),
        }

    @classmethod
    def _get_model_name(cls) -> str:
        """Get the model name for the configured provider."""
        provider = cls.EMBEDDING_PROVIDER.lower()

        if provider == "claude":
            return "claude-3-5-sonnet-20241022"
        elif provider == "openai":
            return "text-embedding-3-small"
        elif provider == "ollama":
            return cls.OLLAMA_MODEL
        elif provider == "local":
            return cls.LOCAL_MODEL_NAME
        else:
            return "unknown"


# Create singleton instance
config = Config()
