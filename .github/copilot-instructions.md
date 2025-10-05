# Copilot Instructions for Microorganism Detection Kit

## Project Architecture
- **Backend** (`backend/`): Flask API for detection, user auth, statistics, and file upload. Key modules:
  - `api/`: API route definitions (e.g., `detection_routes.py`, `upload_routes.py`)
  - `auth/`: Authentication logic
  - `models/`: ORM models, YOLOv7 weights (`microorganism_yolov7_best.pt`)
  - `services/`: Image processing, YOLO inference, water analysis
  - `app.py`: Flask app entrypoint
  - `migrations/`: Alembic DB migrations
- **Frontend** (`frontend/`): React app (see `src/`), uses Tailwind CSS. Communicates with backend via REST API.
- **ML Model** (`ml_model/`): Notebooks and scripts for training, evaluation, and integration (e.g., `roboflow_integration.py`).
- **Docker** (`docker/`): Compose and Dockerfiles for backend/frontend/nginx.
- **Database**: SQLite (`backend/microorganism_detection.db`), schema in `database/schema.sql`.

## Key Workflows
- **Backend setup:**
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\activate
  pip install -r requirements.txt
  python app.py
  ```
- **Frontend setup:**
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```
- **Database migration:**
  ```powershell
  cd backend
  alembic upgrade head
  ```
- **Run all tests:**
  - Python: `pytest tests/backend/`
  - JS: `npm test` in `frontend/`

## Patterns & Conventions
- **API routes**: Grouped by domain in `backend/api/` and `backend/auth/`. Use Blueprints.
- **Image uploads**: Saved to `uploads/` with UUID filenames. Processed images in `backend/processed/`.
- **Logging**: Logs in `backend/logs/`.
- **Model weights**: Store in `backend/models/weights/`.
- **Environment config**: Use `.env` (not committed) and `backend/config.py`.
- **Email**: Service in `backend/email_service.py` (SMTP config in `config.py`).

## Integration Points
- **YOLOv7**: Custom weights in `backend/models/`, inference via `services/yolo_detection.py`.
- **Colab**: Training scripts in `ml_model/`, integration in `services/colab_integration.py`.
- **Docker**: Use `docker-compose.yml` for full stack; see `Dockerfile.backend` and `Dockerfile.frontend` for details.

## Tips for AI Agents
- Always update both backend and frontend for API changes.
- Use the provided scripts in `scripts/` for deployment and DB backup.
- Follow the file structure for new features (e.g., new API: add to `api/`, new service: add to `services/`).
- Check `docs/` for API and technical documentation.

---
If any section is unclear or missing, please request clarification or examples from the maintainers.
