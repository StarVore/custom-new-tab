migrate((app) => {
    const collection = new Collection({
        type: "base",
        name: "bookmark_visits",
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
            {
                type: "text",
                name: "bookmarkId",
                required: true,
                max: 64,
            },
            {
                type: "text",
                name: "bookmarkTitle",
                required: true,
                max: 200,
            },
            {
                type: "url",
                name: "bookmarkUrl",
                required: true,
            },
            {
                type: "text",
                name: "source",
                required: true,
                max: 32,
            },
            {
                type: "text",
                name: "context",
                required: false,
                max: 64,
            },
            {
                type: "text",
                name: "platform",
                required: false,
                max: 64,
            },
            {
                type: "text",
                name: "userAgent",
                required: false,
                max: 512,
            },
        ],
        indexes: [
            "CREATE INDEX idx_bookmark_visits_bookmark_id ON bookmark_visits (bookmarkId)",
            "CREATE INDEX idx_bookmark_visits_created ON bookmark_visits (created)",
        ],
    })

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("bookmark_visits")
    return app.delete(collection)
})