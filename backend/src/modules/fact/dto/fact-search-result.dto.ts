import { ApiProperty } from '@nestjs/swagger';
import { Fact } from '../../../entities/fact.entity';

export class FactSearchResultDto {
  @ApiProperty({
    description: 'The fact entity with all relations',
    type: () => Fact,
  })
  fact: Fact;

  @ApiProperty({
    description: 'Similarity score from 0 to 100 (100 = exact match)',
    example: 87.5,
    minimum: 0,
    maximum: 100,
  })
  score: number;

  @ApiProperty({
    description: 'The matched statement text for highlighting',
    example: 'Quantum entanglement is a physical phenomenon...',
  })
  matchedStatement: string;
}
