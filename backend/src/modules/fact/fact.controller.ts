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
import { FactService } from './fact.service';
import { CreateFactDto } from './dto/create-fact.dto';
import { UpdateFactDto } from './dto/update-fact.dto';
import { AddSupportDto } from './dto/add-support.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('facts')
@UseGuards(JwtAuthGuard)
export class FactController {
  constructor(private readonly factService: FactService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('corpusId') corpusId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.factService.findAll(user, corpusId, page, limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.factService.findOne(id, user);
  }

  @Post()
  async create(
    @Body() createFactDto: CreateFactDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.create(createFactDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFactDto: UpdateFactDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.update(id, updateFactDto, user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.factService.remove(id, user);
    return { message: 'Fact deleted successfully' };
  }

  @Post(':id/support')
  async addSupport(
    @Param('id') id: string,
    @Body() addSupportDto: AddSupportDto,
    @CurrentUser() user: User,
  ) {
    return this.factService.addSupport(id, addSupportDto, user);
  }

  @Delete(':id/support/:supportFactId')
  async removeSupport(
    @Param('id') id: string,
    @Param('supportFactId') supportFactId: string,
    @CurrentUser() user: User,
  ) {
    return this.factService.removeSupport(id, supportFactId, user);
  }
}
