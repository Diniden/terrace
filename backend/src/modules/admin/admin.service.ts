import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DataSource,
  Repository,
  ObjectLiteral,
  FindOptionsWhere,
} from 'typeorm';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Corpus } from '../../entities/corpus.entity';
import { Fact } from '../../entities/fact.entity';
import { ProjectMember } from '../../entities/project-member.entity';

export interface ModelMetadata {
  name: string;
  displayName: string;
  fields: FieldMetadata[];
  relations: RelationMetadata[];
}

export interface FieldMetadata {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isEnum: boolean;
  enumValues?: (string | number)[];
}

export interface RelationMetadata {
  name: string;
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
  relatedModel: string;
}

@Injectable()
export class AdminService {
  private modelMap: Map<string, any>;

  constructor(private dataSource: DataSource) {
    this.modelMap = new Map<string, any>([
      ['users', User],
      ['projects', Project],
      ['corpuses', Corpus],
      ['facts', Fact],
      ['project-members', ProjectMember],
    ]);
  }

  getModels(): ModelMetadata[] {
    const models: ModelMetadata[] = [];

    for (const [name, entity] of this.modelMap) {
      const metadata = this.dataSource.getMetadata(entity);
      const fields: FieldMetadata[] = metadata.columns.map((col) => ({
        name: col.propertyName,
        type: col.type as string,
        nullable: col.isNullable,
        isPrimary: col.isPrimary,
        isEnum: !!col.enum,
        enumValues: col.enum ? Object.values(col.enum) : undefined,
      }));

      const relations: RelationMetadata[] = metadata.relations.map((rel) => ({
        name: rel.propertyName,
        type: rel.isManyToMany
          ? 'many-to-many'
          : rel.isManyToOne
            ? 'many-to-one'
            : 'one-to-many',
        relatedModel: this.getModelNameByEntity(rel.type),
      }));

      models.push({
        name,
        displayName: metadata.name,
        fields,
        relations,
      });
    }

    return models;
  }

  getModelMetadata(modelName: string): ModelMetadata {
    const entity = this.getEntityByModelName(modelName);
    const metadata = this.dataSource.getMetadata(entity);

    const fields: FieldMetadata[] = metadata.columns.map((col) => ({
      name: col.propertyName,
      type: col.type as string,
      nullable: col.isNullable,
      isPrimary: col.isPrimary,
      isEnum: !!col.enum,
      enumValues: col.enum ? Object.values(col.enum) : undefined,
    }));

    const relations: RelationMetadata[] = metadata.relations.map((rel) => ({
      name: rel.propertyName,
      type: rel.isManyToMany
        ? 'many-to-many'
        : rel.isManyToOne
          ? 'many-to-one'
          : 'one-to-many',
      relatedModel: this.getModelNameByEntity(rel.type),
    }));

    return {
      name: modelName,
      displayName: metadata.name,
      fields,
      relations,
    };
  }

  async findAll(
    modelName: string,
    filters?: Record<string, any>,
  ): Promise<ObjectLiteral[]> {
    const repository = this.getRepository(modelName);
    const metadata = this.getModelMetadata(modelName);

    const relations = metadata.relations.map((rel) => rel.name);

    const where: FindOptionsWhere<any> = {};
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== null) {
          where[key] = filters[key];
        }
      });
    }

    return repository.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations,
    });
  }

  async findOne(modelName: string, id: string): Promise<ObjectLiteral> {
    const repository = this.getRepository(modelName);
    const metadata = this.getModelMetadata(modelName);

    const relations = metadata.relations.map((rel) => rel.name);

    const entity = await repository.findOne({
      where: { id } as any,
      relations,
    });

    if (!entity) {
      throw new NotFoundException(`${modelName} with id ${id} not found`);
    }

    return entity;
  }

  async create(
    modelName: string,
    data: Record<string, any>,
  ): Promise<ObjectLiteral> {
    const repository = this.getRepository(modelName);
    const entity = repository.create(data);
    return repository.save(entity);
  }

  async update(
    modelName: string,
    id: string,
    data: Record<string, any>,
  ): Promise<ObjectLiteral> {
    const repository = this.getRepository(modelName);
    const entity = await this.findOne(modelName, id);

    Object.assign(entity, data);
    return repository.save(entity);
  }

  async delete(modelName: string, id: string): Promise<void> {
    const repository = this.getRepository(modelName);
    const entity = await this.findOne(modelName, id);
    await repository.remove(entity);
  }

  private getRepository(modelName: string): Repository<any> {
    const entity = this.getEntityByModelName(modelName);
    return this.dataSource.getRepository(entity);
  }

  private getEntityByModelName(modelName: string): any {
    const entity = this.modelMap.get(modelName);
    if (!entity) {
      throw new NotFoundException(`Model ${modelName} not found`);
    }
    return entity;
  }

  private getModelNameByEntity(entity: any): string {
    for (const [name, ent] of this.modelMap) {
      if (ent === entity) {
        return name;
      }
    }
    return 'unknown';
  }
}
