# app/main.py
import logging
import os

import uvicorn
from fastapi import FastAPI
from app.schemas import LexiconImportRequest, ProcessRequest, StatementEvent
from app.consumers.lexicon import handle_lexicon_import, handle_statement_event
from app.consumers.translation import handle_translation

from app.database import create_all_tables
from app.utils.kafka.dispatcher import KafkaConsumerDispatcher
import app.consumers


logger = logging.getLogger("uvicorn")

app = FastAPI(title="NLP Service", version="0.1.0")

dispatcher = KafkaConsumerDispatcher("kafka:9092", "nlp-chat-group")
ENABLE_KAFKA_CONSUMERS = os.getenv("NLP_ENABLE_KAFKA_CONSUMERS", "false").lower() in (
    "1",
    "true",
    "yes",
)


@app.on_event("startup")
async def startup_event():
    # create tables if DB present and desired
    if os.getenv("NLP_CREATE_TABLES", "true").lower() in ("1", "true", "yes"):
        try:
            await create_all_tables()
            logger.info("NLP DB tables ensured.")
        except Exception as e:
            logger.exception("Failed to create tables: %s", e)

    if ENABLE_KAFKA_CONSUMERS:
        await dispatcher.start()


@app.on_event("shutdown")
async def shutdown_event():
    if ENABLE_KAFKA_CONSUMERS:
        await dispatcher.stop()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ingest/lexicon-import")
async def ingest_lexicon_import(payload: LexiconImportRequest):
    await handle_lexicon_import(payload)
    return {"ok": True}


@app.post("/ingest/statement-event")
async def ingest_statement_event(payload: StatementEvent):
    await handle_statement_event(payload)
    return {"ok": True}


@app.post("/ingest/translation-complete")
async def ingest_translation_complete(payload: ProcessRequest):
    await handle_translation(payload)
    return {"ok": True}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8300")),
        reload=False,
    )
