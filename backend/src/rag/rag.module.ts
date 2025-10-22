import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fact } from '../entities/fact.entity';
import { RagClientService } from './rag-client.service';
import { RagEmbeddingService } from './rag-embedding.service';
import { RagSearchService } from './rag-search.service';

/**
 * RAG Module for Retrieval-Augmented Generation integration
 *
 * Provides services for:
 * - HTTP communication with Python RAG service (RagClientService)
 * - Automatic fact embedding lifecycle management (RagEmbeddingService)
 * - Natural language fact search (RagSearchService)
 *
 * Configuration:
 * - RAG_SERVICE_HOST: Python RAG service host (default: http://localhost)
 * - RAG_SERVICE_PORT: Python RAG service port (default: 8001)
 * - RAG_SERVICE_ENABLED: Enable/disable RAG features (default: true)
 *
 * All services are exported for use in other modules (e.g., FactModule)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forFeature([Fact]),
  ],
  providers: [RagClientService, RagEmbeddingService, RagSearchService],
  exports: [RagClientService, RagEmbeddingService, RagSearchService],
})
export class RagModule {}
