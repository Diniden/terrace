import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactController } from './fact.controller';
import { FactService } from './fact.service';
import { Fact } from '../../entities/fact.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fact, Corpus, Project, ProjectMember])],
  controllers: [FactController],
  providers: [FactService],
  exports: [FactService],
})
export class FactModule {}
