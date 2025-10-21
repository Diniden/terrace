import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Corpus } from './entities/corpus.entity';
import { Fact } from './entities/fact.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'terrace',
  password: process.env.DATABASE_PASSWORD || 'terrace_dev_password',
  database: process.env.DATABASE_NAME || 'terrace',
  entities: [User, Project, ProjectMember, Corpus, Fact],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Never use synchronize with CLI
  logging: true,
});
