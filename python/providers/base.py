"""
Abstract base class for embedding providers.
Defines the interface that all embedding providers must implement.
"""

from abc import ABC, abstractmethod
from typing import List, Optional


class EmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers.

    All embedding providers must implement the embed and get_provider_name methods.
    """

    @abstractmethod
    def embed(self, text: str) -> List[float]:
        """
        Generate embedding vector for the given text.

        Args:
            text: The text to embed

        Returns:
            List of floats representing the embedding vector

        Raises:
            Exception: If embedding generation fails
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get the name of this embedding provider.

        Returns:
            String identifier for the provider (e.g., "claude", "openai", "ollama", "local")
        """
        pass

    @abstractmethod
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension of embeddings produced by this provider.

        Returns:
            Integer dimension of embedding vectors
        """
        pass

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.

        Default implementation calls embed() for each text sequentially.
        Providers can override this for batch optimization.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        return [self.embed(text) for text in texts]

    def health_check(self) -> dict:
        """
        Check if the provider is healthy and operational.

        Returns:
            Dictionary with health status information
        """
        try:
            # Test embedding with a simple phrase
            test_embedding = self.embed("health check")
            return {
                "status": "healthy",
                "provider": self.get_provider_name(),
                "dimension": self.get_embedding_dimension(),
                "test_embedding_length": len(test_embedding)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": self.get_provider_name(),
                "error": str(e)
            }
