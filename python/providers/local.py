"""
Local embedding provider using sentence-transformers.
Runs models locally without requiring external API calls.
"""

import logging
from typing import List
from sentence_transformers import SentenceTransformer
from .base import EmbeddingProvider

logger = logging.getLogger(__name__)


class LocalProvider(EmbeddingProvider):
    """
    Local embedding provider using sentence-transformers.

    This provider runs embedding models locally using the sentence-transformers
    library. It's ideal for development, testing, or production use when you
    want to avoid external API dependencies.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize local provider.

        Args:
            model_name: HuggingFace model name (default: all-MiniLM-L6-v2)

        The default model (all-MiniLM-L6-v2) is lightweight and fast:
        - Dimension: 384
        - Size: ~80MB
        - Good balance of speed and quality

        Other recommended models:
        - all-mpnet-base-v2: 768 dimensions, better quality, larger
        - paraphrase-multilingual-MiniLM-L12-v2: multilingual support
        """
        self.model_name = model_name

        logger.info(f"Loading local model: {model_name}")
        try:
            self.model = SentenceTransformer(model_name)
            self._dimension = self.model.get_sentence_embedding_dimension()
            logger.info(
                f"Successfully loaded {model_name} "
                f"with dimension {self._dimension}"
            )
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise

    def embed(self, text: str) -> List[float]:
        """
        Generate embedding using local model.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding
        """
        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_numpy=True)

            # Convert numpy array to list
            embedding_list = embedding.tolist()

            logger.debug(
                f"Generated local embedding with dimension {len(embedding_list)}"
            )
            return embedding_list

        except Exception as e:
            logger.error(f"Failed to generate local embedding: {e}")
            raise

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts using batch processing.

        Local models can efficiently process batches.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        try:
            # Generate embeddings in batch
            embeddings = self.model.encode(
                texts,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 10  # Show progress for large batches
            )

            # Convert numpy arrays to lists
            embeddings_list = [emb.tolist() for emb in embeddings]

            logger.debug(
                f"Generated {len(embeddings_list)} local embeddings in batch"
            )
            return embeddings_list

        except Exception as e:
            logger.error(f"Failed to generate local batch embeddings: {e}")
            raise

    def get_provider_name(self) -> str:
        """Get provider name."""
        return "local"

    def get_embedding_dimension(self) -> int:
        """Get embedding dimension."""
        return self._dimension

    def get_model_info(self) -> dict:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model information
        """
        return {
            "model_name": self.model_name,
            "dimension": self._dimension,
            "max_seq_length": self.model.max_seq_length,
        }
