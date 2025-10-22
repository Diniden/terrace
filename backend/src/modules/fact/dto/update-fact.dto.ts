import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FactState, FactContext } from '../../../entities/fact.entity';

export class UpdateFactDto {
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
    required: false,
  })
  @IsUUID()
  @IsOptional()
  corpusId?: string;

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
    required: false,
  })
  @IsEnum(FactContext)
  @IsOptional()
  context?: FactContext;

  @ApiProperty({
    description: 'Current state of the fact',
    enum: FactState,
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
}
