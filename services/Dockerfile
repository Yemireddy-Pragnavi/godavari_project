FROM python:3.12-slim
WORKDIR /app
COPY services/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services /app/services
CMD ["uvicorn","services.api.main:app","--host","0.0.0.0","--port","8000"]
