CREATE TABLE IF NOT EXISTS outbox_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id   VARCHAR(36) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    event_type     VARCHAR(128) NOT NULL,
    topic          VARCHAR(255) NOT NULL,
    payload        TEXT        NOT NULL,
    status         VARCHAR(16) NOT NULL DEFAULT 'PENDING'
                               CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    error_msg      TEXT,
    retry_count    INT         NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at        TIMESTAMPTZ
);

CREATE INDEX idx_outbox_events_status_created
    ON outbox_events (status, created_at)
    WHERE status = 'PENDING';
