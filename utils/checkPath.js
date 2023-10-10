import path from 'path'
export const baseUploadsPath = './uploads' // 指定根路径

// 检查根路径
const checkPathRoot = (...filePath) => {
  // 解析为绝对路径
  const resolvedPath = path.resolve(baseUploadsPath, ...filePath)
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
  // 获取相对路径
  const relativePath = path.relative(baseUploadsPath, resolvedPath)
  console.log(111,relativePath,resolvedPath)
  // 判断相对路径中是否包含子目录
  const containsSubdirectories =
    relativePath.split(path.sep).length > childLength
  // 如果有子目录，则返回true，否则返回false
  if (containsSubdirectories) {
    return true
  } else {
    return false
  }
}

export class PathChecker {
  constructor() {
    this.baseUploadsPath = './uploads'
  }

  /**
   * 检查路径是否在指定的根路径下
   * @param {...string} filePath - 路径的各级目录或文件名
   * @returns {object} - 包含路径合法性和解析后的路径的对象
   * @property {boolean} isLegal - 路径是否合法
   * @property {string} resolvedPath - 解析后的路径
   */
  checkPathRoot(...filePath) {
    // 解析为绝对路径
    const resolvedPath = path.resolve(this.baseUploadsPath, ...filePath)
    // 是否在指定的根路径下
    if (!resolvedPath.startsWith(path.resolve(this.baseUploadsPath))) {
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

  /**
   * 判断相对路径中是否包含子目录
   * @param {string} resolvedPath - 相对路径
   * @param {number} [childLength=1] - 子目录的最小长度，默认为1
   * @returns {boolean} - 是否包含子目录
   */
  checkPathChild(resolvedPath, childLength = 1) {
    const relativePath = path.relative(this.baseUploadsPath, resolvedPath)
    console.log(222,relativePath,resolvedPath);
    const containsSubdirectories =
      relativePath.split(path.sep).length > childLength
    return containsSubdirectories
  }
}

export default {
  checkPathRoot,
  checkPathChild
}
