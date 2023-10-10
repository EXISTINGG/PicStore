import Joi from 'joi';


export const changeSysSet_scheam = {
  body: {
    storage_type: Joi.string().valid('0','1'),
    cloud_disk_capacity: Joi.string().allow(''),
    local_disk_capacity: Joi.string().allow('')
  }
}
