import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectViewSettings } from '../../entities/project-view-settings.entity';
import { Project } from '../../entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';

interface SettingsStructure {
  scrollPositions?: Record<string, number>;
  corpusColumnWidths?: Record<string, number>;
  factStackExpansionStates?: Record<string, boolean>;
  [key: string]: any;
}

@Injectable()
export class ProjectViewSettingsService {
  constructor(
    @InjectRepository(ProjectViewSettings)
    private readonly settingsRepository: Repository<ProjectViewSettings>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * Find settings for a specific user and project
   */
  async findOne(
    userId: string,
    projectId: string,
    requestingUser: User,
  ): Promise<ProjectViewSettings | null> {
    // Authorization: users can only access their own settings
    if (userId !== requestingUser.id) {
      throw new ForbiddenException(
        'Users can only access their own view settings',
      );
    }

    // Validate project exists and user has access
    await this.validateProjectAccess(projectId, requestingUser);

    const settings = await this.settingsRepository.findOne({
      where: { userId, projectId },
      relations: ['user', 'project'],
    });

    return settings;
  }

  /**
   * Create new settings for user and project
   */
  async create(
    userId: string,
    projectId: string,
    settings: SettingsStructure,
    requestingUser: User,
  ): Promise<ProjectViewSettings> {
    // Authorization: users can only create their own settings
    if (userId !== requestingUser.id) {
      throw new ForbiddenException(
        'Users can only create their own view settings',
      );
    }

    // Validate project exists and user has access
    await this.validateProjectAccess(projectId, requestingUser);

    // Validate settings structure
    this.validateSettingsStructure(settings);

    // Check if settings already exist
    const existing = await this.settingsRepository.findOne({
      where: { userId, projectId },
    });

    if (existing) {
      throw new BadRequestException(
        'Settings already exist for this user and project. Use update instead.',
      );
    }

    const newSettings = this.settingsRepository.create({
      userId,
      projectId,
      settings,
    });

    return this.settingsRepository.save(newSettings);
  }

  /**
   * Update existing settings for user and project
   */
  async update(
    userId: string,
    projectId: string,
    settings: SettingsStructure,
    requestingUser: User,
  ): Promise<ProjectViewSettings> {
    // Authorization: users can only update their own settings
    if (userId !== requestingUser.id) {
      throw new ForbiddenException(
        'Users can only update their own view settings',
      );
    }

    // Validate project exists and user has access
    await this.validateProjectAccess(projectId, requestingUser);

    // Validate settings structure
    this.validateSettingsStructure(settings);

    const existing = await this.settingsRepository.findOne({
      where: { userId, projectId },
    });

    if (!existing) {
      throw new NotFoundException(
        'Settings not found for this user and project',
      );
    }

    // Full replacement of settings JSON
    existing.settings = settings;

    return this.settingsRepository.save(existing);
  }

  /**
   * Upsert operation: create if not exists, update if exists
   */
  async upsert(
    userId: string,
    projectId: string,
    settings: SettingsStructure,
    requestingUser: User,
  ): Promise<ProjectViewSettings> {
    // Authorization: users can only upsert their own settings
    if (userId !== requestingUser.id) {
      throw new ForbiddenException(
        'Users can only manage their own view settings',
      );
    }

    // Validate project exists and user has access
    await this.validateProjectAccess(projectId, requestingUser);

    // Validate settings structure
    this.validateSettingsStructure(settings);

    const existing = await this.settingsRepository.findOne({
      where: { userId, projectId },
    });

    if (existing) {
      // Update existing
      existing.settings = settings;
      return this.settingsRepository.save(existing);
    } else {
      // Create new
      const newSettings = this.settingsRepository.create({
        userId,
        projectId,
        settings,
      });
      return this.settingsRepository.save(newSettings);
    }
  }

  /**
   * Delete settings for user and project
   */
  async delete(
    userId: string,
    projectId: string,
    requestingUser: User,
  ): Promise<void> {
    // Authorization: users can only delete their own settings
    if (userId !== requestingUser.id) {
      throw new ForbiddenException(
        'Users can only delete their own view settings',
      );
    }

    // Validate project exists and user has access
    await this.validateProjectAccess(projectId, requestingUser);

    const settings = await this.settingsRepository.findOne({
      where: { userId, projectId },
    });

    if (!settings) {
      // Gracefully handle non-existent settings
      return;
    }

    await this.settingsRepository.remove(settings);
  }

  /**
   * Validate that project exists and user has access to it
   */
  private async validateProjectAccess(
    projectId: string,
    user: User,
  ): Promise<void> {
    // Check project exists
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Application admins have access to all projects
    if (user.applicationRole === ApplicationRole.ADMIN) {
      return;
    }

    // Project owner has access
    if (project.ownerId === user.id) {
      return;
    }

    // Check project membership (any role grants read access)
    const member = await this.projectMemberRepository.findOne({
      where: { projectId, userId: user.id },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this project');
    }
  }

  /**
   * Validate settings JSON structure
   * Basic validation - ensures it's an object with expected top-level keys
   */
  private validateSettingsStructure(settings: any): void {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new BadRequestException(
        'Settings must be a valid JSON object',
      );
    }

    // Validate that if certain keys exist, they have the right type
    const optionalKeys = [
      'scrollPositions',
      'corpusColumnWidths',
      'factStackExpansionStates',
    ];

    for (const key of optionalKeys) {
      if (
        settings[key] !== undefined &&
        (typeof settings[key] !== 'object' || Array.isArray(settings[key]))
      ) {
        throw new BadRequestException(
          `Settings key '${key}' must be an object`,
        );
      }
    }
  }
}
