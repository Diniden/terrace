import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectViewSettingsService } from './project-view-settings.service';
import { ProjectViewSettings } from '../../entities/project-view-settings.entity';
import { Project } from '../../entities/project.entity';
import {
  ProjectMember,
  ProjectRole,
} from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';

describe('ProjectViewSettingsService', () => {
  let service: ProjectViewSettingsService;
  let settingsRepository: jest.Mocked<Repository<ProjectViewSettings>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectMemberRepository: jest.Mocked<Repository<ProjectMember>>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    applicationRole: ApplicationRole.USER,
  } as User;

  const mockAdminUser: User = {
    id: 'admin-123',
    email: 'admin@example.com',
    applicationRole: ApplicationRole.ADMIN,
  } as User;

  const mockProject: Project = {
    id: 'project-123',
    name: 'Test Project',
    ownerId: 'user-123',
  } as Project;

  const mockSettings = {
    scrollPositions: { corpus1: 100, corpus2: 200 },
    corpusColumnWidths: { corpus1: 300, corpus2: 400 },
    factStackExpansionStates: { fact1: true, fact2: false },
  };

  const mockProjectViewSettings: ProjectViewSettings = {
    id: 'settings-123',
    userId: 'user-123',
    projectId: 'project-123',
    settings: mockSettings,
    user: mockUser,
    project: mockProject,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectViewSettingsService,
        {
          provide: getRepositoryToken(ProjectViewSettings),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectViewSettingsService>(
      ProjectViewSettingsService,
    );
    settingsRepository = module.get(getRepositoryToken(ProjectViewSettings));
    projectRepository = module.get(getRepositoryToken(Project));
    projectMemberRepository = module.get(getRepositoryToken(ProjectMember));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should find settings for user and project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);

      const result = await service.findOne(
        'user-123',
        'project-123',
        mockUser,
      );

      expect(settingsRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-123', projectId: 'project-123' },
        relations: ['user', 'project'],
      });
      expect(result).toEqual(mockProjectViewSettings);
    });

    it('should return null when settings do not exist', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(
        'user-123',
        'project-123',
        mockUser,
      );

      expect(result).toBeNull();
    });

    it('should throw ForbiddenException when user tries to access other user settings', async () => {
      const otherUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      await expect(
        service.findOne('user-123', 'project-123', otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('user-123', 'project-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks project access', async () => {
      const unauthorizedUser: User = {
        id: 'user-456',
        email: 'unauthorized@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      const otherProject: Project = {
        id: 'project-123',
        name: 'Test Project',
        ownerId: 'user-123',
      } as Project;

      projectRepository.findOne.mockResolvedValue(otherProject);
      projectMemberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('user-456', 'project-123', unauthorizedUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create new settings', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);
      settingsRepository.create.mockReturnValue(
        mockProjectViewSettings as any,
      );
      settingsRepository.save.mockResolvedValue(mockProjectViewSettings);

      const result = await service.create(
        'user-123',
        'project-123',
        mockSettings,
        mockUser,
      );

      expect(settingsRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        projectId: 'project-123',
        settings: mockSettings,
      });
      expect(settingsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockProjectViewSettings);
    });

    it('should throw BadRequestException when settings already exist', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);

      await expect(
        service.create('user-123', 'project-123', mockSettings, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user tries to create for another user', async () => {
      const otherUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      await expect(
        service.create('user-123', 'project-123', mockSettings, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid settings structure', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-123', 'project-123', 'invalid' as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when scrollPositions is not an object', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      const invalidSettings = {
        scrollPositions: ['not', 'an', 'object'],
      };

      await expect(
        service.create('user-123', 'project-123', invalidSettings as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-123', 'project-123', mockSettings, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update existing settings', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);

      const updatedSettings = {
        scrollPositions: { corpus1: 500 },
        corpusColumnWidths: { corpus1: 600 },
      };

      const updatedResult = {
        ...mockProjectViewSettings,
        settings: updatedSettings,
      };

      settingsRepository.save.mockResolvedValue(updatedResult);

      const result = await service.update(
        'user-123',
        'project-123',
        updatedSettings,
        mockUser,
      );

      expect(settingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: updatedSettings,
        }),
      );
      expect(result.settings).toEqual(updatedSettings);
    });

    it('should throw NotFoundException when settings do not exist', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'project-123', mockSettings, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user tries to update other user settings', async () => {
      const otherUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      await expect(
        service.update('user-123', 'project-123', mockSettings, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid settings structure', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);

      await expect(
        service.update('user-123', 'project-123', null as any, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('upsert', () => {
    it('should create settings when they do not exist', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);
      settingsRepository.create.mockReturnValue(
        mockProjectViewSettings as any,
      );
      settingsRepository.save.mockResolvedValue(mockProjectViewSettings);

      const result = await service.upsert(
        'user-123',
        'project-123',
        mockSettings,
        mockUser,
      );

      expect(settingsRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        projectId: 'project-123',
        settings: mockSettings,
      });
      expect(settingsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockProjectViewSettings);
    });

    it('should update settings when they exist', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);

      const updatedSettings = {
        scrollPositions: { corpus1: 999 },
      };

      const updatedResult = {
        ...mockProjectViewSettings,
        settings: updatedSettings,
      };

      settingsRepository.save.mockResolvedValue(updatedResult);

      const result = await service.upsert(
        'user-123',
        'project-123',
        updatedSettings,
        mockUser,
      );

      expect(settingsRepository.create).not.toHaveBeenCalled();
      expect(settingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: updatedSettings,
        }),
      );
      expect(result.settings).toEqual(updatedSettings);
    });

    it('should throw ForbiddenException when user tries to upsert for another user', async () => {
      const otherUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      await expect(
        service.upsert('user-123', 'project-123', mockSettings, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid settings structure', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      await expect(
        service.upsert(
          'user-123',
          'project-123',
          ['invalid'] as any,
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.upsert('user-123', 'project-123', mockSettings, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete existing settings', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(mockProjectViewSettings);
      settingsRepository.remove.mockResolvedValue(mockProjectViewSettings);

      await service.delete('user-123', 'project-123', mockUser);

      expect(settingsRepository.remove).toHaveBeenCalledWith(
        mockProjectViewSettings,
      );
    });

    it('should handle non-existent settings gracefully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.delete('user-123', 'project-123', mockUser),
      ).resolves.toBeUndefined();

      expect(settingsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user tries to delete other user settings', async () => {
      const otherUser: User = {
        id: 'other-user',
        email: 'other@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      await expect(
        service.delete('user-123', 'project-123', otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.delete('user-123', 'project-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('authorization', () => {
    it('should allow admin users to access any project', async () => {
      const adminProject: Project = {
        id: 'project-123',
        name: 'Test Project',
        ownerId: 'other-user',
      } as Project;

      projectRepository.findOne.mockResolvedValue(adminProject);
      settingsRepository.findOne.mockResolvedValue(null);

      await service.findOne('admin-123', 'project-123', mockAdminUser);

      // Admin should bypass member checks
      expect(projectMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it('should allow project owner to access their project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      settingsRepository.findOne.mockResolvedValue(null);

      await service.findOne('user-123', 'project-123', mockUser);

      // Owner should bypass member checks
      expect(projectMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it('should check project membership for non-owner users', async () => {
      const viewerUser: User = {
        id: 'viewer-user',
        email: 'viewer@example.com',
        applicationRole: ApplicationRole.USER,
      } as User;

      const projectMember: ProjectMember = {
        id: 'member-1',
        projectId: 'project-123',
        userId: 'viewer-user',
        role: ProjectRole.VIEWER,
      } as ProjectMember;

      projectRepository.findOne.mockResolvedValue(mockProject);
      projectMemberRepository.findOne.mockResolvedValue(projectMember);
      settingsRepository.findOne.mockResolvedValue(null);

      await service.findOne('viewer-user', 'project-123', viewerUser);

      expect(projectMemberRepository.findOne).toHaveBeenCalledWith({
        where: { projectId: 'project-123', userId: 'viewer-user' },
      });
    });
  });
});
