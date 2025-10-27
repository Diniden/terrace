import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectViewSettingsService } from './project-view-settings.service';
import { ProjectViewSettingsController } from './project-view-settings.controller';
import { ProjectViewSettings } from '../../entities/project-view-settings.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectViewSettings, Project, ProjectMember]),
  ],
  controllers: [ProjectViewSettingsController],
  providers: [ProjectViewSettingsService],
  exports: [ProjectViewSettingsService],
})
export class ProjectViewSettingsModule {}
