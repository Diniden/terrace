import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkFactsDto {
  @ApiProperty({
    description:
      'UUID of the fact to create a bidirectional link relationship with. ' +
      'Both facts must be in the same corpus and have the same context.',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  linkedFactId: string;
}
