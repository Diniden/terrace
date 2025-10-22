import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the chat message',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The content of the chat message',
    example: 'How do I implement authentication?',
  })
  content: string;

  @ApiProperty({
    description: 'When the message was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
