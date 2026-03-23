import logging
import os
import json
import urllib.request

from app.utils.kafka.dispatcher import consumes
from app.schemas import (
    LexiconImportRequest,
    StatementChanges,
    StatementEvent,
)
from app.nlp import process_text
from app.utils.normalisers.normaliser import normalize_token

logger = logging.getLogger("uvicorn")
LEXICON_URL = os.getenv("LEXICON_URL", "http://lexicon:3010").rstrip("/")


def _post_nlp_complete(payload: dict):
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{LEXICON_URL}/ingest/nlp-complete",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        response.read()


@consumes("lexicon.import", validation=LexiconImportRequest)
async def handle_lexicon_import(req: LexiconImportRequest):
    text = " ".join(req.words)

    resp = process_text(
        text,
        lang=req.targetLanguage,
    )

    resp.requestId = req.requestId
    resp.clientId = req.clientId
    resp.interaction = req.interaction

    for sentence in resp.sentences or []:
        for token in sentence.tokens:
            token.normalised = normalize_token(token.surface, req.targetLanguage)

    _post_nlp_complete(resp.dict())


@consumes("statement.events", validation=StatementEvent)
async def handle_statement_event(req: StatementEvent):
    # 1️⃣ NLP only cares about text
    resp = process_text(
        req.changes.text,
        lang=req.language,
    )

    # 2️⃣ Propagate identity + metadata
    resp.requestId = req.requestId
    resp.statementId = int(req.statementId) if req.statementId else None
    resp.clientId = req.clientId
    resp.interaction = req.interaction
    if resp.changes is None:
        resp.changes = StatementChanges(text=req.changes.text if req.changes else "")

    # Then safely set optional fields
    if req.changes:
        resp.changes.translation = req.changes.translation
        resp.changes.pronunciation = req.changes.pronunciation
        resp.changes.notes = req.changes.notes

    # 3️⃣ Normalize tokens
    for sentence in resp.sentences or []:
        for token in sentence.tokens:
            token.normalised = normalize_token(token.surface, req.language)

    # 4️⃣ Push NLP result directly to lexicon ingestion
    _post_nlp_complete(resp.dict())
