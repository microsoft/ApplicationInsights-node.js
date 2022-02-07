try {
    var eventhubs } from "@azure/event-hubs");

    const connectionString = "Endpoint=sb://my-servicebus-namespace.servicebus.windows.net/;SharedAccessKeyName=my-SA-name;SharedAccessKey=my-SA-key;";
    const eventHubName = "my-event-hub"

    const client = new eventhubs.EventHubProducerClient(connectionString, eventHubName);

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
