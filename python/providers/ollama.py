"""
Ollama embedding provider for local or remote Ollama instances.
Uses the Ollama API to generate embeddings with models like nomic-embed-text.
"""

import logging
from typing import List
import requests
from .base import EmbeddingProvider

logger = logging.getLogger(__name__)


class OllamaProvider(EmbeddingProvider):
    """
    Ollama embedding provider.

    Connects to an Ollama instance (local or remote) to generate embeddings.
    """

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "nomic-embed-text"
    ):
        """
        Initialize Ollama provider.

        Args:
            host: Ollama host URL (default: http://localhost:11434)
            model: Model name (default: nomic-embed-text)
        """
        self.host = host.rstrip("/")
        self.model = model
        self._dimension = None  # Will be determined on first embedding

        # Verify connection to Ollama
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            response.raise_for_status()
            logger.info(
                f"Successfully connected to Ollama at {self.host}"
            )
        except Exception as e:
            logger.warning(
                f"Could not verify Ollama connection at {self.host}: {e}"
            )

        logger.info(
            f"Initialized Ollama provider with model: {self.model} at {self.host}"
        )

    def embed(self, text: str) -> List[float]:
        """
        Generate embedding using Ollama API.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding

        Raises:
            Exception: If the API call fails
        """
        try:
            url = f"{self.host}/api/embeddings"
            payload = {
                "model": self.model,
                "prompt": text
            }

            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()

            data = response.json()
            embedding = data.get("embedding")

            if not embedding:
                raise ValueError("No embedding returned from Ollama")

            # Set dimension on first embedding
            if self._dimension is None:
                self._dimension = len(embedding)
                logger.info(
                    f"Detected Ollama embedding dimension: {self._dimension}"
                )

            logger.debug(
                f"Generated Ollama embedding with dimension {len(embedding)}"
            )
            return embedding

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to connect to Ollama at {self.host}: {e}")
            raise ConnectionError(
                f"Failed to connect to Ollama at {self.host}. "
                f"Ensure Ollama is running and the model '{self.model}' is available."
            ) from e
        except Exception as e:
            logger.error(f"Failed to generate Ollama embedding: {e}")
            raise

    def get_provider_name(self) -> str:
        """Get provider name."""
        return "ollama"

    def get_embedding_dimension(self) -> int:
        """Get embedding dimension."""
        if self._dimension is None:
            # Generate a test embedding to determine dimension
            try:
                test_embedding = self.embed("test")
                self._dimension = len(test_embedding)
            except Exception:
                # Default dimension for nomic-embed-text
                logger.warning(
                    "Could not determine embedding dimension, using default 768"
                )
                self._dimension = 768

        return self._dimension

    def list_available_models(self) -> List[str]:
        """
        List available models on the Ollama instance.

        Returns:
            List of model names
        """
        try:
            response = requests.get(f"{self.host}/api/tags", timeout=5)
            response.raise_for_status()
            data = response.json()
            models = [model["name"] for model in data.get("models", [])]
            return models
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {e}")
            return []
