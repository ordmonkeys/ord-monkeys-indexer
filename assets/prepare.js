const fs = require('fs')
const crypto = require('crypto');

const images = fs.readdirSync('./images')

const promises = images.map((path) => {
    return new Promise((resolve, reject) => {
        fs.readFile('./images/'+ path, (err, data) => {
            if (data) {
                const hash = crypto.createHash('sha256');
                hash.update(data)
                const hex = hash.digest('hex');
                resolve({
                    image: path,
                    hash: hex
                })
            } else {
                reject(err)
            }
        })
    });
})

Promise.all(promises).then((results) => {
    const nfts = results.sort((a, b) => {
        return a.image.split('.')[0] - b.image.split('.')[0]
    });
    fs.writeFileSync('./assets.json', JSON.stringify(nfts))
    console.log('done')
}).catch((err) => {console.log(err)})