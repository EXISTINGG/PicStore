import db from '../db/index.js'
import bcrypt from 'bcryptjs'  // 使用 bcryptjs 对用户密码进行加密
import jwt  from 'jsonwebtoken' // 生成 Token 字符串
import nodemailer from 'nodemailer'
import config  from '../config.js'

// 注册账号,验证验证码
const registerUser = async (req,res) => {
  const { username, email, password, code } = req.body;
  const savedCode = codeMap[email];

  if(!username) return res.err('用户名为空')
  if(!password) return res.err('密码为空')
  if(!email) return res.err('邮箱为空')
  if(!code) return res.err('验证码为空')

  // 检查验证码是否过期
  const currentTime = new Date().getTime();
  if (currentTime > codeExpiryMap[email]) {
    console.log(`${email}的验证码已过期`);
    return res.err('验证码验证失败',401);
  }

  if (code && savedCode && code.toString() === savedCode) {
    console.log(`${email}的验证码验证通过`);
    delete codeMap[email]; // 验证通过后删除验证码
  } else {
    console.log(`${email}的验证码验证失败`);
    return res.err('验证码验证失败',401);
  }
  
  try {
    const querySql = `select * from user where username = ? or email = ?`
    // 将结果解构出来
    const [queryRes] = await db.query(querySql, username, email)
    // 用户名是否存在
    if(queryRes.length > 0) return res.err('注册失败：用户名或邮箱已被注册')

    // 对密码进行 bcrype 加密
    const bcrype_password = bcrypt.hashSync(password, 10)

    const registerSql = `insert into user set ?`
    const usesInfo = {username, password: bcrype_password, email,regdate:currentTime}
    const [registeRes] = await db.query(registerSql,usesInfo)
    if(registeRes.affectedRows !== 1) return res.err('注册失败')

    res.send({
      status: 200,
      message: '注册成功'
    })

  } catch (error) {
    console.log(error);
    res.err('注册失败')
  }
}

// 登录账号
const loginAccount = async (req,res) => {
  const { username, email, password, isadmin } = req.body;
  // 中间件已判断是否有值
  // 使用账号名或邮箱登录(邮箱必须为唯一索引)
  if(!username && !email) return res.err('请输入用户名或邮箱')
  if(!password) return res.err('请输入密码')

  try {
    let queryRes
    if (username) {
      // 使用用户名进行查询
      const queryUsernameSql = 'select * from user where username = ?';
      [queryRes] = await db.query(queryUsernameSql, username);
    } else {
      // 使用邮箱进行查询
      const queryEmailSql = 'select * from user where email = ?';
      [queryRes] = await db.query(queryEmailSql, email);
    }
    // 执行 SQL 语句成功，但是查询到数据条数不等于 1
    if (queryRes.length !== 1) return res.err('登入失败')

    // 如果是登录管理界面
    if(isadmin) {
      const power = Number(queryRes[0].power)
      // 如果权限不等于1或2，则不是管理员
      if(power !== 1 && power !== 2) {
        return res.err('你无权进行此操作',403)
      }
    }

    // 判断用户输入的登录密码是否和数据库中的密码一致：
    // 调用 bcrypt.compareSync(用户提交的密码, 数据库中的密码) 方法比较密码是否一致
    const compareResult = bcrypt.compareSync(password, queryRes[0].password)
    // 如果对比的结果等于 false, 则证明用户输入的密码错误
    if (!compareResult) return res.err('登入失败')
    
    // 快速剔除 密码(敏感信息)
    delete queryRes[0].password
    const user = queryRes[0]
    // 生成 Token 字符串
    const tokenStr = jwt.sign(user, config.jwtSecretKey, {expiresIn: config.expiresIn})
    res.send({
      status: 200,
      message: '登陆成功',
      data: {
        token: 'Bearer ' + tokenStr,
        user
      }
    })
  } catch (error) {
    console.log(error);
    res.err('登陆失败')
  }
}

// 邮件发送配置
const transport = nodemailer.createTransport({
  host: 'smtp.qq.com', //连接的邮箱服务器
  secureConnection: true, // 使用 SSL进行加密
  port: 465, // SMTP的端口号
  auth: {
    user: 'existingpicstore@qq.com', // 发送邮件的邮箱
    pass: 'mnzowyyqvazndejf', // 邮箱密码或授权码
  },
});

// 生成验证码(6位数纯数字)
const generateCode = () => {
  const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return code;
};

const codeMap = {}; // 使用对象来存储验证码，以邮箱为键
const codeExpiryMap = {}; // 使用对象来存储验证码的有效期，以邮箱为键

// 发送验证码邮件
const sendCode = (req, res) => {
  const email = req.body.email;
  const code = generateCode();
  console.log(email, code);

  // 设置验证码有效期为5分钟
  const expiryTime = new Date().getTime() + 5 * 60 * 1000;
  codeExpiryMap[email] = expiryTime;

  // 邮件内容
  const mailOptions = {
    from: 'Existing图床 existingpicstore@qq.com', // 发送者邮箱
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
    `,
  };

  // 发送邮件
  transport.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).send('邮件发送失败');
    } else {
      console.log(`验证码已发送至${email}`);
      codeMap[email] = code; // 存储验证码，以邮箱为键
      console.log(1, codeMap[email]); // 添加此行，验证验证码是否正确存储
      res.status(200).send('验证码已发送');
    }
  });
}

export default {
  registerUser,
  loginAccount,
  sendCode,
  
}




