const P2PoW = require('../P2PoW.js')

function callback(res) {
    console.log(res)
}

P2PoW.importConfigFromFile("./config.json")
    .then(res => {
        P2PoW.sync(30000, callback)
            .then(all_workers => {
                console.log("Found " + Object.keys(all_workers.registered).length + " workers registrations")
                console.log("Found " + Object.keys(all_workers.online).length + " workers online")
            })
    }).catch(err => {
        console.error("Falhou ao tentar importar config.json")
        console.error(err)
    })
