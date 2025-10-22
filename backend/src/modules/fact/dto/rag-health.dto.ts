import { ApiProperty } from '@nestjs/swagger';

export class RagHealthDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: string;

  @ApiProperty({
    description: 'Embedding provider name',
    example: 'openai',
  })
  provider: string;

  @ApiProperty({
    description: 'ChromaDB connection status',
    example: 'connected',
  })
  chromadb: string;

  @ApiProperty({
    description: 'Dimension of embedding vectors',
    example: 1536,
    required: false,
  })
  embeddingDimension?: number;

  @ApiProperty({
    description: 'Whether RAG service is enabled',
    example: true,
  })
  enabled: boolean;
}
