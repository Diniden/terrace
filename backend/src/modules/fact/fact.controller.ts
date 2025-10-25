import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseUUIDPipe,
  ParseBoolPipe,
  DefaultValuePipe,
  HttpStatus,
  ServiceUnavailableException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { FactService } from './fact.service';
import { CreateFactDto } from './dto/create-fact.dto';
import { UpdateFactDto } from './dto/update-fact.dto';
import { AddSupportDto } from './dto/add-support.dto';
import { SearchFactsDto } from './dto/search-facts.dto';
import { FactSearchResultDto } from './dto/fact-search-result.dto';
import { EmbeddingStatsDto } from './dto/embedding-stats.dto';
import { RagHealthDto } from './dto/rag-health.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { RagSearchService } from '../../rag/rag-search.service';
import { RagEmbeddingService } from '../../rag/rag-embedding.service';
import { RagClientService } from '../../rag/rag-client.service';

@Controller('facts')
@ApiTags('facts')
@UseGuards(JwtAuthGuard)
@ApiSecurity('bearer')
export class FactController {
  constructor(
    private readonly factService: FactService,
    private readonly ragSearchService: RagSearchService,
    private readonly ragEmbeddingService: RagEmbeddingService,
    private readonly ragClientService: RagClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all facts with pagination' })
  @ApiQuery({
    name: 'corpusId',
    required: false,
    description: 'Filter by corpus ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Facts retrieved successfully' })
  async findAll(
    @CurrentUser() user: User,
    @Query('corpusId') corpusId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.factService.findAll(user, corpusId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fact by ID' })
  @ApiResponse({ status: 200, description: 'Fact retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fact not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.factService.findOne(id, user);
  }

  @Get(':id/relationships')
  @ApiOperation({
    summary: 'Get a fact with all relationship context',
    description:
      'Retrieves a fact with complete relationship information including: ' +
      'basis (parent fact), supports (facts this supports), supportedBy (facts supporting this), ' +
      'dependentFacts (facts that use this as basis), and corpus details.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Fact with all relationships retrieved successfully. ' +
      'Includes basis, supports, supportedBy, dependentFacts, and corpus.',
  })
  @ApiResponse({ status: 404, description: 'Fact not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this project' })
  async findOneWithRelationships(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.factService.findOneWithRelationships(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new fact' })
  @ApiResponse({ status: 201, description: 'Fact created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() createFactDto: CreateFactDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.create(createFactDto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fact' })
  @ApiResponse({ status: 200, description: 'Fact updated successfully' })
  @ApiResponse({ status: 404, description: 'Fact not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFactDto: UpdateFactDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.update(id, updateFactDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fact' })
  @ApiResponse({ status: 200, description: 'Fact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fact not found' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.factService.remove(id, user);
    return { message: 'Fact deleted successfully' };
  }

  @Post(':id/support')
  @ApiOperation({ summary: 'Add a supporting fact' })
  @ApiResponse({ status: 201, description: 'Support relationship created' })
  @ApiResponse({ status: 400, description: 'Invalid support relationship' })
  async addSupport(
    @Param('id') id: string,
    @Body() addSupportDto: AddSupportDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.addSupport(id, addSupportDto, user);
  }

  @Delete(':id/support/:supportFactId')
  @ApiOperation({ summary: 'Remove a supporting fact' })
  @ApiResponse({ status: 200, description: 'Support relationship removed' })
  async removeSupport(
    @Param('id') id: string,
    @Param('supportFactId') supportFactId: string,
    @CurrentUser() user: User,
  ) {
    return this.factService.removeSupport(id, supportFactId, user);
  }

  // ============================================================
  // RAG ENDPOINTS - Natural Language Search
  // ============================================================

  @Post('search')
  @ApiOperation({
    summary: 'Search facts using natural language',
    description:
      'Performs semantic search using natural language queries. ' +
      'Returns facts ranked by similarity score (0-100).',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: [FactSearchResultDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query',
  })
  @ApiResponse({
    status: 503,
    description: 'RAG service unavailable',
  })
  async searchFacts(
    @Body() searchDto: SearchFactsDto,
    @CurrentUser() user: User,
  ): Promise<FactSearchResultDto[]> {
    try {
      // Check if RAG service is enabled
      if (!this.ragClientService.isEnabled()) {
        throw new ServiceUnavailableException(
          'RAG service is disabled. Natural language search is not available.',
        );
      }

      // Validate query
      if (!searchDto.query || searchDto.query.trim() === '') {
        throw new BadRequestException('Search query cannot be empty');
      }

      // Perform search
      const results = await this.ragSearchService.searchFactsByNaturalLanguage(
        searchDto.query,
        searchDto.limit || 10,
        searchDto.contextIds,
      );

      // Filter results by user access
      // TODO: Implement proper access control filtering
      // For now, return all results (assuming service layer handles access)

      return results;
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to search facts: ' + error.message,
      );
    }
  }

  @Get(':id/similar')
  @ApiOperation({
    summary: 'Find facts similar to the given fact',
    description:
      'Uses the fact statement to find semantically similar facts. ' +
      'Optionally filters to same corpus only.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 5,
    description: 'Maximum number of similar facts to return',
  })
  @ApiQuery({
    name: 'sameCorpusOnly',
    required: false,
    type: Boolean,
    example: true,
    description: 'Only search within the same corpus',
  })
  @ApiResponse({
    status: 200,
    description: 'Similar facts retrieved successfully',
    type: [FactSearchResultDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Fact not found',
  })
  @ApiResponse({
    status: 503,
    description: 'RAG service unavailable',
  })
  async findSimilarFacts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
    @Query('sameCorpusOnly', new DefaultValuePipe(true), ParseBoolPipe)
    sameCorpusOnly: boolean,
    @CurrentUser() user: User,
  ): Promise<FactSearchResultDto[]> {
    try {
      // Check if RAG service is enabled
      if (!this.ragClientService.isEnabled()) {
        throw new ServiceUnavailableException(
          'RAG service is disabled. Similar facts search is not available.',
        );
      }

      // Verify fact exists and user has access
      await this.factService.findOne(id, user);

      // Find similar facts
      const results = await this.ragSearchService.findSimilarFacts(
        id,
        limit,
        sameCorpusOnly,
      );

      return results;
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error.name === 'NotFoundException'
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to find similar facts: ' + error.message,
      );
    }
  }

  // ============================================================
  // RAG ENDPOINTS - Embedding Management (Admin)
  // ============================================================

  @Post(':id/embeddings/regenerate')
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Manually trigger fact re-embedding (Admin)',
    description:
      'Forces re-embedding of a specific fact. Useful for recovery or model updates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Embedding regeneration triggered',
  })
  @ApiResponse({
    status: 404,
    description: 'Fact not found',
  })
  @ApiResponse({
    status: 503,
    description: 'RAG service unavailable',
  })
  async regenerateEmbedding(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string; factId: string }> {
    try {
      // Check if RAG service is enabled
      if (!this.ragClientService.isEnabled()) {
        throw new ServiceUnavailableException(
          'RAG service is disabled. Cannot regenerate embeddings.',
        );
      }

      // Verify fact exists and user has access
      const fact = await this.factService.findOne(id, user);

      if (!fact.statement || fact.statement.trim() === '') {
        throw new BadRequestException('Cannot embed fact without statement');
      }

      // Trigger embedding
      await this.ragEmbeddingService.processFactEmbedding(id);

      return {
        message: 'Embedding regeneration triggered successfully',
        factId: id,
      };
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException ||
        error.name === 'NotFoundException'
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to regenerate embedding: ' + error.message,
      );
    }
  }

  @Get('embeddings/status')
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Get embedding statistics (Admin)',
    description: 'Returns statistics about fact embeddings in the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Embedding statistics retrieved',
    type: EmbeddingStatsDto,
  })
  async getEmbeddingStatus(): Promise<EmbeddingStatsDto> {
    const stats = await this.ragEmbeddingService.getEmbeddingStats();

    const completionRate =
      stats.total > 0 ? (stats.embedded / stats.total) * 100 : 0;

    return {
      ...stats,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  @Post('embeddings/process')
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Process pending embeddings (Admin)',
    description:
      'Processes facts with pending embedding status. ' +
      'Useful for batch processing or recovery.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
    description: 'Maximum number of facts to process',
  })
  @ApiResponse({
    status: 200,
    description: 'Processing started',
  })
  @ApiResponse({
    status: 503,
    description: 'RAG service unavailable',
  })
  async processPendingEmbeddings(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ): Promise<{ message: string; processed: number }> {
    try {
      // Check if RAG service is enabled
      if (!this.ragClientService.isEnabled()) {
        throw new ServiceUnavailableException(
          'RAG service is disabled. Cannot process embeddings.',
        );
      }

      // Get pending count before processing
      const statsBefore = await this.ragEmbeddingService.getEmbeddingStats();
      const pendingCount = Math.min(statsBefore.pending, limit);

      // Process pending embeddings
      await this.ragEmbeddingService.processPendingEmbeddings(limit);

      return {
        message: `Processing ${pendingCount} pending embeddings`,
        processed: pendingCount,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to process pending embeddings: ' + error.message,
      );
    }
  }

  @Get('embeddings/health')
  @ApiTags('admin')
  @ApiOperation({
    summary: 'Check RAG service health (Admin)',
    description:
      'Returns health status of the RAG service and its dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved',
    type: RagHealthDto,
  })
  async checkRagHealth(): Promise<RagHealthDto> {
    try {
      const enabled = this.ragClientService.isEnabled();

      if (!enabled) {
        return {
          status: 'disabled',
          provider: 'unknown',
          chromadb: 'unknown',
          enabled: false,
        };
      }

      const healthResponse = await this.ragClientService.healthCheck();

      if (this.ragClientService.isError(healthResponse)) {
        return {
          status: 'unhealthy',
          provider: 'unknown',
          chromadb: 'disconnected',
          enabled: true,
        };
      }

      return {
        status: healthResponse.status,
        provider: healthResponse.provider,
        chromadb: healthResponse.chromadb,
        embeddingDimension: healthResponse.embedding_dimension,
        enabled: true,
      };
    } catch (error) {
      return {
        status: 'error',
        provider: 'unknown',
        chromadb: 'error',
        enabled: this.ragClientService.isEnabled(),
      };
    }
  }
}
