import json
import uuid
import logging
import os
import urllib.request
from app.schemas import ProcessRequest, SentenceTokens, TokenMeta
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


async def handle_translation(req: ProcessRequest):
    try:
        # Process text
        processed_text = process_text(req.originalText, req.sourceLanguage)

        # Normalize tokens
        for sentence in processed_text.sentences:
            for token in sentence.tokens:
                token.normalised = normalize_token(token.surface, req.sourceLanguage)

        # Build enriched sentences payload
        enriched_sentences = [
            SentenceTokens(
                sentenceId=str(uuid.uuid4()),
                text=sentence.text,
                tokens=[TokenMeta(**t.dict()) for t in sentence.tokens],
            )
            for sentence in processed_text.sentences
        ]

        enriched_payload = {
            "requestId": req.requestId,
            "clientId": req.clientId,
            "language": req.sourceLanguage,
            "sentences": [s.dict() for s in enriched_sentences],
            "interaction": req.interaction.dict() if req.interaction else None,
        }

        _post_nlp_complete(enriched_payload)

        logger.info(
            f"Processed translation request: {req.requestId} for client {req.clientId}"
        )

    except Exception as e:
        logger.exception(
            f"Failed processing translation request: {req.requestId} - {e}"
        )
