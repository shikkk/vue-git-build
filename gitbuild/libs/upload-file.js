const path = require('path')
// const fs = require('fs-extra')
const COS = require('cos-nodejs-sdk-v5')


// 创建
const cos = new COS()

const upload = async (file, baseDir, prefixDir) => new Promise((resolve, reject) => {
  const {
    dir: _dir, base
  } = path.parse(file)

  const dir = _dir.substr(0, 2) === './' ? _dir.substr(2) : _dir
  prefixDir = prefixDir ? `${prefixDir}/` : ''

  let key
  if (baseDir) {
    key = dir.split(baseDir)
    key = key[key.length - 1]
    if (key.substr(0, 1) === path.sep)
      key = key.substr(1)
    key = 'cmshop_h5/' + prefixDir + key + '/' + base
  } else {
    key = 'cmshop_h5/' + prefixDir + base
  }

  // console.log(file, key)
  // resolve()
  const update = (onSuccess) => cos.sliceUploadFile({
    Bucket: '',
    Region: '',
    Key: key,
    FilePath: file
  }, function (err, data) {
    if (err) {
      // console.log(err)
      // console.log('retrying...')
      return update(onSuccess)
    }
    return onSuccess(data)
  })

  update(data => resolve(data))
})


module.exports = upload
