# 使用 Node.js v16.18.0 作为基础镜像
FROM node:16.18.0

# 设置工作目录
WORKDIR /app

# 将 package.json 和 package-lock.json 复制到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 将项目文件复制到工作目录
COPY . .

# 暴露应用程序使用的端口
EXPOSE 80

# 启动应用程序
CMD [ "node", "app.js" ]
