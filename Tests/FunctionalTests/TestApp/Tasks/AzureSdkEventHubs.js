try {
    var eventhubs = require("@azure/event-hubs");

    const client = new eventhubs.EventHubProducerClient("Endpoint=sb://not-a-real-account.servicebus.windows.net/");

    async function sendMessage() {
        try {
            const batch = await client.createBatch();
            batch.tryAdd({ body: "test batch" });
            await client.sendBatch(batch);
        } catch (e) {
            console.error(e.message);
        }
    }

    module.exports = {
        sendMessage
    }
} catch (e) {
    console.log(e.message);
}

module.exports = Object.assign({}, module.exports);
