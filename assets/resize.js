var Jimp = require("jimp")
const fs = require('fs')

const rawImages = fs.readdirSync('./raw-images')
rawImages.forEach((path) => {
    Jimp.read('./raw-images/'+ path).then((image) => {
        image.resize(100, 100).write('./resize-images/'+ path)
    }).catch((err) => {
        console.log(err)
    })
});