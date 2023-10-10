import Joi from 'joi'

// 定义验证规则
const albumName = Joi.string().min(1).max(10).required()
const privacy = Joi.string().valid('0','1').required()
const id = Joi.string().required()

export const createAlbum_schema = {
  body: {
    albumName,
    privacy
  }
}

export const updateAlbum_schema = {
  body: {
    id,
    albumName,
    // privacy: Joi.string().valid('0','1'),
    newAlbumName: Joi.string().min(1).max(10).allow(''),
    newPrivacy: Joi.string().valid('0','1')
  }
}

export const deleteAlbum_schema = {
  body: {
    id,
    albumName,
  }
}

