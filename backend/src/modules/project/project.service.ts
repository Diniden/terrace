import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember, ProjectRole } from '../../entities/project-member.entity';
import { User, ApplicationRole } from '../../entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {}

  async findAll(
    user: User,
    page = 1,
    limit = 10,
  ): Promise<{ data: Project[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    // Admin can see all projects
    if (user.applicationRole === ApplicationRole.ADMIN) {
      const [data, total] = await this.projectRepository.findAndCount({
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
        relations: ['owner'],
      });

      return { data, total, page, limit };
    }

    // Regular users see only their projects and projects they're members of
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoin('project.members', 'member')
      .where('project.ownerId = :userId', { userId: user.id })
      .orWhere('member.userId = :userId', { userId: user.id })
      .skip(skip)
      .take(limit)
      .orderBy('project.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Check access
    await this.checkAccess(project, user, ProjectRole.VIEWER);

    return project;
  }

  async create(createProjectDto: CreateProjectDto, user: User): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      ownerId: user.id,
    });

    const savedProject = await this.projectRepository.save(project);

    // Add owner as a project member with OWNER role
    const ownerMember = this.projectMemberRepository.create({
      projectId: savedProject.id,
      userId: user.id,
      role: ProjectRole.OWNER,
    });

    await this.projectMemberRepository.save(ownerMember);

    return this.findOne(savedProject.id, user);
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    user: User,
  ): Promise<Project> {
    const project = await this.findOne(id, user);

    // Only OWNER, ADMIN, or MAINTAINER can update
    await this.checkAccess(project, user, ProjectRole.MAINTAINER);

    Object.assign(project, updateProjectDto);
    await this.projectRepository.save(project);

    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id, user);

    // Only OWNER or application ADMIN can delete
    if (
      project.ownerId !== user.id &&
      user.applicationRole !== ApplicationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can delete projects',
      );
    }

    await this.projectRepository.remove(project);
  }

  async addMember(
    id: string,
    addMemberDto: AddMemberDto,
    user: User,
  ): Promise<ProjectMember> {
    const project = await this.findOne(id, user);

    // Only OWNER or ADMIN can add members
    await this.checkAccess(project, user, ProjectRole.ADMIN);

    // Check if member already exists
    const existingMember = await this.projectMemberRepository.findOne({
      where: { projectId: id, userId: addMemberDto.userId },
    });

    if (existingMember) {
      // Update role if member exists
      existingMember.role = addMemberDto.role;
      return this.projectMemberRepository.save(existingMember);
    }

    const member = this.projectMemberRepository.create({
      projectId: id,
      userId: addMemberDto.userId,
      role: addMemberDto.role,
    });

    return this.projectMemberRepository.save(member);
  }

  async removeMember(
    id: string,
    userId: string,
    user: User,
  ): Promise<void> {
    const project = await this.findOne(id, user);

    // Only OWNER or ADMIN can remove members
    await this.checkAccess(project, user, ProjectRole.ADMIN);

    // Cannot remove the owner
    if (project.ownerId === userId) {
      throw new ForbiddenException('Cannot remove project owner');
    }

    const member = await this.projectMemberRepository.findOne({
      where: { projectId: id, userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    await this.projectMemberRepository.remove(member);
  }

  private async checkAccess(
    project: Project,
    user: User,
    requiredRole: ProjectRole,
  ): Promise<void> {
    // Application admins have full access
    if (user.applicationRole === ApplicationRole.ADMIN) {
      return;
    }

    // Project owner has full access
    if (project.ownerId === user.id) {
      return;
    }

    // Check project membership
    const member = await this.projectMemberRepository.findOne({
      where: { projectId: project.id, userId: user.id },
    });

    if (!member) {
      throw new ForbiddenException('Access denied to this project');
    }

    // Role hierarchy: OWNER > ADMIN > MAINTAINER > CONTRIBUTOR > VIEWER
    const roleHierarchy = {
      [ProjectRole.OWNER]: 5,
      [ProjectRole.ADMIN]: 4,
      [ProjectRole.MAINTAINER]: 3,
      [ProjectRole.CONTRIBUTOR]: 2,
      [ProjectRole.VIEWER]: 1,
    };

    if (roleHierarchy[member.role] < roleHierarchy[requiredRole]) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
  }
}
