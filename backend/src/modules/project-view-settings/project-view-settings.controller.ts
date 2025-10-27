import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProjectViewSettingsService } from './project-view-settings.service';
import { SaveSettingsDto } from './dto/save-settings.dto';
import { GetSettingsQueryDto } from './dto/get-settings-query.dto';
import { SettingsResponseDto } from './dto/settings-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('project-view-settings')
@ApiTags('project-view-settings')
@UseGuards(JwtAuthGuard)
@ApiSecurity('bearer')
export class ProjectViewSettingsController {
  constructor(
    private readonly settingsService: ProjectViewSettingsService,
  ) {}

  @Get(':projectId')
  @ApiOperation({ summary: 'Get settings for a project' })
  @ApiParam({
    name: 'projectId',
    type: 'string',
    format: 'uuid',
    description: 'The project ID to retrieve settings for',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully (or null if not found)',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not have access to project' })
  async getSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ): Promise<SettingsResponseDto | null> {
    const settings = await this.settingsService.findOne(
      user.id,
      projectId,
      user,
    );

    if (!settings) {
      return null;
    }

    return {
      id: settings.id,
      userId: settings.userId,
      projectId: settings.projectId,
      settings: settings.settings,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new settings for a project' })
  @ApiResponse({
    status: 201,
    description: 'Settings created successfully',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Settings already exist or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not have access to project' })
  async createSettings(
    @Body() saveSettingsDto: SaveSettingsDto,
    @CurrentUser() user: User,
  ): Promise<SettingsResponseDto> {
    const { projectId, settings } = saveSettingsDto;
    const created = await this.settingsService.create(
      user.id,
      projectId,
      settings,
      user,
    );

    return {
      id: created.id,
      userId: created.userId,
      projectId: created.projectId,
      settings: created.settings,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update existing settings for a project' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not have access to project' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  async updateSettings(
    @Body() saveSettingsDto: SaveSettingsDto,
    @CurrentUser() user: User,
  ): Promise<SettingsResponseDto> {
    const { projectId, settings } = saveSettingsDto;
    const updated = await this.settingsService.update(
      user.id,
      projectId,
      settings,
      user,
    );

    return {
      id: updated.id,
      userId: updated.userId,
      projectId: updated.projectId,
      settings: updated.settings,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update settings for a project (upsert)' })
  @ApiResponse({
    status: 200,
    description: 'Settings created or updated successfully',
    type: SettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not have access to project' })
  async upsertSettings(
    @Body() saveSettingsDto: SaveSettingsDto,
    @CurrentUser() user: User,
  ): Promise<SettingsResponseDto> {
    const { projectId, settings } = saveSettingsDto;
    const result = await this.settingsService.upsert(
      user.id,
      projectId,
      settings,
      user,
    );

    return {
      id: result.id,
      userId: result.userId,
      projectId: result.projectId,
      settings: result.settings,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete settings for a project' })
  @ApiParam({
    name: 'projectId',
    type: 'string',
    format: 'uuid',
    description: 'The project ID to delete settings for',
  })
  @ApiResponse({ status: 204, description: 'Settings deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User does not have access to project' })
  async deleteSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.settingsService.delete(user.id, projectId, user);
  }
}
