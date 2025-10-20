import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorpusController } from './corpus.controller';
import { CorpusService } from './corpus.service';
import { Corpus } from '../../entities/corpus.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Corpus, Project, ProjectMember])],
  controllers: [CorpusController],
  providers: [CorpusService],
  exports: [CorpusService],
})
export class CorpusModule {}
