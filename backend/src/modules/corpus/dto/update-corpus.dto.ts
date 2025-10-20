import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCorpusDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  basisCorpusId?: string;
}
