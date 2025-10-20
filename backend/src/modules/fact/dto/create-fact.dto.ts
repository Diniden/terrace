import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FactState } from '../../../entities/fact.entity';

export class CreateFactDto {
  @IsString()
  @IsOptional()
  statement?: string;

  @IsUUID()
  @IsNotEmpty()
  corpusId: string;

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
