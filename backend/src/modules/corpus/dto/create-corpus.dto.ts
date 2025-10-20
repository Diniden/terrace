import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCorpusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsUUID()
  @IsOptional()
  basisCorpusId?: string;
}
