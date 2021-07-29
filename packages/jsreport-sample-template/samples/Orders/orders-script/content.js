// server side script fetching remote data and preparing report data source
const https = require('https');

// call remote http rest api
function fetchOrders() {
    return new Promise((resolve, reject) => {
        https.get('https://services.odata.org/V4/Northwind/Northwind.svc/Orders',
        (result) => {
            var str = '';
            result.on('data', (b) => str += b);
            result.on('error', reject);
            result.on('end', () => resolve(JSON.parse(str).value));
        });
    })
}

// group the data for report
async function prepareDataSource() {
    const orders = await fetchOrders()
    const ordersByShipCountry = orders.reduce((a, v) => {
        a[v.ShipCountry] = a[v.ShipCountry] || []
        a[v.ShipCountry].push(v)
        return a
    }, {})

    return Object.keys(ordersByShipCountry).map((country) => {
        const ordersInCountry = ordersByShipCountry[country]

        const accumulated = {}

        ordersInCountry.forEach((o) => {
            o.OrderDate = new Date(o.OrderDate);
            const key = o.OrderDate.getFullYear() + '/' + (o.OrderDate.getMonth() + 1);
            accumulated[key] = accumulated[key] || {
                value: 0,
                orderDate: o.OrderDate
            };
            accumulated[key].value++;
        });

        return {
            rows: ordersInCountry,
            country,
            accumulated
        }

    }).slice(0, 2)
}

// add jsreport hook which modifies the report input data
async function beforeRender(req, res) {
    req.data.orders = await prepareDataSource()
}