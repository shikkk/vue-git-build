const fs = require('fs-extra')
const path = require('path')
const appPath = process.cwd()
// const common = require('../system/webpack/common')
const git = require('simple-git')
const ora = require('ora')

const repoURL = 'git@github.com:shikkk/vue-git-build.git'
const dirs = {
  live: path.resolve(appPath, './build-dist'),
}

const branch = {
  live: 'dist'
}

const spinner = (options = {}) => {
  const waiting = ora(
    Object.assign(
      {
        spinner: 'dots',
        color: 'cyan'
      },
      typeof options === 'string' ? {
        text: options
      } : options
    )
  ).start()

  waiting.finish = (options = {}) => {
    waiting.color = 'green'
    waiting.stopAndPersist(Object.assign({
      symbol: '√'
    }, options))
  }

  return waiting
}

// const arrDirs = [
//     dirs.qa,
//     dirs.live
// ]

const run = async () => {
  // await fs.remove(
  //     path.resolve(appPath, common.outputPath)
  // )
  // await Promise.all(arrDirs.map(
  //     dir => new Promise((resolve, reject) => {
  //         fs.readdir(dir, (err, files) => {
  //             if (err) reject(err)
  //             else resolve(files.filter(filename => filename.substr(0, 1) !== '.'))
  //         })
  //     }).then(files => Promise.all(
  //         files.map(file =>
  //             fs.remove(
  //                 path.resolve(dir, file)
  //             )
  //         )
  //     ))
  // ))
  // 读取package.json里的版本数据
  const {
    version,
    'version-keep': versionKeep,
  } = fs.readJsonSync(path.resolve(__dirname, '../package.json'))
  const versions = [version, versionKeep]

  let chain = new Promise(resolve => resolve())

  for (const type in dirs) {
    const dir = dirs[type]

    chain = chain
      .then(() => new Promise((resolve, reject) => {
        // 确保repo目录
        // 如果不存在，执行clone
        if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory())
          return resolve()

        const waiting = spinner(`${type} directory not exists. cloning...`)

        git().clone(repoURL, dir, [
          '--single-branch',
          `-b${branch[type]}`
        ]).exec(() => {
          waiting.finish()
          resolve()
        })
      }))
      .then(() => new Promise(resolve => {
        const waiting = spinner(`${type} pulling...`)
        git(dir)
          .pull()
          .exec(() => {
            waiting.finish()
            resolve()
          })
      }))
      .then(() => new Promise((resolve, reject) => {
        fs.readdir(dir, (err, files) => {
          if (err) reject(err)
          else resolve(files.filter(filename => {
            // if (
            //     fs.lstatSync(path.resolve(dir, filename)).isDirectory() &&
            //     filename.substr(0, 4) === 'rev-' &&
            //     versions.includes(filename.substr(4))
            // ) {
            //     // const ts = filename.substr(4)
            //     // revisions.push(ts)
            //     return false
            // }
            return filename.substr(0, 1) !== '.'
          }))
        })
      }))
      .then(files => Promise.all(
        files.map(file =>
          fs.remove(
            path.resolve(dir, file)
          )
        )))
      .then(() => console.log(`${type} is now empty`))
  }
}

run()
