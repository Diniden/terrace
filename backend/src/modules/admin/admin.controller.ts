import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';
import type { ModelMetadata } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('models')
  getModels(): ModelMetadata[] {
    return this.adminService.getModels();
  }

  @Get('models/:modelName/metadata')
  getModelMetadata(@Param('modelName') modelName: string): ModelMetadata {
    return this.adminService.getModelMetadata(modelName);
  }

  @Get('models/:modelName')
  async findAll(
    @Param('modelName') modelName: string,
    @Query() filters: Record<string, any>,
  ) {
    return this.adminService.findAll(modelName, filters);
  }

  @Get('models/:modelName/:id')
  async findOne(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
  ) {
    return this.adminService.findOne(modelName, id);
  }

  @Post('models/:modelName')
  async create(
    @Param('modelName') modelName: string,
    @Body() data: Record<string, any>,
  ) {
    return this.adminService.create(modelName, data);
  }

  @Put('models/:modelName/:id')
  async update(
    @Param('modelName') modelName: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    return this.adminService.update(modelName, id, data);
  }

  @Delete('models/:modelName/:id')
  async delete(@Param('modelName') modelName: string, @Param('id') id: string) {
    await this.adminService.delete(modelName, id);
    return { success: true };
  }
}
