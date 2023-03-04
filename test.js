const axios = require('axios');
const crypto = require('crypto');

axios.get(`https://turbo.ordinalswallet.com/inscription/content/767d664f4c40d1d7c02866493a2f4cade5eb98219a3fa50c13c3948509dc90c5i0`, 
{
    responseType: 'arraybuffer'
})
    .then(res => {
        const hash = crypto.createHash('sha256');
        hash.update(Buffer.from(res.data))
        const hex = hash.digest('hex');
        console.log(hex)
        doTest();
        require('fs').writeFileSync('./test1.png', res.data)
    });


function doTest() {
    require('fs').readFile('./test.png', (err, data) => {
        const hash = crypto.createHash('sha256');
        hash.update(data)
        const hex = hash.digest('hex');
        console.log(hex)
    })
}