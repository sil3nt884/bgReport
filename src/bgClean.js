const fs = require('fs')

const byMonth = (data) => {
	let month = {}
	data.forEach(data => {
		const key = `${data.date.split(' ')[1]}:${data.date.split(' ')[2]}`;
		month[key] = {kwh : 0, cost: 0, days: 0}
	})

	data.forEach(data => {
		const key = `${data.date.split(' ')[1]}:${data.date.split(' ')[2]}`;
		month[key].kwh = (month[key].kwh += parseFloat(data.kwh))
		month[key].days =  month[key].days + 1
	})

	data.forEach(data => {
		const key = `${data.date.split(' ')[1]}:${data.date.split(' ')[2]}`;
		let cost = ((month[key].kwh * 17.400 ) + (month[key].days * 28.270)) / 100
		month[key].cost = Math.round(cost)
	})


	return month
}

const readJSON  = () => {
	 const data = JSON.parse(fs.readFileSync(`${new Date().toISOString().split('T')[0]}-report.json`))
	 data.forEach(day => day.cost =  Math.round((((day.kwh *  17.400)) + 28.270)) / 100);
	 const databyMonth = byMonth(data);
	 console.log(databyMonth)

	 fs.writeFileSync(`${new Date().toISOString().split('T')[0]}-report.json`, JSON.stringify(data))
	fs.writeFileSync(`${new Date().toISOString().split('T')[0]}-report-month.json`, JSON.stringify(databyMonth))
}



readJSON()
