const pdfreader = require('pdfreader');
const userAgent = require('user-agents');
const puppeteer = require('puppeteer');
const fs = require('fs');
const useAgent = false;

const bgAccountNumber = ''
const bgUsername = ''
const bgPassword = ''


const timeToWait = (ms) => new Promise((resolve) => setTimeout(() => {
	resolve();
}, ms));


const getData = (page) => {
	return page.evaluate(async (bgAccountNumber) => {
		return await fetch(
				`https://www.britishgas.co.uk/apps/britishgas/components/GetSmartConsumptionData/GET.servlet?selectedAccNumber=${bgAccountNumber}&customerViewPreference=Daily&meterType=Prepay&accountType=Electricity`,
				{
					'headers': {
						'accept': '*/*',
						'accept-language': 'en-US,en;q=0.9',
						'adrum': 'isAjax:true',
						'sec-ch-ua': '"Chromium";v="85", "\\\\Not;A\\"Brand";v="99"',
						'sec-ch-ua-mobile': '?0',
						'sec-fetch-dest': 'empty',
						'sec-fetch-mode': 'cors',
						'sec-fetch-site': 'same-origin',
						'x-requested-with': 'XMLHttpRequest',
					},
					'referrer': `https://www.britishgas.co.uk/Account-History/smartdata-consumption/?accountnumber=${bgAccountNumber}`,
					'referrerPolicy': 'strict-origin-when-cross-origin',
					'body': null,
					'method': 'GET',
					'mode': 'cors',
					'credentials': 'include',
				}).then(res => res.blob()).then(async blob => {
					const stream = blob.stream();
					const reader = stream.getReader();
					let proccess;
					let results = '';
					reader.read().then(proccess = ({done, value}) => {
						if (done) {
							console.log(results + ' end');
							stream.close();
							return;
						}
						if (!done) {
							results += value;
							return reader.read().then(proccess);
						}

					});
				},
		);
	}, bgAccountNumber);
}

const downloadData = (page, browser) => {
	const bytes = [];
	const dataJSON = [];
	const fixedData = [];

	page.on('console', (data) => {
		if (data.text().includes('end')) {
			console.log('creating file', data.text().split(','));
			let fileData = data.text().split(',').filter(e => !e.includes('end'));
			fileData.forEach(b => bytes.push(parseInt(b)));
			const buffer = Buffer.from(bytes);
			let lastDate = '';
			let lastkwh = '';
			new pdfreader.PdfReader().parseBuffer(buffer, (err, item) => {

				if (item && item.text) {
					const date = item.text.match(/^\d+ \w+ \d+/g) || [];
					const kwh = item.text.match(/\d+[.]\d+/g) || [];
					if (date.length > 0 || kwh.length > 0) {
						const data = {
							date: date[0],
							kwh: kwh[0],
						};
						dataJSON.push(data);
					}
				} else if (!item) {
					let count = 0;
					dataJSON.forEach((entry, index) => {
						const date = entry.date;
						const kwh = entry.kwh;
						if (date) {
							lastDate = date;
						} else if (kwh) {
							lastkwh = kwh;
						}
						count++;
						if (count === 2) {
							const correctedData = {
								date: lastDate,
								kwh: lastkwh,
							};
							fixedData.push(correctedData);
							lastDate = '';
							lastkwh = '';
							count = 0;
						}

					});
					fs.writeFileSync(
							`${new Date().toISOString().split('T')[0]}-report.json`,
							Buffer.from(JSON.stringify(fixedData)));
				}

			});
		}
	 browser.close();
	});
}

const fetchReport = async () => {
	const browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		slowMo: 10,
	});
	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	const ua = new userAgent();
	if (useAgent) {
		console.log(ua.random().toString());
		await page.setUserAgent(ua.random().toString());
	}
	await page.goto('https://www.britishgas.co.uk/identity/');
	await timeToWait(1000);
	await page.click('button[class="optanon-allow-all accept-cookies-button"]');
	await page.type('input[type=email]',  bgUsername,
			{delay: 200});
	await page.click('button[id="loginForm-next"]');
	await page.type('button[id="loginForm-next"]', '');
	await page.keyboard.press('Enter');
	await timeToWait(5000);
	await page.type('input[type=password]', bgPassword);
	await page.type('button[id="loginForm-next"]', '');
	await page.keyboard.press('Enter');
	await timeToWait(7000);
	await page.goto(
			`https://www.britishgas.co.uk/Account-History/smartdata-consumption/?accountnumber=${bgAccountNumber}`);
	await getData(page);
	downloadData(page, browser)
};


(async () =>{
	await fetchReport();

})()

