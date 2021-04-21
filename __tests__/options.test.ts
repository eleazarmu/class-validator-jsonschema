import {
  getFromContainer,
  IS_STRING,
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  MAX_LENGTH,
  MaxLength,
  MetadataStorage,
  ValidateNested,
} from 'class-validator'
import _get from 'lodash.get'

import { validationMetadatasToSchemas } from '../src'

class User {
  @IsDefined()
  @IsString()
  id: string

  @IsEmail() email: string

  @IsOptional()
  @MaxLength(20, { each: true })
  tags: string[]
}

// @ts-ignore: not referenced
class Post {
  @IsOptional()
  @ValidateNested()
  user: User
}

// @ts-ignore: not referenced
class PostUser {
  @IsOptional()
  @ValidateNested()
  post: Post

  @IsOptional()
  @ValidateNested()
  user: User
}

const metadata = _get(getFromContainer(MetadataStorage), 'validationMetadatas')
const defaultSchemas = validationMetadatasToSchemas(metadata)

describe('options', () => {
  it('sets default refPointerPrefix', () => {
    expect(defaultSchemas.Post.properties!.user).toEqual({
      $ref: '#/definitions/User',
    })
  })

  it('handles refPointerPrefix option', () => {
    const schemas = validationMetadatasToSchemas({
      refPointerPrefix: '#/components/schema/',
    })

    expect(schemas.Post.properties!.user).toEqual({
      $ref: '#/components/schema/User',
    })
  })

  it('overwrites default converters with additionalConverters', () => {
    expect(defaultSchemas.User.properties).toEqual({
      email: { format: 'email', type: 'string' },
      id: {
        type: 'string',
        not: { type: 'null' },
      },
      tags: {
        items: { type: 'string', maxLength: 20 },
        type: 'array',
      },
    })

    const schemas = validationMetadatasToSchemas({
      additionalConverters: {
        [IS_STRING]: {
          description: 'A string value',
          type: 'string',
        },
        [MAX_LENGTH]: (meta) => ({
          exclusiveMaximum: true,
          maxLength: meta.constraints[0] + 1,
          type: 'string',
        }),
      },
    })

    expect(schemas.User.properties).toEqual({
      email: { format: 'email', type: 'string' },
      id: {
        description: 'A string value',
        type: 'string',
        not: { type: 'null' },
      },
      tags: {
        items: { exclusiveMaximum: true, type: 'string', maxLength: 21 },
        type: 'array',
      },
    })
  })

  it('handles required properties as per skipMissingProperties option', () => {
    expect(defaultSchemas.User.required).toEqual(['id', 'email'])
    expect(defaultSchemas.Post).not.toHaveProperty('required')

    const schemas = validationMetadatasToSchemas({
      skipMissingProperties: true,
    })
    expect(schemas.User.required).toEqual(['id'])
    expect(defaultSchemas.Post).not.toHaveProperty('required')
  })

  it('doubly nested and multiple nested class with resolveReferences as true', () => {
    const schemas = validationMetadatasToSchemas({
      resolveReferences: true,
    })
    expect(schemas.PostUser).toEqual({
      definitions: {
        User: {
          properties: {
            email: { format: 'email', type: 'string' },
            id: {
              type: 'string',
              not: { type: 'null' },
            },
            tags: {
              items: { type: 'string', maxLength: 20 },
              type: 'array',
            },
          },
          required: ['id', 'email'],
          type: 'object',
        },
        Post: {
          properties: {
            user: {
              $ref: '#/definitions/User',
            },
          },
          type: 'object',
        },
      },
      properties: {
        user: { $ref: '#/definitions/User' },
        post: { $ref: '#/definitions/Post' },
      },
      type: 'object',
    })
  })

  it('custom ref pointer with resolveReferences as true', () => {
    const schemas = validationMetadatasToSchemas({
      resolveReferences: true,
      refPointerPrefix: "#/customName/"
    })
    expect(schemas.PostUser).toEqual({
      customName: {
        User: {
          properties: {
            email: { format: 'email', type: 'string' },
            id: {
              type: 'string',
              not: { type: 'null' },
            },
            tags: {
              items: { type: 'string', maxLength: 20 },
              type: 'array',
            },
          },
          required: ['id', 'email'],
          type: 'object',
        },
        Post: {
          properties: {
            user: {
              $ref: '#/customName/User',
            },
          },
          type: 'object',
        },
      },
      properties: {
        user: { $ref: '#/customName/User' },
        post: { $ref: '#/customName/Post' },
      },
      type: 'object',
    })
  })
})
