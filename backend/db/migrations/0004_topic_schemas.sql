CREATE TABLE topic_schemas (
    connection_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('avro', 'protobuf')),
    schema_text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (connection_id, topic, format)
);
