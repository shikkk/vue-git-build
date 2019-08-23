const fs = require('fs-extra')
const path = require('path')
const git = require('simple-git')
// const AdmZip = require('adm-zip')
const appPath = process.cwd()
const ora = require('ora')
const ProgressBar = require('progress')
const glob = require('glob')
const uploadFile = require('./libs/upload-file')

const uploadToCDN = false
const dirs = {
  live: path.resolve(appPath, './dist'),
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

const run = async () => {

    console.log(`postbuild`)

    for (const type in dirs) {
        const dir = dirs[type]
        const repo = git(dir)

        console.log('')
        console.log(`${type} `.padEnd(50, '─'))

        if (uploadToCDN) {
            // 获取文件列表
            const files = await new Promise(async (resolve/*, reject*/) => {
                const files = await new Promise(resolve => {
                    glob(
                        path.resolve(dir, 'includes/**/*'),
                        {},
                        (err, files) => {
                            resolve(files.filter(file => (
                                !fs.lstatSync(file).isDirectory()
                            )))
                        }
                    )
                })
                resolve(files)
            })

            {// 上传文件
                const bar = new ProgressBar(
                    `   uploading assets [:bar] :current / :total`,
                    {
                        total: files.length,
                        width: 20,
                        complete: '■',
                        incomplete: '─'
                    }
                )
                // console.log(files)
                await new Promise(resolve => {
                    let chainUpload = new Promise(resolve => resolve())
                    files.forEach((file) => {
                        chainUpload = chainUpload
                            .then(() => uploadFile(file, 'includes', type))
                            .then(() => bar.tick())
                        // .then(() => console.log(`${index + 1} / ${files.length}`))
                        // .then(res => console.log(res))
                    })
                    chainUpload = chainUpload.then(() => resolve())
                })
            }
        }

        { // git 操作
            const waiting = spinner(` commiting & pushing...`)
            await new Promise((resolve/*, reject*/) => {
                // console.log(repo)
                repo.add('./*')
                    .commit(`build ${(new Date()).toLocaleString()}`)
                    .push('origin', branch[type], () => resolve('done'))
                    .exec(() => {
                        resolve()
                    })
                // resolve()
            })
            waiting.finish()
        }

        await new Promise(resolve => setTimeout(() =>
            resolve()
        ), 50)
        console.log(`√  complete`)
        // const waiting = spinner(`${type} uploading assets...`)
        // waiting.finish()
        // .then(() => new Promise((resolve, reject) => {
        //     // console.log(repo)
        //     repo.add('./*')
        //         .commit(`build ${(new Date()).toLocaleString()}`)
        //         .push('origin', branch[type], () => resolve('done'))
        //         .exec(() => {
        //             waiting.finish()
        //             resolve()
        //         })
        //     // resolve()
        // }))
    }

    console.log('')
    console.log(`All complete! ${new Date()}`)
    console.log('')
}

run()
