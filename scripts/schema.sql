
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash TEXT          NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('requester', 'approver', 'admin')),
    department    VARCHAR(100),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    requires_levels SMALLINT     NOT NULL DEFAULT 1 CHECK (requires_levels IN (1, 2)),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE
);


CREATE TABLE IF NOT EXISTS requests (
    id            SERIAL PRIMARY KEY,
    requester_id  INTEGER       NOT NULL REFERENCES users(id),
    category_id   INTEGER       NOT NULL REFERENCES categories(id),
    title         VARCHAR(200)  NOT NULL,
    description   TEXT          NOT NULL,
    priority      VARCHAR(10)   NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                        'draft', 'pending', 'in_review',
                        'revision', 'approved', 'rejected'
                    )),
    current_level SMALLINT      NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS approval_steps (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER      NOT NULL REFERENCES requests(id),
    approver_id INTEGER      NOT NULL REFERENCES users(id),
    level       SMALLINT     NOT NULL,
    action      VARCHAR(20)  NOT NULL
                    CHECK (action IN ('approved', 'rejected', 'revision_needed')),
    notes       TEXT,
    acted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS attachments (
    id          SERIAL PRIMARY KEY,
    request_id  INTEGER      NOT NULL REFERENCES requests(id),
    file_name   VARCHAR(255) NOT NULL,
    file_url    TEXT         NOT NULL,
    uploaded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    actor_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50)  NOT NULL,
    target_type VARCHAR(50),
    target_id   INTEGER,
    description TEXT,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    recipient_id INTEGER      NOT NULL REFERENCES users(id),
    request_id   INTEGER      REFERENCES requests(id),
    message      TEXT         NOT NULL,
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
