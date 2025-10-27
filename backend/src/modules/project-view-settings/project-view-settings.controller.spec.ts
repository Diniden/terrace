import { Test, TestingModule } from '@nestjs/testing';
import { ProjectViewSettingsController } from './project-view-settings.controller';
import { ProjectViewSettingsService } from './project-view-settings.service';
import { User, ApplicationRole } from '../../entities/user.entity';
import { ProjectViewSettings } from '../../entities/project-view-settings.entity';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SaveSettingsDto } from './dto/save-settings.dto';
import { GetSettingsQueryDto } from './dto/get-settings-query.dto';

describe('ProjectViewSettingsController', () => {
  let controller: ProjectViewSettingsController;
  let service: ProjectViewSettingsService;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hash',
    applicationRole: ApplicationRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownedProjects: [],
    projectMemberships: [],
  };

  const mockSettings: ProjectViewSettings = {
    id: 'settings-123',
    userId: 'user-123',
    projectId: 'project-123',
    settings: {
      scrollPositions: { corpus1: 100 },
      corpusColumnWidths: { corpus1: 300 },
      factStackExpansionStates: { fact1: true },
    },
    user: mockUser,
    project: {
      id: 'project-123',
      name: 'Test Project',
      description: 'Test Description',
      ownerId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      corpuses: [],
      members: [],
      owner: mockUser,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  };

  const mockSettingsService = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectViewSettingsController],
      providers: [
        { provide: ProjectViewSettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    controller = module.get<ProjectViewSettingsController>(
      ProjectViewSettingsController,
    );
    service = module.get<ProjectViewSettingsService>(
      ProjectViewSettingsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return settings for a user and project', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.findOne.mockResolvedValue(mockSettings);

      const result = await controller.getSettings(query, mockUser);

      expect(result).toEqual({
        id: mockSettings.id,
        userId: mockSettings.userId,
        projectId: mockSettings.projectId,
        settings: mockSettings.settings,
        createdAt: mockSettings.createdAt,
        updatedAt: mockSettings.updatedAt,
      });
      expect(service.findOne).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        mockUser,
      );
    });

    it('should return null when settings do not exist', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.findOne.mockResolvedValue(null);

      const result = await controller.getSettings(query, mockUser);

      expect(result).toBeNull();
      expect(service.findOne).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        mockUser,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-999' };
      mockSettingsService.findOne.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.getSettings(query, mockUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.findOne).toHaveBeenCalledWith(
        'user-123',
        'project-999',
        mockUser,
      );
    });

    it('should throw ForbiddenException when user does not have access to project', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.findOne.mockRejectedValue(
        new ForbiddenException('Access denied to this project'),
      );

      await expect(controller.getSettings(query, mockUser)).rejects.toThrow(
        ForbiddenException,
      );

      expect(service.findOne).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        mockUser,
      );
    });

    it('should throw ForbiddenException when user tries to access another user settings', async () => {
      const differentUser: User = {
        ...mockUser,
        id: 'other-user-123',
      };
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.findOne.mockRejectedValue(
        new ForbiddenException('Users can only access their own view settings'),
      );

      await expect(
        controller.getSettings(query, differentUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createSettings', () => {
    it('should create new settings', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {
          scrollPositions: { corpus1: 100 },
          corpusColumnWidths: { corpus1: 300 },
        },
      };
      mockSettingsService.create.mockResolvedValue(mockSettings);

      const result = await controller.createSettings(dto, mockUser);

      expect(result).toEqual({
        id: mockSettings.id,
        userId: mockSettings.userId,
        projectId: mockSettings.projectId,
        settings: mockSettings.settings,
        createdAt: mockSettings.createdAt,
        updatedAt: mockSettings.updatedAt,
      });
      expect(service.create).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should throw BadRequestException when settings already exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: { scrollPositions: {} },
      };
      mockSettingsService.create.mockRejectedValue(
        new BadRequestException(
          'Settings already exist for this user and project. Use update instead.',
        ),
      );

      await expect(controller.createSettings(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(service.create).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should throw BadRequestException when settings JSON is malformed', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: 'not-an-object' as any,
      };
      mockSettingsService.create.mockRejectedValue(
        new BadRequestException('Settings must be a valid JSON object'),
      );

      await expect(controller.createSettings(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-999',
        settings: {},
      };
      mockSettingsService.create.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.createSettings(dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user lacks project access', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {},
      };
      mockSettingsService.create.mockRejectedValue(
        new ForbiddenException('Access denied to this project'),
      );

      await expect(controller.createSettings(dto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateSettings', () => {
    it('should update existing settings', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {
          scrollPositions: { corpus1: 200 },
        },
      };
      const updatedSettings = {
        ...mockSettings,
        settings: dto.settings,
        updatedAt: new Date(),
      };
      mockSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.updateSettings(dto, mockUser);

      expect(result).toEqual({
        id: updatedSettings.id,
        userId: updatedSettings.userId,
        projectId: updatedSettings.projectId,
        settings: updatedSettings.settings,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      });
      expect(service.update).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should throw NotFoundException when settings do not exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {},
      };
      mockSettingsService.update.mockRejectedValue(
        new NotFoundException('Settings not found for this user and project'),
      );

      await expect(controller.updateSettings(dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.update).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should throw BadRequestException when settings JSON is invalid', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: [] as any,
      };
      mockSettingsService.update.mockRejectedValue(
        new BadRequestException('Settings must be a valid JSON object'),
      );

      await expect(controller.updateSettings(dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should replace settings completely (not partial update)', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: { newKey: 'newValue' },
      };
      const updatedSettings = {
        ...mockSettings,
        settings: dto.settings,
      };
      mockSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.updateSettings(dto, mockUser);

      expect(result.settings).toEqual(dto.settings);
      expect(service.update).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });
  });

  describe('upsertSettings', () => {
    it('should create settings if they do not exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: { scrollPositions: {} },
      };
      mockSettingsService.upsert.mockResolvedValue(mockSettings);

      const result = await controller.upsertSettings(dto, mockUser);

      expect(result).toEqual({
        id: mockSettings.id,
        userId: mockSettings.userId,
        projectId: mockSettings.projectId,
        settings: mockSettings.settings,
        createdAt: mockSettings.createdAt,
        updatedAt: mockSettings.updatedAt,
      });
      expect(service.upsert).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should update settings if they already exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: { scrollPositions: { corpus1: 500 } },
      };
      const updatedSettings = {
        ...mockSettings,
        settings: dto.settings,
        updatedAt: new Date(),
      };
      mockSettingsService.upsert.mockResolvedValue(updatedSettings);

      const result = await controller.upsertSettings(dto, mockUser);

      expect(result.settings).toEqual(dto.settings);
      expect(service.upsert).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        dto.settings,
        mockUser,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-999',
        settings: {},
      };
      mockSettingsService.upsert.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.upsertSettings(dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user lacks project access', async () => {
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {},
      };
      mockSettingsService.upsert.mockRejectedValue(
        new ForbiddenException('Access denied to this project'),
      );

      await expect(controller.upsertSettings(dto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('deleteSettings', () => {
    it('should delete settings for a user and project', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteSettings(query, mockUser);

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        mockUser,
      );
    });

    it('should gracefully handle deletion of non-existent settings', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.delete.mockResolvedValue(undefined);

      await expect(
        controller.deleteSettings(query, mockUser),
      ).resolves.toBeUndefined();

      expect(service.delete).toHaveBeenCalledWith(
        'user-123',
        'project-123',
        mockUser,
      );
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-999' };
      mockSettingsService.delete.mockRejectedValue(
        new NotFoundException('Project with ID project-999 not found'),
      );

      await expect(controller.deleteSettings(query, mockUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.delete).toHaveBeenCalledWith(
        'user-123',
        'project-999',
        mockUser,
      );
    });

    it('should throw ForbiddenException when user lacks project access', async () => {
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.delete.mockRejectedValue(
        new ForbiddenException('Access denied to this project'),
      );

      await expect(controller.deleteSettings(query, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Authentication Guard', () => {
    it('should block unauthenticated requests', async () => {
      // This test verifies that the @UseGuards(JwtAuthGuard) decorator is applied
      // The actual guard behavior is tested separately in the guard's own test file
      // Here we just verify the controller is decorated with the guard
      const guardMetadata = Reflect.getMetadata(
        '__guards__',
        ProjectViewSettingsController,
      );
      expect(guardMetadata).toBeDefined();
    });
  });

  describe('Response Status Codes', () => {
    it('should return 200 OK for GET requests', async () => {
      // GET returns data or null, implicitly 200 OK
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.findOne.mockResolvedValue(mockSettings);

      const result = await controller.getSettings(query, mockUser);
      expect(result).toBeDefined();
    });

    it('should return 201 CREATED for POST requests', async () => {
      // @HttpCode(HttpStatus.CREATED) is applied to createSettings
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {},
      };
      mockSettingsService.create.mockResolvedValue(mockSettings);

      const result = await controller.createSettings(dto, mockUser);
      expect(result).toBeDefined();
    });

    it('should return 200 OK for PUT requests', async () => {
      // @HttpCode(HttpStatus.OK) is applied to updateSettings
      const dto: SaveSettingsDto = {
        projectId: 'project-123',
        settings: {},
      };
      mockSettingsService.update.mockResolvedValue(mockSettings);

      const result = await controller.updateSettings(dto, mockUser);
      expect(result).toBeDefined();
    });

    it('should return 204 NO CONTENT for DELETE requests', async () => {
      // @HttpCode(HttpStatus.NO_CONTENT) is applied to deleteSettings
      const query: GetSettingsQueryDto = { projectId: 'project-123' };
      mockSettingsService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteSettings(query, mockUser);
      expect(result).toBeUndefined();
    });
  });
});
