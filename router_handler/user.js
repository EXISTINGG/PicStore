import db from '../db/index.js';
import bcrypt from 'bcryptjs'; // 使用 bcryptjs 对用户密码进行加密
import jwt from 'jsonwebtoken'; // 生成 Token 字符串
import nodemailer from 'nodemailer';
import {checkEmail} from '../router_handler/userinfo.js'
import 'dotenv/config';

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const jwtSecretKey = process.env.JWT_SECRETKEY;
const expiresIn = process.env.TOKEN_EXPIRESIN;

/**
 * 生成6位数纯数字验证码
 * @returns {string} 生成的验证码
 */
export const generateCode = () => Math.floor(Math.random() * 1000000).toString().padStart(6, '0')


const codeMap = {} // 使用对象来存储验证码，以邮箱为键
const codeExpiryMap = {} // 使用对象来存储验证码的有效期，以邮箱为键

const passwordResetCodeMap = {}; // 使用对象来存储更改密码的验证码，以邮箱为键
const passwordResetCodeExpiryMap = {}; // 使用对象来存储更改密码验证码的有效期，以邮箱为键

// 邮件发送配置
export const transport = nodemailer.createTransport({
  host: 'smtp.qq.com', //连接的邮箱服务器
  secureConnection: true, // 使用 SSL进行加密
  port: 465, // SMTP的端口号
  auth: {
    user,
    pass
  }
})

/**
 * 发送邮件
 * @param {object} emailContent - 邮件内容
 * @param {string} email - 目标邮箱地址
 * @param {string} code - 验证码
 * @param {object} res - 响应对象
 */
function sendMail (emailContent, email, code, res) {
  // 发送邮件
  transport.sendMail(emailContent, (error, info) => {
    if (error) {
      console.log(error)
      res.err('邮件发送失败', 500)
    } else {
      console.log(`验证码已发送至${email}`)
      codeMap[email] = code // 存储验证码，以邮箱为键
      console.log(1, codeMap[email]) // 添加此行，验证验证码是否正确存储
      res.send({
        status: 200,
        message: '验证码已发送'
      })
    }
  })
}

// 注册账号,验证验证码
const registerUser = async (req, res) => {
  const { username, email, password, code } = req.body
  const savedCode = codeMap[email]

  if (!username) return res.err('用户名为空')
  if (!password) return res.err('密码为空')
  if (!email) return res.err('邮箱为空')
  if (!code) return res.err('验证码为空')

  // 检查验证码是否过期
  const currentTime = Date.now()
  if (currentTime > codeExpiryMap[email]) {
    console.log(`${email}的验证码已过期`)
    return res.err('验证码验证失败', 401)
  }

  if (code && savedCode && code.toString() === savedCode) {
    console.log(`${email}的验证码验证通过`)
    delete codeMap[email] // 验证通过后删除验证码
  } else {
    console.log(`${email}的验证码验证失败`)
    return res.err('验证码验证失败', 401)
  }

  try {
    const querySql = 'SELECT * FROM user WHERE username = ? OR email = ?'
    // 用户注销账号后，如果没有及时删除数据库的数据，会占用用户名和邮箱，即使其状态为1（已注销）。
    // const querySql = `select * from user where (username = ? or email = ?) and status = "1"`
    // 将结果解构出来
    const [queryRes] = await db.query(querySql, [username, email])
    // 用户名是否存在
    if (queryRes.length > 0) return res.err('注册失败：用户名或邮箱已被注册')

    // 对密码进行 bcrype 加密
    const bcrype_password = bcrypt.hashSync(password, 10)

    const registerSql = 'INSERT INTO user SET ?'
    const usesInfo = {
      username,
      password: bcrype_password,
      email,
      registration_time: currentTime
    }
    const [registeRes] = await db.query(registerSql, usesInfo)
    if (registeRes.affectedRows !== 1) return res.err('注册失败')

    res.send({
      status: 200,
      message: '注册成功'
    })
  } catch (error) {
    console.log(error)
    res.err('注册失败', 500)
  }
}

// 登录账号
const loginAccount = async (req, res) => {
  const { username, email, password, isadmin } = req.body
  // 中间件已判断是否有值
  // 使用账号名或邮箱登录
  if (!username && !email) return res.err('请输入用户名或邮箱');
  // if (!password) return res.err('请输入密码')

  try {
    let queryRes
    let querySql
    if (username) {
      // 使用用户名进行查询
      querySql = 'SELECT * FROM user WHERE username = ?';
      [queryRes] = await db.query(querySql, username);
    } else {
      // 使用邮箱进行查询
      querySql = 'SELECT * FROM user WHERE email = ?';
      [queryRes] = await db.query(querySql, email);
    }
    
    // 执行 SQL 语句成功，但是查询到数据条数不等于1或status不等于1(已注销)
    if (queryRes.length !== 1 || queryRes[0].status != 1) return res.err('账号或密码错误')

    const permissions = Number(queryRes[0].permissions)

    // 如果是登录管理界面,权限不等于1或2，则不是管理员
    if (isadmin && permissions !== 1 && permissions !== 2) return res.err('权限不足', 403)
      
    // 判断用户输入的登录密码是否和数据库中的密码一致：
    // 调用 bcrypt.compareSync(用户提交的密码, 数据库中的密码) 方法比较密码是否一致
    const compareResult = bcrypt.compareSync(password, queryRes[0].password)
    // 如果对比的结果等于 false, 则证明用户输入的密码错误
    if (!compareResult) return res.err('账号或密码错误')

    // 快速剔除 密码(敏感信息)
    delete queryRes[0].password
    const user = queryRes[0]
    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, jwtSecretKey, { expiresIn })
    res.send({
      status: 200,
      message: '登录成功',
      data: {
        token: 'Bearer ' + tokenStr,
        user
      }
    })
  } catch (error) {
    console.log(error)
    res.err('登录失败')
  }
}

// 发送注册验证码邮件
const sendCode = (req, res) => {
  const email = req.body.email
  const code = generateCode()
  console.log(email, code)

  // 设置验证码有效期为5分钟
  const expiryTime = Date.now() + 5 * 60 * 1000
  codeExpiryMap[email] = expiryTime

  // 邮件内容
  const emailContent = {
    from: `Existing图床 ${user}`, // 发送者邮箱
    to: email, // 接收者邮箱
    subject: '欢迎使用 Existing图床，验证码提醒', // 邮件主题
    html: `
      <div>
        <h1>欢迎您使用 Existing图床！</h1>
        <p>您的验证码是：<span style="color: blue; font-size: 20px;">${code}</span></p>
        <p>请注意：请勿向任何人透露此验证码，包括本网站的工作人员。本邮件是您注册 Existing图床 的验证码，请勿回复此邮件。</p>
        <p>如果您未在 Existing图床 上进行任何操作，请忽略此邮件。</p>
        <p>验证码将在5分钟内有效，过期后将无法使用。</p>
        <p>谢谢！</p>
      </div>
    `
  }
  sendMail(emailContent, email, code, res)
}

// 发送重置密码验证码
const sendResetPwdEmail = async (req,res) => {
  // 获取邮箱
  const {email} = req.body;
  // 查询邮箱是否存在
  const checkEmailRes = await checkEmail(email);
  if(!checkEmailRes.isExist) return res.err('用户不存在');

  // 生成验证码
  const code = generateCode();

  // 设置验证码有效期为5分钟
  const pwdexpiryTime = Date.now() + 5 * 60 * 1000;
  passwordResetCodeExpiryMap[email] = pwdexpiryTime;

  // 邮件内容
  const emailContent = {
    from: `Existing图床 ${user}`, // 发送者邮箱
    to: email, // 接收者邮箱
    subject: 'Existing图床密码重置验证码提醒', // 邮件主题，更改为密码重置验证码提醒
    html: `
      <div>
        <h1>正在进行密码重置</h1>
        <p>您的验证码是：<span style="color: blue; font-size: 20px;">${code}</span></p>
        <p>请注意：请勿向任何人透露此验证码，包括本网站的工作人员。本邮件是您在 Existing图床 进行密码重置的验证码，请勿回复此邮件。</p>
        <p>如果您未请求密码重置，请忽略此邮件。</p>
        <p>验证码将在5分钟内有效，过期后将无法使用。</p>
        <p>谢谢！</p>
      </div>
    `
  };


  // 发送验证码到邮箱
  transport.sendMail(emailContent, (error, info) => {
    if (error) {
      console.log(error);
      return res.err('邮件发送失败', 500);
    } else {
      console.log(`验证码已发送至${email}`);
      passwordResetCodeMap[email] = code; // 存储验证码，以邮箱为键
      console.log(1, passwordResetCodeMap[email]); // 添加此行，验证验证码是否正确存储
      res.send({
        status: 200,
        message: '验证码已发送'
      })
    }
  });
};

// 验证重置密码的验证码
const checkResetPwdCode = async (req, res) => {
  const {email, code, password} = req.body;
  const savedCode = passwordResetCodeMap[email];

  // 检查验证码是否过期
  const currentTime = Date.now();
  if (currentTime > passwordResetCodeExpiryMap[email]) {
    console.log(`${email}的验证码已过期`);
    return res.err('验证码验证失败', 401);
  };

  if (code && savedCode && code.toString() === savedCode) {
    console.log(`${email}的验证码验证通过`);
    delete codeMap[email]; // 验证通过后删除验证码
  } else {
    console.log(`${email}的验证码验证失败`);
    return res.err('验证码验证失败', 401);
  }

  // 对密码进行 bcrype 加密
  const bcrype_password = bcrypt.hashSync(password, 10)

  try {
    const updateSql = `UPDATE user SET password = ? WHERE email = ?`;
    const [updateRes] = await db.query(updateSql, [bcrype_password, email]);
    console.log(updateRes.affectedRows !== 1);
    if(updateRes.affectedRows !== 1) return res.err('密码重置失败', 500);

    return res.send({status: 200, message: '密码重置成功'});
  } catch (error) {
    console.log(error);
    return res.err('密码重置失败', 500);
  }
};

export default {
  registerUser,
  loginAccount,
  sendCode,
  sendResetPwdEmail,
  checkResetPwdCode
}
