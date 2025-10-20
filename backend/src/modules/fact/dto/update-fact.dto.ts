import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FactState } from '../../../entities/fact.entity';

export class UpdateFactDto {
  @IsString()
  @IsOptional()
  statement?: string;

  @IsUUID()
  @IsOptional()
  corpusId?: string;

  @IsUUID()
  @IsOptional()
  basisId?: string;

  @IsEnum(FactState)
  @IsOptional()
  state?: FactState;

  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;
}
