import path from 'path'
export const baseUploadsPath = './uploads'; // 指定根路径



// 检查根路径
const checkPathRoot = (...filePath) => {
  // 解析为绝对路径
  const resolvedPath = path.resolve(baseUploadsPath, ...filePath);
  // 检查路径是否在指定的根路径下
  if (!resolvedPath.startsWith(path.resolve(baseUploadsPath))) {
    return {
      isLegal: false,
      resolvedPath
    }
  } else {
    return {
      isLegal: true,
      resolvedPath
    }
  }
}
// 检查路径是否包含子目录
const checkPathChild = (resolvedPath, childLength = 1) => {
  const relativePath = path.relative(baseUploadsPath, resolvedPath);
  const containsSubdirectories = relativePath.split(path.sep).length > childLength;
  if (containsSubdirectories) {
    return true
  } else {
    return false
  }
}

export default {
  checkPathRoot,
  checkPathChild
}