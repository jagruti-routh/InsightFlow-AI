CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE meetings (
    meeting_id SERIAL PRIMARY KEY,
    uploaded_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    duration INT,
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(20),
    file_size BIGINT,
    audio_file_path TEXT NOT NULL,
    meeting_status VARCHAR(30) DEFAULT 'Uploaded',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);




CREATE TABLE transcripts (
    transcript_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL UNIQUE,
    transcript_text TEXT NOT NULL,
    language VARCHAR(50),
    processing_time DECIMAL(8,2),
    transcript_version INT DEFAULT 1,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transcript_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);



CREATE TABLE meeting_insights (
    insight_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    summary TEXT,
    keywords TEXT,
    sentiment VARCHAR(50),
    meeting_category VARCHAR(100),
    overall_priority VARCHAR(30),
    confidence_score DECIMAL(5,2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_insight_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);


CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    assigned_to INT,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    priority_level VARCHAR(30),
    deadline DATE,
    status VARCHAR(30) DEFAULT 'Pending',
    completion_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_task_user
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);


CREATE TABLE decisions (
    decision_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    decision_text TEXT NOT NULL,
    decision_category VARCHAR(100),
    importance_level VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_decision_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);





CREATE TABLE risks (
    risk_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    risk_description TEXT NOT NULL,
    risk_level VARCHAR(30),
    mitigation_plan TEXT,
    status VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_risk_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);



CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    report_name VARCHAR(255),
    report_type VARCHAR(50),
    report_format VARCHAR(20),
    file_path TEXT,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_report_user
        FOREIGN KEY (generated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);




CREATE TABLE ai_processing_logs (
    job_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    current_stage VARCHAR(100),
    status VARCHAR(30),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    processing_time DECIMAL(8,2),
    error_message TEXT,
    CONSTRAINT fk_log_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);


CREATE TABLE meeting_participants (
    participant_id SERIAL PRIMARY KEY,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    attendance_status VARCHAR(30),
    joined_at TIMESTAMP,
    CONSTRAINT fk_participant_meeting
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_participant_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);





/* Confirm the Relationships */
SELECT
    t.task_title,
    u.full_name AS assigned_to
FROM tasks t
JOIN users u
ON t.assigned_to = u.user_id;


SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'meetings', COUNT(*) FROM meetings
UNION ALL
SELECT 'meeting_participants', COUNT(*) FROM meeting_participants
UNION ALL
SELECT 'transcripts', COUNT(*) FROM transcripts
UNION ALL
SELECT 'meeting_insights', COUNT(*) FROM meeting_insights
UNION ALL
SELECT 'decisions', COUNT(*) FROM decisions
UNION ALL
SELECT 'risks', COUNT(*) FROM risks
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'ai_processing_logs', COUNT(*) FROM ai_processing_logs;



/* Check the relationships */ 
SELECT
    m.meeting_id,
    m.title,
    u.full_name AS uploaded_by
FROM meetings m
JOIN users u
    ON m.uploaded_by = u.user_id;


	
/* Check tasks + assigned users */
SELECT
    t.task_id,
    t.task_title,
    u.full_name AS assigned_to,
    t.priority_level,
    t.status
FROM tasks t
JOIN users u
    ON t.assigned_to = u.user_id;




/* Check the meeting participants */ 
SELECT
    m.title AS meeting,
    u.full_name AS participant,
    mp.attendance_status
FROM meeting_participants mp
JOIN meetings m
    ON mp.meeting_id = m.meeting_id
JOIN users u
    ON mp.user_id = u.user_id;



/* Check the complete InsightFlow chain */
SELECT
    m.title AS meeting,
    t.transcript_text,
    mi.summary,
    mi.overall_priority
FROM meetings m
JOIN transcripts t
    ON m.meeting_id = t.meeting_id
JOIN meeting_insights mi
    ON m.meeting_id = mi.meeting_id;



/* For FastAPI and Database connec */
ALTER USER postgres WITH PASSWORD 'root';


-------------
SELECT
    meeting_id,
    title,
    meeting_status,
    audio_file_path
FROM meetings
ORDER BY meeting_id DESC;




SELECT
    transcript_id,
    meeting_id,
    transcript_text,
    language,
    processing_time,
    transcript_version
FROM transcripts
ORDER BY transcript_id DESC;


SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'meeting_insights',
      'tasks',
      'risks',
      'ai_processing_logs'
  )
ORDER BY table_name, ordinal_position;


SELECT
    table_name,
    column_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
      'meeting_insights',
      'tasks',
      'risks',
      'ai_processing_logs'
  )
ORDER BY table_name, constraint_type, column_name;


SELECT *
FROM transcripts
WHERE meeting_id = 73;

SELECT *
FROM meetings
WHERE meeting_id = 73;

SELECT *
FROM meeting_insights
WHERE meeting_id = 216;

SELECT *
FROM tasks
WHERE meeting_id = 73;

SELECT *
FROM decisions
WHERE meeting_id = 73;

SELECT *
FROM risks
WHERE meeting_id = 73;

SELECT *
FROM meeting_participants
WHERE meeting_id = 73;

SELECT *
FROM users
ORDER BY user_id;

-----
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN (
    'meeting_insights',
    'tasks',
    'decisions',
    'risks',
    'ai_processing_logs'
)
ORDER BY table_name, ordinal_position;

--------------------------

SELECT
    m.meeting_id,
    m.title,
    m.meeting_status,
    t.transcript_id,
    mi.insight_id,
    mi.sentiment,
    mi.meeting_category,
    mi.overall_priority,
    mi.confidence_score
FROM meetings m
LEFT JOIN transcripts t
    ON m.meeting_id = t.meeting_id
LEFT JOIN meeting_insights mi
    ON m.meeting_id = mi.meeting_id
WHERE m.meeting_id = 74;
----------------


SELECT
    meeting_id,
    title,
    meeting_status
FROM meetings
ORDER BY meeting_id

------
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;

-----
-- Check existing reports
SELECT
    report_id,
    meeting_id,
    report_name,
    report_type,
    report_format,
    file_path,
    generated_by,
    generated_at
FROM reports
ORDER BY report_id;

------
-- Check who uploaded Meeting 74
SELECT
    meeting_id,
    title,
    uploaded_by
FROM meetings
WHERE meeting_id = 74;

----------------------------
SELECT
    report_id,
    meeting_id,
    report_name,
    report_type,
    report_format,
    file_path,
    generated_by,
    generated_at
FROM reports
WHERE meeting_id = 74;

------------------------

SELECT
    job_id,
    meeting_id,
    current_stage,
    status,
    processing_time,
    error_message
FROM ai_processing_logs
WHERE meeting_id = 216;


select * from meetings;

---------------------------
CREATE TABLE IF NOT EXISTS meeting_speaker_segments (
    segment_id SERIAL PRIMARY KEY,
    meeting_id INTEGER NOT NULL,
    speaker VARCHAR(100) NOT NULL,
    start_time NUMERIC(10, 3) NOT NULL,
    end_time NUMERIC(10, 3) NOT NULL,
    transcript_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_meeting_speaker_segments
        FOREIGN KEY (meeting_id)
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE
);

----------------------
select * from meeting_speaker_segments;

-----
SELECT *
FROM ai_processing_logs
	WHERE meeting_id = 216
ORDER BY job_id DESC;















