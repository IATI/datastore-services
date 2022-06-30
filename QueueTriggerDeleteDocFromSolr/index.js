const { deleteDoc } = require('../solr/solr');

module.exports = async (context, deleteMsg) => {
    ['docId', 'collections'].forEach((key) => {
        if (!(key in deleteMsg)) throw Error(`${key} is required in message object`);
    });
    const { docId, collections } = deleteMsg;
    try {
        await Promise.all(
            collections.map(async (collection) => {
                await deleteDoc(docId, collection);
            })
        );
        context.log(
            `Successfully Deleted Documents for iati_activities_document_id: ${docId}, collections: ${collections.join()}`
        );
    } catch (error) {
        context.log(
            `Failed to Delete Documents for iati_activities_document_id: ${docId}, collections: ${collections.join()}. Attempt ${
                context.bindingData.dequeueCount
            }`
        );
        throw error;
    }
};
