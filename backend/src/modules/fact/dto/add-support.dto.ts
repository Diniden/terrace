import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddSupportDto {
  @IsUUID()
  @IsNotEmpty()
  supportFactId: string;
}
