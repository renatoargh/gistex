#!/usr/bin/env node

const GitHubApi = require('github')
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const { PWD, GITHUB_TOKEN } = process.env
const gistexPath = path.join(PWD, 'gistex.json')
const packagePath = path.join(PWD, 'package.json')

const pkg = require(packagePath)
const config = require(gistexPath)
const files = {}

Object.keys(config.files).forEach(relativeFilePath => {
  const filePath = path.join(PWD, relativeFilePath)

  let gistFileName = relativeFilePath.replace(/\//g, '-').toLowerCase()
  if (gistFileName.startsWith('-')) {
    gistFileName = gistFileName.substring(1)
  }

  files[gistFileName] = {
    content: fs.readFileSync(filePath).toString()
  }
})

const github = new GitHubApi()
github.authenticate({
  type: 'token',
  token: GITHUB_TOKEN
})

const editRequest = {
  id: config.gistId,
  description: pkg.description,
  files: files
}

function printFileUrls (response) {
  Object.keys(response.data.files).forEach(file => {
    const shortcode = `[gist file="${file}"]https://gist.github.com/${config.gistId}[/gist]`
    console.log(shortcode)
  })
}

github.gists.edit(editRequest, (err, response) => {
  if (err) {
    console.log('Error editing files')
    throw err
  }

  const filesToDelete = {}
  Object.keys(response.data.files)
        .filter(existingFile => !Object.keys(files).includes(existingFile))
        .forEach(fileToDelete => { filesToDelete[fileToDelete] = null })

  const deleteRequest = Object.assign(editRequest, {
    files: filesToDelete
  })

  if (!Object.keys(filesToDelete).length) {
    printFileUrls(response)
    return
  }

  github.gists.edit(editRequest, (err, response) => {
    if (err) {
      console.log('Error deleting files')
      throw err
    }

    printFileUrls(response)
  })
})
