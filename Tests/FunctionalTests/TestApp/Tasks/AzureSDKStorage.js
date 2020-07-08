try {
    var storage = require("@azure/storage-blob");

    const containerName = "newcontainer";
    const client = new storage.BlobServiceClient("https://not-a-real-account.blob.core.windows.net");
    const containerClient = client.getContainerClient(containerName);

    function createContainer(callback) {
        containerClient.create().then(_ => {
            callback();
        }).catch(_ => {
            callback()
        });
    }

    function deleteContainer(callback) {
        containerClient.delete().then(_ => {
            callback();
        }).catch(_ => {
            callback()
        });
    }

    module.exports = {
        createContainer, deleteContainer
    }
} catch (e) {
    console.log(e.message);
}

module.exports = Object.assign({}, module.exports);
