import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Fact } from '../../entities/fact.entity';
import { ProjectMember } from '../../entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Project, Corpus, Fact, ProjectMember]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
