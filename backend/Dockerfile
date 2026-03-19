FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (separate layer — only rebuilds when requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Run with Gunicorn + eventlet worker (required for Flask-SocketIO)
# -w 1 because eventlet is async — multiple eventlet workers cause issues
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--worker-class", "eventlet", "-w", "1", "run:app"]
