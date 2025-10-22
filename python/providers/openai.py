"""
OpenAI embedding provider using OpenAI API.
Uses the text-embedding-3-small model by default.
"""

import logging
from typing import List
from openai import OpenAI
from .base import EmbeddingProvider

logger = logging.getLogger(__name__)


class OpenAIProvider(EmbeddingProvider):
    """
    OpenAI embedding provider using the embeddings API.
    """

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        """
        Initialize OpenAI provider.

        Args:
            api_key: OpenAI API key
            model: Model name (default: text-embedding-3-small)
        """
        if not api_key:
            raise ValueError("OpenAI API key is required for OpenAI provider")

        self.client = OpenAI(api_key=api_key)
        self.model = model

        # Set dimension based on model
        # text-embedding-3-small: 1536 dimensions
        # text-embedding-3-large: 3072 dimensions
        # text-embedding-ada-002: 1536 dimensions
        if "large" in model:
            self._dimension = 3072
        else:
            self._dimension = 1536

        logger.info(f"Initialized OpenAI provider with model: {self.model}")

    def embed(self, text: str) -> List[float]:
        """
        Generate embedding using OpenAI API.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding

        Raises:
            Exception: If the API call fails
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                encoding_format="float"
            )

            embedding = response.data[0].embedding

            logger.debug(
                f"Generated OpenAI embedding with dimension {len(embedding)}"
            )
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate OpenAI embedding: {e}")
            raise

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts using batch API.

        OpenAI supports batch embeddings which is more efficient.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                encoding_format="float"
            )

            # Sort by index to ensure correct order
            embeddings = [
                item.embedding
                for item in sorted(response.data, key=lambda x: x.index)
            ]

            logger.debug(
                f"Generated {len(embeddings)} OpenAI embeddings in batch"
            )
            return embeddings

        except Exception as e:
            logger.error(f"Failed to generate OpenAI batch embeddings: {e}")
            # Fallback to sequential processing
            logger.warning("Falling back to sequential embedding generation")
            return super().embed_batch(texts)

    def get_provider_name(self) -> str:
        """Get provider name."""
        return "openai"

    def get_embedding_dimension(self) -> int:
        """Get embedding dimension."""
        return self._dimension
