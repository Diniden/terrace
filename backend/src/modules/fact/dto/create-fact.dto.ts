import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FactState, FactContext } from '../../../entities/fact.entity';

export class CreateFactDto {
  @ApiProperty({
    description: 'The fact statement content',
    required: false,
  })
  @IsString()
  @IsOptional()
  statement?: string;

  @ApiProperty({
    description: 'UUID of the corpus this fact belongs to',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  corpusId: string;

  @ApiProperty({
    description: 'UUID of the basis fact (parent fact)',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  basisId?: string;

  @ApiProperty({
    description:
      'Context type for the fact:\n' +
      '- CORPUS_GLOBAL: Foundation facts that define the corpus (no basis allowed)\n' +
      '- CORPUS_BUILDER: Generation guidelines and rules (no basis allowed)\n' +
      '- CORPUS_KNOWLEDGE: Primary knowledge facts that support learning (default)',
    enum: FactContext,
    default: FactContext.CORPUS_KNOWLEDGE,
    required: false,
  })
  @IsEnum(FactContext)
  @IsOptional()
  context?: FactContext;

  @ApiProperty({
    description: 'Current state of the fact',
    enum: FactState,
    default: FactState.CLARIFY,
    required: false,
  })
  @IsEnum(FactState)
  @IsOptional()
  state?: FactState;

  @ApiProperty({
    description: 'Additional metadata for the fact',
    required: false,
  })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;

  @ApiProperty({
    description:
      'UUID of an existing fact that this new fact will link to. ' +
      'Creates a bidirectional link relationship immediately upon fact creation. ' +
      'The target fact must exist and be in the same corpus with matching context.',
    format: 'uuid',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  supportedById?: string;
}
