const axios = require('axios');
const crypto = require('crypto');
const ORD_URL = 'https://turbo.ordinalswallet.com';
const assets = require('./assets/assets.json');
const child_process = require('child_process');
const fs = require('fs');
const STORAGE_FILE = './ord-monkeys-indexer.json';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let storage;
function setupStorage() {
    if (!fs.existsSync(STORAGE_FILE)) {
        storage = {};
    } else {
        storage = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    }
    
    if (!storage.monkeys) {
        storage.monkeys = {};
    }
    
    if (!storage.latestOffset) {
        storage.latestOffset = 0;
    }
}

async function getInscriptions({ offset }) {
	const res = await axios.get(`${ORD_URL}/inscriptions`, {
		params: {
			offset,
		},
	});
	console.log('get inscriptions', res.data.length, offset);
	return res.data;
}



function updateGithub() {
	child_process.execSync('git add .');
	try {
		child_process.execSync('git commit -m "auto-update"');
	} catch (err) {
		console.log('Probably no changes');
		return;
	}
	child_process.execSync('git push origin');
}

async function processBatch(inscriptions) {
	const imageInscriptions = inscriptions.filter(
		(it) => it.content_type === 'image/png'
	);
	const promises = imageInscriptions.map(async (it) => {
		const res = await axios.get(`${ORD_URL}/inscription/content/${it.id}`, {
			responseType: 'arraybuffer',
		});
		const hash = crypto.createHash('sha256');
		hash.update(Buffer.from(res.data));
		const hex = hash.digest('hex');
		return {
			hashHex: hex,
			inscription: it,
		};
	});
	const results = await Promise.all(promises);
	for (const result of results) {
		const hashHex = result.hashHex;
		const it = result.inscription;
		const monkey = assets.find((asset) => asset.hash === hashHex);
		if (monkey) {
			console.log(
				`\n\n\n~~~~~~~~~~\n\n\nFound Monkey: ${monkey.image}\n ${monkey.hash} \n\n\n~~~~~~~~~~\n\n\n`
			);
			if (
				!storage.monkeys[monkey.image] ||
				it.num < storage.monkeys[monkey.image].num
			) {
				storage.monkeys[monkey.image] = {
					id: it.id,
					num: it.num,
				};
			}
			fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
		}
	}
}

function markFullyIndexed(topInscriptionNum) {
	console.log(`Fully indexed. Top inscriptionNum is ${topInscriptionNum}`);
    const updateToGithub = topInscriptionNum !== storage.syncedToNum;
    storage.syncedToNum = topInscriptionNum;
	storage.latestOffset = 0;
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
	if (updateToGithub) {
        // only update github if we've actually synced
        updateGithub();
	}
}

let topInscriptionNum;

async function run() {
    setupStorage();
	while (true) {
        const latestOffset = storage.latestOffset ?? 0;
        console.log('latest offset', latestOffset);
        try {
			let inscriptions = await getInscriptions({
                offset: latestOffset
            });
			if (inscriptions.length === 0) {
				markFullyIndexed(topInscriptionNum);
				await delay(10 * 1000);
				continue;
            }
            let currentInscriptionNum = inscriptions[0].num;
            if (latestOffset === 0) {
                topInscriptionNum = currentInscriptionNum;
                console.log(`Top inscriptionNum is ${topInscriptionNum}`);
            } else {
                console.log('Current inscriptions first num:', currentInscriptionNum);
            }
            await processBatch(inscriptions);

            if (
                storage.syncedToNum &&
                inscriptions[0].num < storage.syncedToNum
            ) {
                // we've reached a point where we've already synced.
                // sleep for 10 seconds and try again
                markFullyIndexed(topInscriptionNum);
                await delay(10 * 1000);
                continue;
            }
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
            storage.latestOffset += inscriptions.length;

        } catch (err) {
            console.log('error:', err);
            await delay(2000);
            continue;
        }
	}
}

run();
