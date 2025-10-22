import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  @ApiOperation({
    summary: 'Get user chat history',
    description:
      'Retrieves the authenticated user\'s chat message history in reverse chronological order (newest first)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to return',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of messages to skip for pagination',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: [ChatMessageResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  async getChatHistory(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ChatMessageResponseDto[]> {
    return this.chatService.getUserChatHistory(user.id, limit, offset);
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Create a new chat message',
    description:
      'Saves a new chat message for the authenticated user to their history',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat message created successfully',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Message content is invalid or empty',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Valid JWT token required',
  })
  async createChatMessage(
    @CurrentUser() user: User,
    @Body() createChatMessageDto: CreateChatMessageDto,
  ): Promise<ChatMessageResponseDto> {
    return this.chatService.createChatMessage(user.id, createChatMessageDto);
  }
}
