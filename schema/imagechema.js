import Joi from 'joi'

// 定义验证规则
const name = Joi.string().min(1).required()
const id = Joi.string().required()

export const deleteImage_schema = {
  body: {
    id,
    name,
  }
}

export const getImage_schema = {
  query: {
    id,
    name,
    batchSize: Joi.number().min(1).max(100).default(30),
    offset: Joi.number().min(0).default(0)
  }
}

export const saveNetImage_schema = {
  body: {
    imgUrl: Joi.string().required(), 
    id, 
    album_name: name,
  }
}