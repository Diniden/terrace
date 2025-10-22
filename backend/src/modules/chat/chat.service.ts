import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../entities/chat-message.entity';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async getUserChatHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async createChatMessage(
    userId: string,
    createChatMessageDto: CreateChatMessageDto,
  ): Promise<ChatMessage> {
    const { content } = createChatMessageDto;

    if (!content || content.trim() === '') {
      throw new BadRequestException('Message content cannot be empty');
    }

    const chatMessage = this.chatMessageRepository.create({
      userId,
      content: content.trim(),
    });

    return await this.chatMessageRepository.save(chatMessage);
  }
}
