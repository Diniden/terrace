import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ProjectMember } from '../entities/project-member.entity';
import { Corpus } from '../entities/corpus.entity';
import { Fact } from '../entities/fact.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'terrace',
  password: process.env.DATABASE_PASSWORD || 'terrace_dev_password',
  database: process.env.DATABASE_NAME || 'terrace',
  entities: [User, Project, ProjectMember, Corpus, Fact],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // Run migrations after synchronize in development
  // In production, set synchronize to false and migrationsRun to true
  migrationsRun: process.env.NODE_ENV !== 'development',
};
