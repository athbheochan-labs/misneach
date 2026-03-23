import uuid
import json
import logging
import os
import urllib.request

from app.schemas import ChatDeltaPayload, SentenceTokens, TokenMeta
from app.nlp import process_text

from datetime import datetime
from app.utils.kafka.dispatcher import consumes
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


@consumes("chat.delta", validation=ChatDeltaPayload)
async def handle_chat_delta(req: ChatDeltaPayload):
    logger.info(req)

    try:
        # Convert ISO timestamp to epoch millis if needed
        interaction = req.interaction
        if interaction and isinstance(interaction.timestamp, str):
            dt = datetime.fromisoformat(interaction.timestamp.replace("Z", "+00:00"))
            interaction.timestamp = int(dt.timestamp() * 1000)

        # Process the text — returns List[Tuple[str, List[TokenMeta]]]
        processed_text = process_text(req.text, req.language)

        enriched_sentences = []

        # Normalize tokens
        for s in processed_text.sentences:
            logger.info(s)
            # If it's a tuple (text, tokens), unpack it
            if isinstance(s, tuple):
                text, tokens = s
            else:  # Otherwise assume it's a SentenceTokens
                text = s.text
                tokens = s.tokens

            # Normalize tokens
            for token in tokens:
                token.normalised = normalize_token(token.surface, req.language)

            enriched_sentences.append(
                SentenceTokens(
                    sentenceId=str(uuid.uuid4()),
                    text=text,
                    tokens=[TokenMeta(**t.dict()) for t in tokens],
                )
            )

        enriched_payload = {
            "requestId": str(req.chatId),
            "clientId": req.clientId,
            "language": req.language,
            "sentences": [s.dict() for s in enriched_sentences],
            "interaction": interaction.dict() if interaction else None,
        }

        # Push directly to lexicon ingestion
        _post_nlp_complete(enriched_payload)

        logger.info(
            f"Processed chat.delta for chatId={req.chatId}, clientId={req.clientId}"
        )

    except Exception as e:
        logger.exception(f"Failed processing chat delta for chatId={req.chatId}: {e}")
