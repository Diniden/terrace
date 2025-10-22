import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingStatsDto {
  @ApiProperty({
    description: 'Total number of facts in the system',
    example: 1000,
  })
  total: number;

  @ApiProperty({
    description: 'Number of facts successfully embedded',
    example: 950,
  })
  embedded: number;

  @ApiProperty({
    description: 'Number of facts pending embedding',
    example: 40,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of facts with failed embeddings',
    example: 10,
  })
  failed: number;

  @ApiProperty({
    description: 'Percentage of facts successfully embedded',
    example: 95.0,
    minimum: 0,
    maximum: 100,
  })
  completionRate: number;
}
