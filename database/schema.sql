-- Microorganism Detection Database Schema
-- SQLite Database Schema for the Detection System

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Detection table - stores main detection records
CREATE TABLE IF NOT EXISTS detection (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_image_path TEXT NOT NULL,
    processed_image_path TEXT,
    detection_results TEXT, -- JSON string
    confidence_scores TEXT, -- JSON string  
    detected_organisms TEXT, -- JSON string
    water_usage_recommendations TEXT, -- JSON string
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Organisms table - reference table for organism types
CREATE TABLE IF NOT EXISTS organisms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    scientific_name TEXT,
    gram_type TEXT CHECK (gram_type IN ('positive', 'negative', 'variable')),
    shape TEXT CHECK (shape IN ('cocci', 'bacilli', 'spirilla', 'vibrio')),
    pathogenicity TEXT CHECK (pathogenicity IN ('pathogenic', 'non-pathogenic', 'opportunistic')),
    description TEXT,
    treatment_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Detection_organisms junction table - many-to-many relationship
CREATE TABLE IF NOT EXISTS detection_organisms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_id TEXT NOT NULL,
    organism_id INTEGER NOT NULL,
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    bbox_x1 INTEGER,
    bbox_y1 INTEGER,
    bbox_x2 INTEGER,
    bbox_y2 INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detection(id) ON DELETE CASCADE,
    FOREIGN KEY (organism_id) REFERENCES organisms(id) ON DELETE CASCADE
);

-- Water_quality table - stores water quality assessments
CREATE TABLE IF NOT EXISTS water_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_id TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    safe_uses TEXT, -- JSON array
    unsafe_uses TEXT, -- JSON array
    treatment_required TEXT, -- JSON array
    ph_estimate REAL,
    turbidity_estimate TEXT,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (detection_id) REFERENCES detection(id) ON DELETE CASCADE
);

-- System_stats table - stores system performance statistics
CREATE TABLE IF NOT EXISTS system_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    total_detections INTEGER DEFAULT 0,
    successful_detections INTEGER DEFAULT 0,
    failed_detections INTEGER DEFAULT 0,
    average_processing_time REAL,
    most_detected_organism TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- User_sessions table - track user sessions (optional)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    session_data TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_detection_timestamp ON detection(timestamp);
CREATE INDEX IF NOT EXISTS idx_detection_status ON detection(status);
CREATE INDEX IF NOT EXISTS idx_detection_organisms_detection_id ON detection_organisms(detection_id);
CREATE INDEX IF NOT EXISTS idx_detection_organisms_organism_id ON detection_organisms(organism_id);
CREATE INDEX IF NOT EXISTS idx_water_quality_detection_id ON water_quality(detection_id);
CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Create triggers for maintaining system stats
CREATE TRIGGER IF NOT EXISTS update_stats_on_detection_insert
AFTER INSERT ON detection
WHEN NEW.status = 'completed' OR NEW.status = 'failed'
BEGIN
    INSERT OR IGNORE INTO system_stats (date, total_detections, successful_detections, failed_detections)
    VALUES (date('now'), 0, 0, 0);
    
    UPDATE system_stats 
    SET 
        total_detections = total_detections + 1,
        successful_detections = successful_detections + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        failed_detections = failed_detections + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
    WHERE date = date('now');
END;

CREATE TRIGGER IF NOT EXISTS update_stats_on_detection_update
AFTER UPDATE ON detection
WHEN NEW.status != OLD.status AND (NEW.status = 'completed' OR NEW.status = 'failed')
BEGIN
    INSERT OR IGNORE INTO system_stats (date, total_detections, successful_detections, failed_detections)
    VALUES (date('now'), 0, 0, 0);
    
    UPDATE system_stats 
    SET 
        total_detections = total_detections + 1,
        successful_detections = successful_detections + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        failed_detections = failed_detections + CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
    WHERE date = date('now');
END;

-- Insert initial organism data
INSERT OR IGNORE INTO organisms (name, scientific_name, gram_type, shape, pathogenicity, description) VALUES
('E_coli', 'Escherichia coli', 'negative', 'bacilli', 'pathogenic', 'Rod-shaped bacteria commonly found in intestines, some strains can cause food poisoning'),
('Staphylococcus', 'Staphylococcus aureus', 'positive', 'cocci', 'pathogenic', 'Spherical bacteria that can cause skin infections and food poisoning'),
('Streptococcus', 'Streptococcus pyogenes', 'positive', 'cocci', 'pathogenic', 'Chain-forming bacteria that can cause strep throat and skin infections'),
('Salmonella', 'Salmonella enterica', 'negative', 'bacilli', 'pathogenic', 'Rod-shaped bacteria that causes salmonellosis and typhoid fever'),
('Pseudomonas', 'Pseudomonas aeruginosa', 'negative', 'bacilli', 'opportunistic', 'Rod-shaped bacteria that can cause infections in immunocompromised patients'),
('Bacillus', 'Bacillus subtilis', 'positive', 'bacilli', 'non-pathogenic', 'Rod-shaped bacteria commonly found in soil and water'),
('Enterococcus', 'Enterococcus faecalis', 'positive', 'cocci', 'opportunistic', 'Oval-shaped bacteria that can cause urinary tract infections'),
('Vibrio', 'Vibrio cholerae', 'negative', 'vibrio', 'pathogenic', 'Comma-shaped bacteria that causes cholera'),
('Lactobacillus', 'Lactobacillus acidophilus', 'positive', 'bacilli', 'non-pathogenic', 'Rod-shaped beneficial bacteria found in yogurt and gut flora'),
('Clostridium', 'Clostridium difficile', 'positive', 'bacilli', 'pathogenic', 'Spore-forming bacteria that can cause antibiotic-associated diarrhea');

-- Create views for common queries
CREATE VIEW IF NOT EXISTS detection_summary AS
SELECT 
    d.id,
    d.filename,
    d.timestamp,
    d.status,
    COUNT(do.id) as organism_count,
    GROUP_CONCAT(o.name) as organism_names,
    wq.risk_level,
    AVG(do.confidence) as avg_confidence
FROM detection d
LEFT JOIN detection_organisms do ON d.id = do.detection_id
LEFT JOIN organisms o ON do.organism_id = o.id
LEFT JOIN water_quality wq ON d.id = wq.detection_id
GROUP BY d.id, d.filename, d.timestamp, d.status, wq.risk_level;

-- View for organism statistics
CREATE VIEW IF NOT EXISTS organism_statistics AS
SELECT 
    o.name,
    o.scientific_name,
    o.gram_type,
    o.pathogenicity,
    COUNT(do.id) as detection_count,
    AVG(do.confidence) as avg_confidence,
    MAX(do.confidence) as max_confidence,
    MIN(do.confidence) as min_confidence
FROM organisms o
LEFT JOIN detection_organisms do ON o.id = do.organism_id
GROUP BY o.id, o.name, o.scientific_name, o.gram_type, o.pathogenicity;

-- View for daily statistics
CREATE VIEW IF NOT EXISTS daily_statistics AS
SELECT 
    date(timestamp) as detection_date,
    COUNT(*) as total_detections,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_detections,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_detections,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_detections,
    ROUND(AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate
FROM detection
GROUP BY date(timestamp)
ORDER BY detection_date DESC;

-- View for water quality summary
CREATE VIEW IF NOT EXISTS water_quality_summary AS
SELECT 
    risk_level,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM water_quality), 2) as percentage
FROM water_quality
GROUP BY risk_level;

-- Cleanup old sessions trigger
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
AFTER INSERT ON user_sessions
BEGIN
    DELETE FROM user_sessions WHERE expires_at < datetime('now');
END;

-- Performance optimization: Analyze tables
ANALYZE detection;
ANALYZE organisms; 
ANALYZE detection_organisms;
ANALYZE water_quality;
ANALYZE system_stats;

-- Insert sample data for testing (optional)
/*
INSERT OR IGNORE INTO detection (id, filename, original_image_path, status) VALUES
('test-001', 'sample_bacteria_1.jpg', 'uploads/sample_bacteria_1.jpg', 'completed'),
('test-002', 'sample_bacteria_2.jpg', 'uploads/sample_bacteria_2.jpg', 'completed'),
('test-003', 'sample_bacteria_3.jpg', 'uploads/sample_bacteria_3.jpg', 'processing');

INSERT OR IGNORE INTO detection_organisms (detection_id, organism_id, confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2) VALUES
('test-001', 1, 0.85, 100, 150, 200, 250),
('test-001', 2, 0.72, 300, 200, 400, 300),
('test-002', 1, 0.91, 50, 75, 150, 175),
('test-002', 3, 0.68, 250, 180, 350, 280);

INSERT OR IGNORE INTO water_quality (detection_id, risk_level, safe_uses, unsafe_uses, treatment_required) VALUES
('test-001', 'high', '["Industrial cooling"]', '["Drinking water", "Food preparation"]', '["Chlorination", "UV sterilization"]'),
('test-002', 'medium', '["Agricultural irrigation", "Industrial processes"]', '["Direct consumption"]', '["Basic filtration"]');
*/

-- Create stored procedures (using CTEs for SQLite compatibility)

-- Procedure to get detection with full details
-- Usage: Use in application code as a complex query

-- Procedure to calculate organism prevalence
-- Usage: SELECT * FROM organism_prevalence_last_30_days;
CREATE VIEW IF NOT EXISTS organism_prevalence_last_30_days AS
SELECT 
    o.name,
    COUNT(do.id) as detection_count,
    AVG(do.confidence) as avg_confidence,
    date('now', '-30 days') as period_start,
    date('now') as period_end
FROM organisms o
INNER JOIN detection_organisms do ON o.id = do.organism_id
INNER JOIN detection d ON do.detection_id = d.id
WHERE d.timestamp >= datetime('now', '-30 days')
GROUP BY o.id, o.name
ORDER BY detection_count DESC;

-- Create backup table structure for exports
CREATE TABLE IF NOT EXISTS detection_backup AS 
SELECT * FROM detection WHERE 1=0;

CREATE TABLE IF NOT EXISTS organisms_backup AS
SELECT * FROM organisms WHERE 1=0;

-- Final verification queries
-- These can be used to verify the database setup

-- Check table creation
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Check indexes
SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;

-- Check views  
SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;

-- Check triggers
SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name;

-- Verify organism data
SELECT COUNT(*) as organism_count FROM organisms;

-- Database version and metadata
PRAGMA user_version = 1;
INSERT OR REPLACE INTO system_stats (id, date, total_detections, successful_detections, failed_detections) 
VALUES (0, date('now'), 0, 0, 0);

-- Performance settings for production
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;