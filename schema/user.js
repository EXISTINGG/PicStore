import Joi from 'joi'

// string() 值必须是字符串
// alphanum() 值只能是包含 a-zA-Z0-9 的字符串
// min(length) 最小长度
// max(length) 最大长度
// required() 值是必填项，不能为 undefined
// pattern(正则表达式) 值必须符合正则表达式的规则

// 定义验证规则
const username = Joi.string().alphanum().min(1).max(7).required()
const password = Joi.string().pattern(/^[a-zA-Z0-9]{6,12}$/).required()
const email = Joi.string().email().required()
const isadmin = Joi.string()
const code = Joi.string().pattern(/^[0-9]{6}$/).required()

// 邮箱
export const email_schema = {
  body: {
    email
  }
}

// 注册和登录表单的验证规则对象
export const reg_schema = {
    // 表示需要对 req.body 中的数据进行验证
    // 在此处没有的字段，后面不会有，即使前端上传了字段
    body: {
      username,
      password,
      email,
      code
    }
}
// 登录
export const login_schema = {
  body: {
    username: Joi.string().alphanum().min(1).max(7),
    password,
    email: Joi.string().email(),
    isadmin
  }
}
// 更新用户信息
export const updateinfo_schema = {
  body: {
    username,
  }
}
// 更新密码
export const updatepwd_schema = {
  body: {
    oldPwd: password,
    // 1. joi.ref('oldPwd') 表示 用于引用字段 oldPwd 的值
    // 2. joi.not(joi.ref('oldPwd')) 表示 newPwd 的值不能等于 oldPwd 的值
    // 3. .concat() 用于合并 joi.not(joi.ref('oldPwd')) 和 password 这两条验证规则
    newPwd: Joi.not(Joi.ref('oldPwd')).concat(password),
  }
}

// 更改用户权限
export const updatepermissions_schema = {
  body: {
    setUserName: username,
    setId: Joi.string().required(),
    setPower: Joi.string().max(1).required(),
  }
}

// 更改所需权限
export const changeinterface_schema = {
  body: {
    id: Joi.string().required(),
    setPower: Joi.string().max(1).required(),
    interfaceName: Joi.string().required()
  }
}

// 删除注销的某个用户
export const deleteuser_schema = {
  body: {
    id: Joi.string().required(),
    delUserName: username,
  }
}

// 恢复注销的某个用户
export const restoreuser_schema = {
  body: {
    id: Joi.string().required(),
    restoreUser: username,
  }
}

// 验证新密码及验证码
export const checkpwdcode_schema = {
  body: {
    code,
    password,
    email
  }
}

// 更换邮箱
export const changeemailcode_schema = {
  body: {
    newEmail: email,
    password
  }
}

// 更换邮箱
export const changeemail_schema = {
  body: {
    email,
    code
  }
}

// 查询上传记录
export const uploadLog_schema = {
  query: {
    batchSize: Joi.number().min(1).max(100).default(30),
    offset: Joi.number().min(0).default(0)
  }
}