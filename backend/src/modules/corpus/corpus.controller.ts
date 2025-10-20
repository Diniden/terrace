import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CorpusService } from './corpus.service';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { UpdateCorpusDto } from './dto/update-corpus.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('corpuses')
@UseGuards(JwtAuthGuard)
export class CorpusController {
  constructor(private readonly corpusService: CorpusService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('projectId') projectId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.corpusService.findAll(user, projectId, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.corpusService.findOne(id, user);
  }

  @Post()
  async create(
    @Body() createCorpusDto: CreateCorpusDto,
    @CurrentUser() user: User,
  ) {
    return this.corpusService.create(createCorpusDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCorpusDto: UpdateCorpusDto,
    @CurrentUser() user: User,
  ) {
    return this.corpusService.update(id, updateCorpusDto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.corpusService.remove(id, user);
    return { message: 'Corpus deleted successfully' };
  }
}
